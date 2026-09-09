"""Tests for ai_ml.scoring.risk."""

from __future__ import annotations

import pytest

from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractedField,
    FieldProvenance,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.scoring.risk import compute_risk_factors, compute_risk_level, RISK_THRESHOLDS


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


class TestComputeRiskLevel:
    def test_low_risk_high_confidence_no_issues(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        assert compute_risk_level(0.9, result) == "LOW"

    def test_medium_risk_medium_confidence(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        assert compute_risk_level(0.6, result) == "MEDIUM"

    def test_high_risk_low_confidence(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        assert compute_risk_level(0.3, result) == "HIGH"

    def test_high_risk_with_errors(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        warnings = ["[validation] Missing required field 'khata_number': error"]
        result = _make_result(record=record, warnings=warnings)
        assert compute_risk_level(0.9, result) == "HIGH"

    def test_medium_risk_with_warnings_no_errors(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        warnings = ["[validation] OCR confidence is low (0.30)"]
        result = _make_result(record=record, warnings=warnings)
        assert compute_risk_level(0.9, result) == "MEDIUM"

    def test_medium_risk_with_conflicts_no_errors(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        conflicts = [{"field": "khata_number", "values": [{"value": "1"}, {"value": "2"}]}]
        result = _make_result(record=record, conflicts=conflicts)
        assert compute_risk_level(0.9, result) == "MEDIUM"

    def test_low_risk_requires_no_conflicts(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        conflicts = [{"field": "khata_number", "values": [{"value": "1"}, {"value": "2"}]}]
        result = _make_result(record=record, conflicts=conflicts)
        assert compute_risk_level(0.9, result) == "MEDIUM"


class TestComputeRiskFactors:
    def test_returns_list_of_dicts(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        factors = compute_risk_factors(result, 0.9)
        assert isinstance(factors, list)
        assert all(isinstance(f, dict) for f in factors)

    def test_includes_confidence_factor(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        factors = compute_risk_factors(result, 0.9)
        names = [f["name"] for f in factors]
        assert "high_confidence" in names

    def test_includes_error_factor_when_present(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=0.9)),
            landholders=[],
            parcels=[],
        )
        warnings = ["[validation] Missing required field 'khata_number': error"]
        result = _make_result(record=record, warnings=warnings)
        factors = compute_risk_factors(result, 0.9)
        names = [f["name"] for f in factors]
        assert "validation_errors" in names

    def test_thresholds_are_documented(self) -> None:
        assert "low_confidence" in RISK_THRESHOLDS
        assert "medium_confidence" in RISK_THRESHOLDS
        assert 0.0 < RISK_THRESHOLDS["medium_confidence"] < RISK_THRESHOLDS["low_confidence"] <= 1.0
