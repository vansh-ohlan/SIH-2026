"""Tests for ai_ml.extraction schema and strategy."""

from __future__ import annotations

import pytest

from ai_ml.ocr.schema import (
    OCRBlock,
    OCRLine,
    OCRPage,
    OCRResult,
    OCRWord,
)
from ai_ml.extraction.exceptions import (
    ExtractionConfigurationError,
    ExtractionFailureError,
    ExtractionError,
    InvalidOCRResultError,
    UnsupportedDocumentError,
)
from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractionResult,
    ExtractedField,
    FieldProvenance,
    Landholder,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.extraction.strategy import ExtractionStrategy


class FakeStrategy(ExtractionStrategy):
    """Fake extraction strategy for testing."""

    def extract(self, ocr_result, config=None):
        return ExtractionResult(
            record=RoRRecord(
                metadata=RoRMetadata(
                    state=ExtractedField(value="Rajasthan"),
                    district=ExtractedField(value="Jaipur"),
                ),
                landholders=[Landholder(name=ExtractedField(value="Ramesh Kumar"))],
                parcels=[
                    Parcel(
                        khasra_number=ExtractedField(value="142/1"),
                        area_raw=ExtractedField(value="2-5-10"),
                    )
                ],
            ),
            status="success",
        )


class TestFieldProvenance:
    def test_default_values(self) -> None:
        prov = FieldProvenance()
        assert prov.source_ocr_text is None
        assert prov.ocr_confidence is None
        assert prov.extraction_confidence is None
        assert prov.extraction_method == ExtractionMethod.UNKNOWN

    def test_with_values(self) -> None:
        prov = FieldProvenance(
            source_ocr_text="नमस्ते",
            source_bbox=(0, 0, 10, 20),
            page_number=1,
            ocr_confidence=0.95,
            extraction_confidence=0.8,
            extraction_method=ExtractionMethod.REGEX,
        )
        assert prov.source_ocr_text == "नमस्ते"
        assert prov.ocr_confidence == 0.95
        assert prov.extraction_confidence == 0.8
        assert prov.extraction_method == ExtractionMethod.REGEX

    def test_serialization(self) -> None:
        prov = FieldProvenance(
            source_ocr_text="test",
            ocr_confidence=0.9,
            extraction_method=ExtractionMethod.LABEL,
        )
        data = prov.model_dump()
        assert data["source_ocr_text"] == "test"
        assert data["extraction_method"] == "label"


class TestExtractedField:
    def test_value_only(self) -> None:
        field = ExtractedField(value="Jaipur")
        assert field.value == "Jaipur"
        assert field.provenance is None

    def test_none_value(self) -> None:
        field = ExtractedField(value=None)
        assert field.value is None

    def test_with_provenance(self) -> None:
        prov = FieldProvenance(ocr_confidence=0.9, extraction_confidence=0.8)
        field = ExtractedField(value="2.5", provenance=prov)
        assert field.value == "2.5"
        assert field.provenance.ocr_confidence == 0.9
        assert field.provenance.extraction_confidence == 0.8


class TestRoRMetadata:
    def test_default_values(self) -> None:
        meta = RoRMetadata()
        assert meta.state is None
        assert meta.district is None
        assert meta.state_specific_fields == {}

    def test_with_values(self) -> None:
        meta = RoRMetadata(
            state=ExtractedField(value="Rajasthan"),
            district=ExtractedField(value="Jaipur"),
            village=ExtractedField(value="Amer"),
            khata_number=ExtractedField(value="123"),
        )
        assert meta.state.value == "Rajasthan"
        assert meta.district.value == "Jaipur"
        assert meta.village.value == "Amer"
        assert meta.khata_number.value == "123"


class TestLandholder:
    def test_single_owner(self) -> None:
        owner = Landholder(name=ExtractedField(value="Ramesh Kumar"))
        assert owner.name.value == "Ramesh Kumar"
        assert owner.father_or_husband_name is None

    def test_multiple_fields(self) -> None:
        owner = Landholder(
            name=ExtractedField(value="Ramesh Kumar"),
            father_or_husband_name=ExtractedField(value="Mohan Lal"),
            address=ExtractedField(value="Amer, Jaipur"),
        )
        assert owner.name.value == "Ramesh Kumar"
        assert owner.father_or_husband_name.value == "Mohan Lal"
        assert owner.address.value == "Amer, Jaipur"


class TestParcel:
    def test_khasra_and_area(self) -> None:
        parcel = Parcel(
            khasra_number=ExtractedField(value="142/1"),
            area_raw=ExtractedField(value="2-5-10"),
            area_unit=ExtractedField(value="Bigha"),
        )
        assert parcel.khasra_number.value == "142/1"
        assert parcel.area_raw.value == "2-5-10"
        assert parcel.area_unit.value == "Bigha"

    def test_area_raw_preserved(self) -> None:
        raw = "2-5-10"
        parcel = Parcel(area_raw=ExtractedField(value=raw))
        assert parcel.area_raw.value == raw


class TestRoRRecord:
    def test_empty_record(self) -> None:
        record = RoRRecord()
        assert record.metadata.state is None
        assert record.landholders == []
        assert record.parcels == []
        assert record.unrecognized_text == []
        assert record.warnings == []

    def test_with_data(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(
                state=ExtractedField(value="Rajasthan"),
                district=ExtractedField(value="Jaipur"),
            ),
            landholders=[Landholder(name=ExtractedField(value="Ramesh Kumar"))],
            parcels=[
                Parcel(
                    khasra_number=ExtractedField(value="142/1"),
                    area_raw=ExtractedField(value="2-5-10"),
                )
            ],
            document_remarks=ExtractedField(value="Sample remarks"),
        )
        assert record.metadata.state.value == "Rajasthan"
        assert len(record.landholders) == 1
        assert len(record.parcels) == 1
        assert record.parcels[0].khasra_number.value == "142/1"
        assert record.document_remarks.value == "Sample remarks"

    def test_multiple_parcels(self) -> None:
        record = RoRRecord(
            parcels=[
                Parcel(khasra_number=ExtractedField(value="142/1")),
                Parcel(khasra_number=ExtractedField(value="143/1")),
            ]
        )
        assert len(record.parcels) == 2
        assert record.parcels[0].khasra_number.value == "142/1"
        assert record.parcels[1].khasra_number.value == "143/1"

    def test_multiple_landholders(self) -> None:
        record = RoRRecord(
            landholders=[
                Landholder(name=ExtractedField(value="Ramesh Kumar")),
                Landholder(name=ExtractedField(value="Suresh Kumar")),
            ]
        )
        assert len(record.landholders) == 2
        assert record.landholders[0].name.value == "Ramesh Kumar"
        assert record.landholders[1].name.value == "Suresh Kumar"

    def test_hindi_text_preserved(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(
                village=ExtractedField(value="अमेर"),
                tehsil=ExtractedField(value="जयपुर"),
            )
        )
        assert record.metadata.village.value == "अमेर"
        assert record.metadata.tehsil.value == "जयपुर"


class TestExtractionResult:
    def test_success_result(self) -> None:
        result = ExtractionResult(
            record=RoRRecord(
                metadata=RoRMetadata(district=ExtractedField(value="Jaipur")),
            ),
            status="success",
        )
        assert result.status == "success"
        assert result.record is not None
        assert result.record.metadata.district.value == "Jaipur"

    def test_partial_result(self) -> None:
        result = ExtractionResult(
            record=RoRRecord(
                metadata=RoRMetadata(village=ExtractedField(value="Amer")),
            ),
            status="partial",
            warnings=["khasra_number not found"],
        )
        assert result.status == "partial"
        assert len(result.warnings) == 1
        assert "khasra_number" in result.warnings[0]

    def test_failure_result(self) -> None:
        result = ExtractionResult(
            record=None,
            status="failure",
            warnings=["unsupported document structure"],
        )
        assert result.status == "failure"
        assert result.record is None


class TestExtractionStrategy:
    def test_fake_strategy_returns_result(self) -> None:
        strategy = FakeStrategy()
        ocr_result = OCRResult(pages=[])
        result = strategy.extract(ocr_result)
        assert isinstance(result, ExtractionResult)
        assert result.status == "success"
        assert result.record is not None

    def test_fake_strategy_populates_fields(self) -> None:
        strategy = FakeStrategy()
        ocr_result = OCRResult(pages=[])
        result = strategy.extract(ocr_result)
        assert result.record.metadata.state.value == "Rajasthan"
        assert result.record.metadata.district.value == "Jaipur"
        assert result.record.landholders[0].name.value == "Ramesh Kumar"
        assert result.record.parcels[0].khasra_number.value == "142/1"
        assert result.record.parcels[0].area_raw.value == "2-5-10"


class TestExceptions:
    def test_base_exception(self) -> None:
        with pytest.raises(ExtractionError):
            raise ExtractionError("base")

    def test_invalid_ocr_error(self) -> None:
        with pytest.raises(InvalidOCRResultError):
            raise InvalidOCRResultError("bad ocr")

    def test_unsupported_document_error(self) -> None:
        with pytest.raises(UnsupportedDocumentError):
            raise UnsupportedDocumentError("unsupported")

    def test_extraction_failure_error(self) -> None:
        with pytest.raises(ExtractionFailureError):
            raise ExtractionFailureError("failed")

    def test_configuration_error(self) -> None:
        with pytest.raises(ExtractionConfigurationError):
            raise ExtractionConfigurationError("bad config")

    def test_exception_hierarchy(self) -> None:
        with pytest.raises(ExtractionError):
            raise InvalidOCRResultError("subclass")
