"""Tests for ai_ml.scoring.explainability."""

from __future__ import annotations

import json

import pytest

from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractedField,
    FieldProvenance,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.scoring.explainability import build_extraction_evidence


def _make_extracted_field(value, extraction_confidence=0.9, ocr_confidence=0.9, page_number=1, bbox=(0, 0, 10, 20)):
    return ExtractedField(
        value=value,
        provenance=FieldProvenance(
            source_ocr_text=str(value),
            source_bbox=bbox,
            page_number=page_number,
            ocr_confidence=ocr_confidence,
            extraction_confidence=extraction_confidence,
            extraction_method=ExtractionMethod.REGEX,
            extractor_version="test",
            notes="test note",
        ),
    )


def _make_result(record=None, warnings=None, conflicts=None):
    from ai_ml.extraction.schema import ExtractionResult
    return ExtractionResult(
        record=record,
        status="success",
        warnings=warnings or [],
        extractor_version="test",
        conflicts=conflicts or [],
        validation_error_count=0,
        validation_warning_count=0,
    )


class TestBuildExtractionEvidence:
    def test_none_record_returns_minimal_evidence(self) -> None:
        result = _make_result(record=None)
        evidence = build_extraction_evidence(result)
        assert evidence["record_present"] is False
        assert evidence["fields"] == {}
        assert evidence["parcels"] == []
        assert evidence["landholders"] == []

    def test_field_evidence_populated(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("123")),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        evidence = build_extraction_evidence(result)
        field_evidence = evidence["fields"]["khata_number"]
        assert field_evidence["value"] == "123"
        assert field_evidence["extraction_confidence"] == 0.9
        assert field_evidence["ocr_confidence"] == 0.9
        assert field_evidence["extraction_method"] == ExtractionMethod.REGEX
        assert field_evidence["source_ocr_text"] == "123"
        assert field_evidence["page_number"] == 1
        assert field_evidence["source_bbox"] == [0, 0, 10, 20]
        assert field_evidence["notes"] == "test note"

    def test_none_field_evidence_has_none_values(self) -> None:
        record = RoRRecord(metadata=RoRMetadata(), landholders=[], parcels=[])
        result = _make_result(record=record)
        evidence = build_extraction_evidence(result)
        field_evidence = evidence["fields"]["khata_number"]
        assert field_evidence["value"] is None
        assert field_evidence["extraction_confidence"] is None

    def test_conflicts_evidence_preserved(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(year=_make_extracted_field("2023")),
            landholders=[],
            parcels=[],
        )
        conflicts = [{"field": "year", "values": [{"value": "2023"}, {"value": "2024"}]}]
        result = _make_result(record=record, conflicts=conflicts)
        evidence = build_extraction_evidence(result)
        assert len(evidence["conflicts"]) == 1
        assert evidence["conflicts"][0]["field"] == "year"

    def test_evidence_is_json_serializable(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("123")),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        evidence = build_extraction_evidence(result)
        json_str = json.dumps(evidence)
        assert isinstance(json_str, str)
        parsed = json.loads(json_str)
        assert parsed["fields"]["khata_number"]["value"] == "123"

    def test_multiple_pages_preserved(self) -> None:
        field_page2 = _make_extracted_field("456", page_number=2, bbox=(10, 10, 20, 20))
        record = RoRRecord(
            metadata=RoRMetadata(
                khata_number=_make_extracted_field("123", page_number=1),
                khewat_number=field_page2,
            ),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        evidence = build_extraction_evidence(result)
        assert evidence["fields"]["khata_number"]["page_number"] == 1
        assert evidence["fields"]["khewat_number"]["page_number"] == 2

    def test_missing_provenance_fields_are_none(self) -> None:
        field_no_prov = ExtractedField(value="123")
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=field_no_prov),
            landholders=[],
            parcels=[],
        )
        result = _make_result(record=record)
        evidence = build_extraction_evidence(result)
        field_evidence = evidence["fields"]["khata_number"]
        assert field_evidence["extraction_confidence"] is None
        assert field_evidence["ocr_confidence"] is None
        assert field_evidence["source_ocr_text"] is None
        assert field_evidence["source_bbox"] is None

    def test_parcel_evidence_populated(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(),
            landholders=[],
            parcels=[Parcel(khasra_number=_make_extracted_field("142/1"))],
        )
        result = _make_result(record=record)
        evidence = build_extraction_evidence(result)
        assert len(evidence["parcels"]) == 1
        assert evidence["parcels"][0]["khasra_number"]["value"] == "142/1"

    def test_landholder_evidence_populated(self) -> None:
        from ai_ml.extraction.schema import Landholder
        record = RoRRecord(
            metadata=RoRMetadata(),
            landholders=[Landholder(name=_make_extracted_field("Raja"))],
            parcels=[],
        )
        result = _make_result(record=record)
        evidence = build_extraction_evidence(result)
        assert len(evidence["landholders"]) == 1
        assert evidence["landholders"][0]["name"]["value"] == "Raja"
