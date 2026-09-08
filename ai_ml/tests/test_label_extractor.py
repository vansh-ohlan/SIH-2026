"""Tests for ai_ml.extraction.label_extractor."""

from __future__ import annotations

import pytest

from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
from ai_ml.extraction.exceptions import InvalidOCRResultError
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
from ai_ml.extraction.label_extractor import LabelExtractor


def _make_ocr_result(lines_per_page: dict[int, list[tuple[str, float, tuple[int, int, int, int]]]]) -> OCRResult:
    """Build an OCRResult from a structure: {page_number: [(text, confidence, bbox), ...]}."""
    pages = []
    for page_number in sorted(lines_per_page.keys()):
        blocks = []
        block_lines = []
        for idx, (text, confidence, bbox) in enumerate(lines_per_page[page_number], start=1):
            words = [OCRWord(text=text, confidence=confidence, bbox=bbox, language="hi")]
            block_lines.append(OCRLine(line_id=f"line-{idx}", words=words, bbox=bbox))
        blocks.append(OCRBlock(block_id="block-1", lines=block_lines, bbox=(0, 0, 100, 100)))
        pages.append(OCRPage(page_number=page_number, blocks=blocks, width=100, height=100))
    return OCRResult(pages=pages, engine_name="test", language="hi")


class TestLabelExtractor:
    def test_extract_english_labels(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("District Jaipur", 0.9, (0, 0, 10, 20)),
                ("Tehsil Jaipur", 0.9, (0, 0, 10, 20)),
                ("Village Amer", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
                ("Area 2-5-10", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.status == "success"
        assert result.record.metadata.district.value == "Jaipur"
        assert result.record.metadata.tehsil.value == "Jaipur"
        assert result.record.metadata.village.value == "Amer"
        assert result.record.parcels[0].khasra_number.value == "142/1"
        assert result.record.parcels[0].area_raw.value == "2-5-10"

    def test_extract_hindi_labels(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("जिला जयपुर", 0.9, (0, 0, 10, 20)),
                ("तहसील जयपुर", 0.9, (0, 0, 10, 20)),
                ("ग्राम अमेर", 0.9, (0, 0, 10, 20)),
                ("खसरा संख्या १४२/१", 0.9, (0, 0, 10, 20)),
                ("रकबा २-५-१०", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.status == "success"
        assert result.record.metadata.district.value == "जयपुर"
        assert result.record.metadata.tehsil.value == "जयपुर"
        assert result.record.metadata.village.value == "अमेर"
        assert result.record.parcels[0].khasra_number.value == "१४२/१"
        assert result.record.parcels[0].area_raw.value == "२-५-१०"

    def test_extract_mixed_hindi_english(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("District जिला Jaipur", 0.9, (0, 0, 10, 20)),
                ("Village ग्राम Amer", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.status == "success"
        assert result.record.metadata.district.value == "जिला Jaipur"
        assert result.record.metadata.village.value == "ग्राम Amer"

    def test_same_line_label_value(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.record.parcels[0].khasra_number.value == "142/1"
        assert result.record.parcels[0].khasra_number.provenance.extraction_confidence == 0.9

    def test_next_line_value(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Area", 0.9, (0, 0, 10, 20)),
                ("2-5-10 Bigha", 0.8, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.record.parcels[0].area_raw.value == "2-5-10 Bigha"
        assert result.record.parcels[0].area_raw.provenance.extraction_confidence == 0.6

    def test_multiple_pages(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("District Jaipur", 0.9, (0, 0, 10, 20)),
            ],
            2: [
                ("Village Amer", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.district.value == "Jaipur"
        assert result.record.metadata.village.value == "Amer"
        assert result.record.metadata.village.provenance.page_number == 2

    def test_provenance_populated(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("District Jaipur", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        prov = result.record.metadata.district.provenance
        assert prov is not None
        assert prov.source_ocr_text == "District Jaipur"
        assert prov.source_bbox == (0, 0, 10, 20)
        assert prov.page_number == 1
        assert prov.ocr_confidence == 0.9
        assert prov.extraction_confidence == 0.9
        assert prov.extraction_method == ExtractionMethod.LABEL
        assert prov.extractor_version == "label-v1"

    def test_ocr_vs_extraction_confidence_separate(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Area", 0.9, (0, 0, 10, 20)),
                ("2-5-10 Bigha", 0.7, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        prov = result.record.parcels[0].area_raw.provenance
        assert prov.ocr_confidence == 0.7
        assert prov.extraction_confidence == 0.6

    def test_missing_value_no_fabrication(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("District", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.district is None

    def test_ambiguous_label_no_match(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Random text here", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.district is None
        assert "Random text here" in result.record.unrecognized_text

    def test_repeated_labels(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 143/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert len(result.record.parcels) == 2
        assert result.record.parcels[0].khasra_number.value == "142/1"
        assert result.record.parcels[1].khasra_number.value == "143/1"

    def test_numeric_values_preserved(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khata Number 123", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 456/1", 0.9, (0, 0, 10, 20)),
                ("Revenue 500 INR", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.khata_number.value == "123"
        assert result.record.parcels[0].khasra_number.value == "456/1"
        assert result.record.parcels[0].revenue.value == "500 INR"

    def test_devanagari_text_preserved(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("खातेदार का नाम रमेश कुमार", 0.9, (0, 0, 10, 20)),
                ("पिता का नाम मोहन लाल", 0.9, (0, 0, 10, 20)),
                ("पता अमेर जयपुर", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.record.landholders[0].name.value == "रमेश कुमार"
        assert result.record.landholders[0].father_or_husband_name.value == "मोहन लाल"
        assert result.record.landholders[0].address.value == "अमेर जयपुर"

    def test_area_strings_preserved_exactly(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("रकबा २-५-१०", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.record.parcels[0].area_raw.value == "२-५-१०"

    def test_invalid_ocr_result_raises(self) -> None:
        extractor = LabelExtractor()
        with pytest.raises(InvalidOCRResultError):
            extractor.extract(None)

    def test_empty_ocr_result_returns_partial(self) -> None:
        ocr = OCRResult(pages=[], engine_name="test", language="hi")
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.status == "partial"
        assert "No OCR text available" in result.warnings[0]

    def test_multiple_landholders(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Name of Owner Ramesh Kumar", 0.9, (0, 0, 10, 20)),
                ("Father's Name Mohan Lal", 0.9, (0, 0, 10, 20)),
                ("Name of Owner Suresh Kumar", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert len(result.record.landholders) == 2
        assert result.record.landholders[0].name.value == "Ramesh Kumar"
        assert result.record.landholders[0].father_or_husband_name.value == "Mohan Lal"
        assert result.record.landholders[1].name.value == "Suresh Kumar"

    def test_repeated_khasra_creates_multiple_parcels(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
                ("Area 2 Bigha", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 143/1", 0.9, (0, 0, 10, 20)),
                ("Area 3 Bigha", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert len(result.record.parcels) == 2
        assert result.record.parcels[0].khasra_number.value == "142/1"
        assert result.record.parcels[0].area_raw.value == "2 Bigha"
        assert result.record.parcels[1].khasra_number.value == "143/1"
        assert result.record.parcels[1].area_raw.value == "3 Bigha"

    def test_extractor_version_set(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("District Jaipur", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = LabelExtractor()
        result = extractor.extract(ocr)
        assert result.extractor_version == "label-v1"
        assert result.record.metadata.district.provenance.extractor_version == "label-v1"
