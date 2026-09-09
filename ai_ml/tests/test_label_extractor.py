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
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.extraction.label_extractor import LabelExtractor


def _make_ocr_result(lines_per_page: dict[int, list[tuple[str, float, tuple[int, int, int, int]]]]) -> OCRResult:
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
    def test_year_label(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023-24", 0.9, (0, 0, 10, 20))]})
        result = LabelExtractor().extract(ocr)
        assert result.status == "success"
        assert result.record.metadata.year.value == "2023-24"

    def test_hindi_year_label(self) -> None:
        ocr = _make_ocr_result({1: [("साल २०२३-२४", 0.9, (0, 0, 10, 20))]})
        result = LabelExtractor().extract(ocr)
        assert result.record.metadata.year.value == "२०२३-२४"

    def test_khata_number_label(self) -> None:
        ocr = _make_ocr_result({1: [("Khata Number 123", 0.9, (0, 0, 10, 20))]})
        result = LabelExtractor().extract(ocr)
        assert result.record.metadata.khata_number.value == "123"

    def test_khasra_number_label(self) -> None:
        ocr = _make_ocr_result({1: [("Khasra Number 142/1", 0.9, (0, 0, 10, 20))]})
        result = LabelExtractor().extract(ocr)
        assert result.record.parcels[0].khasra_number.value == "142/1"

    def test_repeated_khasra_creates_parcels(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 143/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        result = LabelExtractor().extract(ocr)
        assert len(result.record.parcels) == 2
        assert result.record.parcels[0].khasra_number.value == "142/1"
        assert result.record.parcels[1].khasra_number.value == "143/1"

    def test_multiple_pages(self) -> None:
        ocr = _make_ocr_result({
            1: [("Year 2023", 0.9, (0, 0, 10, 20))],
            2: [("Khasra Number 142/1", 0.9, (0, 0, 10, 20))],
        })
        result = LabelExtractor().extract(ocr)
        assert result.record.metadata.year.value == "2023"
        assert result.record.metadata.year.provenance.page_number == 1
        assert result.record.parcels[0].khasra_number.provenance.page_number == 2

    def test_provenance_populated(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023-24", 0.9, (0, 0, 10, 20))]})
        result = LabelExtractor().extract(ocr)
        prov = result.record.metadata.year.provenance
        assert prov is not None
        assert prov.source_ocr_text == "Year 2023-24"
        assert prov.ocr_confidence == 0.9
        assert prov.extraction_confidence == 0.9
        assert prov.extraction_method == ExtractionMethod.LABEL
        assert prov.extractor_version == "label-v1"

    def test_invalid_ocr_result_raises(self) -> None:
        with pytest.raises(InvalidOCRResultError):
            LabelExtractor().extract(None)

    def test_empty_ocr_returns_partial(self) -> None:
        ocr = OCRResult(pages=[], engine_name="test", language="hi")
        result = LabelExtractor().extract(ocr)
        assert result.status == "partial"
        assert "No OCR text available" in result.warnings[0]

    def test_missing_value_no_extraction(self) -> None:
        ocr = _make_ocr_result({1: [("Year", 0.9, (0, 0, 10, 20))]})
        result = LabelExtractor().extract(ocr)
        assert result.record.metadata.year is None

    def test_extractor_version_set(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023", 0.9, (0, 0, 10, 20))]})
        result = LabelExtractor().extract(ocr)
        assert result.extractor_version == "label-v1"
        assert result.record.metadata.year.provenance.extractor_version == "label-v1"
