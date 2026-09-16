"""Tests for ai_ml.scoring.confidence."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractedField,
    FieldProvenance,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.scoring.confidence import (
    compute_confidence_factors,
    compute_overall_confidence,
)


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


class TestComputeOverallConfidence:
    def test_no_fields_returns_base_confidence(self) -> None:
        record = RoRRecord(metadata=RoRMetadata(), landholders=[], parcels=[])
        result = _make_result(record=record)
        assert compute_overall_confidence(result) == 0.5

    def test_single_field_returns_its_confidence(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("123", extraction_confidence=0.8)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        assert compute_overall_confidence(result) == pytest.approx(0.85)

    def test_multiple_fields_returns_mean(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(
                khata_number=_make_extracted_field("1", extraction_confidence=0.8),
                khewat_number=_make_extracted_field("2", extraction_confidence=0.6),
            ),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        assert compute_overall_confidence(result) == pytest.approx(0.75)

    def test_error_penalty_reduces_confidence(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=1.0)),
            landholders=[],
            parcels=[],
        )
        warnings = ["[validation] Missing required field 'khata_number': error"]
        result = _make_result(record=record, warnings=warnings)
        score = compute_overall_confidence(result)
        assert score < 1.0

    def test_warning_penalty_reduces_confidence(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=1.0)),
            landholders=[],
            parcels=[],
        )
        warnings = ["[validation] OCR confidence is low (0.30)"]
        result = _make_result(record=record, warnings=warnings)
        score = compute_overall_confidence(result)
        assert score == pytest.approx(0.95)

    def test_conflict_penalty_reduces_confidence(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(year=_make_extracted_field("2023", extraction_confidence=1.0)),
            landholders=[],
            parcels=[],
        )
        conflicts = [{"field": "year", "values": [{"value": "2023"}, {"value": "2024"}]}]
        result = _make_result(record=record, conflicts=conflicts)
        score = compute_overall_confidence(result)
        assert score < 1.0

    def test_agreement_bonus_applied_when_no_conflicts(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(year=_make_extracted_field("2023", extraction_confidence=0.8)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record, conflicts=[])
        score = compute_overall_confidence(result)
        assert score == pytest.approx(0.85)

    def test_agreement_bonus_not_applied_with_conflicts(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(year=_make_extracted_field("2023", extraction_confidence=0.8)),
            landholders=[],
            parcels=[],
        )
        conflicts = [{"field": "year", "values": [{"value": "2023"}, {"value": "2024"}]}]
        result = _make_result(record=record, conflicts=conflicts)
        score = compute_overall_confidence(result)
        assert score == pytest.approx(0.75)

    def test_clamped_to_one(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=1.0)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        assert compute_overall_confidence(result) <= 1.0

    def test_clamped_to_zero(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.0)),
            landholders=[],
            parcels=[],
        )
        many_errors = ["[validation] error"] * 20
        result = _make_result(record=record, warnings=many_errors)
        assert compute_overall_confidence(result) >= 0.0


class TestComputeConfidenceFactors:
    def test_returns_list_of_dicts(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        factors = compute_confidence_factors(result)
        assert isinstance(factors, list)
        assert all(isinstance(f, dict) for f in factors)

    def test_includes_base_confidence(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        factors = compute_confidence_factors(result)
        names = [f["name"] for f in factors]
        assert "base_confidence" in names

    def test_includes_error_factor_when_errors_present(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        warnings = ["[validation] Missing required field 'khata_number': error"]
        result = _make_result(record=record, warnings=warnings)
        factors = compute_confidence_factors(result)
        names = [f["name"] for f in factors]
        assert "validation_errors" in names

    def test_includes_agreement_bonus_when_no_conflicts(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record, conflicts=[])
        factors = compute_confidence_factors(result)
        names = [f["name"] for f in factors]
        assert "extractor_agreement" in names
