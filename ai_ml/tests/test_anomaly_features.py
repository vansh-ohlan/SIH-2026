"""Tests for ai_ml.anomaly.features."""

from __future__ import annotations

import numpy as np
import pytest

from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractedField,
    FieldProvenance,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.anomaly.features import FEATURE_NAMES, extract_features, get_feature_names


def _make_extracted_field(value, extraction_confidence=0.9, ocr_confidence=0.9):
    return ExtractedField(
        value=value,
        provenance=FieldProvenance(
            source_ocr_text=str(value),
            source_bbox=(0, 0, 10, 20),
            page_number=1,
            ocr_confidence=ocr_confidence,
            extraction_confidence=extraction_confidence,
            extraction_method=ExtractionMethod.REGEX,
            extractor_version="test",
        ),
    )


def _make_result(record=None, warnings=None, conflicts=None):
    from ai_ml.extraction.schema import ExtractionResult
    warnings = warnings or []
    error_count = sum(
        1 for w in warnings
        if "[validation]" in w and any(kw in w.lower() for kw in ["error", "missing", "invalid", "required"])
    )
    warning_count = sum(
        1 for w in warnings
        if "[validation]" in w and "error" not in w.lower()
    )
    return ExtractionResult(
        record=record,
        status="success",
        warnings=warnings,
        extractor_version="test",
        conflicts=conflicts or [],
        validation_error_count=error_count,
        validation_warning_count=warning_count,
    )


class TestExtractFeatures:
    def test_feature_names_stable(self) -> None:
        assert get_feature_names() == list(FEATURE_NAMES)
        assert len(FEATURE_NAMES) == 13

    def test_empty_record_produces_zeros(self) -> None:
        record = RoRRecord(metadata=RoRMetadata(), landholders=[], parcels=[])
        result = _make_result(record=record)
        features = extract_features(result)
        assert features.shape == (len(FEATURE_NAMES),)
        # An empty record is missing the required khata_number
        assert features[3] == 1.0  # num_missing_required_fields
        assert features[0] == 0.0  # num_parcels
        assert features[1] == 0.0  # num_landholders

    def test_parcel_counts(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(),
            landholders=[],
            parcels=[
                Parcel(khasra_number=_make_extracted_field("1")),
                Parcel(khasra_number=_make_extracted_field("2")),
            ],
        )
        result = _make_result(record=record)
        features = extract_features(result)
        assert features[0] == 2.0  # num_parcels
        assert features[10] == 2.0  # num_parcels_with_khasra

    def test_landholder_count(self) -> None:
        from ai_ml.extraction.schema import Landholder
        record = RoRRecord(
            metadata=RoRMetadata(),
            landholders=[Landholder(name=_make_extracted_field("A")), Landholder(name=_make_extracted_field("B"))],
            parcels=[],
        )
        result = _make_result(record=record)
        features = extract_features(result)
        assert features[1] == 2.0  # num_landholders

    def test_area_and_revenue_flags(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(),
            landholders=[],
            parcels=[Parcel(area_raw=_make_extracted_field("2-5-10"), revenue=_make_extracted_field("500"))],
        )
        result = _make_result(record=record)
        features = extract_features(result)
        assert features[8] == 1.0  # has_area
        assert features[9] == 1.0  # has_revenue

    def test_confidence_statistics(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.8, ocr_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        features = extract_features(result)
        assert features[4] == 0.9  # avg_ocr_confidence
        assert features[5] == 0.8  # avg_extraction_confidence

    def test_validation_issues_counted(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1")),
            landholders=[],
            parcels=[],
        )
        warnings = [
            "[validation] Missing required field 'khata_number': error",
            "[validation] OCR confidence is low (0.30)",
        ]
        result = _make_result(record=record, warnings=warnings)
        features = extract_features(result)
        assert features[6] == 2.0  # num_validation_issues
        assert features[11] == 1.0  # num_validation_errors
        assert features[12] == 1.0  # num_validation_warnings

    def test_conflicts_counted(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1")),
            landholders=[],
            parcels=[],
        )
        conflicts = [{"field": "khata_number", "values": [{"value": "1"}, {"value": "2"}]}]
        result = _make_result(record=record, conflicts=conflicts)
        features = extract_features(result)
        assert features[7] == 1.0  # num_conflicts

    def test_no_personal_text_in_features(self) -> None:
        from ai_ml.extraction.schema import Landholder
        record = RoRRecord(
            metadata=RoRMetadata(),
            landholders=[Landholder(name=_make_extracted_field("Raja"), address=_make_extracted_field("123 Main St"))],
            parcels=[],
        )
        result = _make_result(record=record)
        features = extract_features(result)
        # names and addresses should not appear in feature vector
        assert features[2] == 0.0  # num_core_extracted_fields: personal fields are not counted

    def test_missing_values_handled_safely(self) -> None:
        record = RoRRecord(metadata=RoRMetadata(), landholders=[], parcels=[])
        result = _make_result(record=record)
        features = extract_features(result)
        assert not np.any(np.isnan(features))
        assert not np.any(np.isinf(features))
