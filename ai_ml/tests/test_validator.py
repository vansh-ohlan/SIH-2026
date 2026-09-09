"""Tests for ai_ml.extraction.validator."""

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
from ai_ml.extraction.validator import ExtractionValidator, ValidationIssue, ValidationResult


def _make_extracted_field(value, confidence=0.9, ocr_confidence=0.9):
    return ExtractedField(
        value=value,
        provenance=FieldProvenance(
            source_ocr_text=str(value),
            source_bbox=(0, 0, 10, 20),
            page_number=1,
            ocr_confidence=ocr_confidence,
            extraction_confidence=confidence,
            extraction_method=ExtractionMethod.REGEX,
            extractor_version="test",
        ),
    )


def _make_record(**metadata_overrides):
    metadata = RoRMetadata(**metadata_overrides)
    record = RoRRecord(metadata=metadata, landholders=[], parcels=[])
    return record


class TestValidationResult:
    def test_add_issue(self) -> None:
        v = ValidationResult(is_valid=True, summary="ok")
        v.add_issue(field="f1", code="c1", severity="error", message="m1", value="v1")
        assert len(v.issues) == 1
        assert v.issues[0].field == "f1"
        assert v.issues[0].code == "c1"
        assert v.issues[0].severity == "error"
        assert v.issues[0].message == "m1"
        assert v.issues[0].value == "v1"


class TestExtractionValidator:
    def test_valid_record(self) -> None:
        record = _make_record(
            khata_number=_make_extracted_field("123"),
            khewat_number=_make_extracted_field("45"),
        )
        record.parcels.append(Parcel(khasra_number=_make_extracted_field("142/1")))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is True
        assert result.summary == "Validation passed"

    def test_missing_required_khata_number(self) -> None:
        record = _make_record()
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is False
        codes = [i.code for i in result.issues]
        assert "required_khata_number" in codes

    def test_missing_required_khasra_number(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("1"))
        record.parcels.append(Parcel())
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is False
        codes = [i.code for i in result.issues]
        assert "missing_khasra_number" in codes

    def test_invalid_khata_number_empty(self) -> None:
        record = _make_record(khata_number=_make_extracted_field(""))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is False
        codes = [i.code for i in result.issues]
        assert "invalid_khata_value" in codes

    def test_invalid_khasra_number_separators_only(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("1"))
        record.parcels.append(Parcel(khasra_number=_make_extracted_field("///")))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is False
        codes = [i.code for i in result.issues]
        assert "invalid_khasra_value" in codes

    def test_valid_khata_number_with_slashes(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("123/1"))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is True

    def test_low_ocr_confidence(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("123", ocr_confidence=0.3))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        codes = [i.code for i in result.issues]
        assert "low_ocr_confidence" in codes

    def test_low_extraction_confidence(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("123", confidence=0.3))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        codes = [i.code for i in result.issues]
        assert "low_extraction_confidence" in codes

    def test_malformed_area(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("1"))
        record.parcels.append(Parcel(area_raw=_make_extracted_field("abc")))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        codes = [i.code for i in result.issues]
        assert "malformed_area" in codes

    def test_duplicate_extracted_values(self) -> None:
        record = _make_record(
            khata_number=_make_extracted_field("123"),
            khewat_number=_make_extracted_field("123"),
        )
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        codes = [i.code for i in result.issues]
        assert "duplicate_extracted_values" in codes

    def test_none_record(self) -> None:
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": None, "status": "failure", "warnings": []})()
        )
        assert result.is_valid is False
        codes = [i.code for i in result.issues]
        assert "missing_record" in codes

    def test_valid_revenue(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("1"))
        record.parcels.append(Parcel(khasra_number=_make_extracted_field("142/1"), revenue=_make_extracted_field("500 INR")))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is True

    def test_missing_khata_number_but_present_khasra(self) -> None:
        record = _make_record()
        record.parcels.append(Parcel(khasra_number=_make_extracted_field("142/1")))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is False
        codes = [i.code for i in result.issues]
        assert "required_khata_number" in codes

    def test_multiple_parcels(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("1"))
        record.parcels.append(
            Parcel(khasra_number=_make_extracted_field("142/1"), area_raw=_make_extracted_field("2-5-10"))
        )
        record.parcels.append(
            Parcel(khasra_number=_make_extracted_field("143/1"), area_raw=_make_extracted_field("1-0-5"))
        )
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is True

    def test_warnings_do_not_make_record_invalid(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("123", ocr_confidence=0.3))
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is True
        codes = [i.code for i in result.issues]
        assert "low_ocr_confidence" in codes

    def test_warnings_plus_errors_make_record_invalid(self) -> None:
        record = _make_record()
        result = ExtractionValidator().validate(
            type("ExtractionResult", (), {"record": record, "status": "success", "warnings": []})()
        )
        assert result.is_valid is False
        codes = [i.code for i in result.issues]
        assert "required_khata_number" in codes

    def test_conflicting_extracted_values_reported(self) -> None:
        record = _make_record(khata_number=_make_extracted_field("123"))
        result = ExtractionValidator().validate(
            type(
                "ExtractionResult",
                (),
                {
                    "record": record,
                    "status": "success",
                    "warnings": [],
                    "conflicts": [
                        {
                            "field": "khata_number",
                            "values": [
                                {"value": "123", "method": "label", "confidence": 0.9},
                                {"value": "456", "method": "regex", "confidence": 0.8},
                            ],
                        }
                    ],
                },
            )()
        )
        codes = [i.code for i in result.issues]
        assert "conflicting_extracted_values" in codes
        conflict_issue = next(i for i in result.issues if i.code == "conflicting_extracted_values")
        assert conflict_issue.field == "khata_number"
