"""Tests for ai_ml.extraction.pattern_extractor."""

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
from ai_ml.extraction.strategy import ExtractionStrategy
from ai_ml.extraction.pattern_extractor import PatternExtractor


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


class TestPatternExtractor:
    def test_year_pattern(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year 2023-24", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.status == "success"
        assert result.record.metadata.year.value == "2023-24"

    def test_year_pattern_single_year(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year 2023", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.year.value == "2023"

    def test_khata_number_pattern(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khata Number 123", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.khata_number.value == "123"

    def test_khewat_number_pattern(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khewat Number 45", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.khewat_number.value == "45"

    def test_khatoni_number_pattern(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khatoni Number 12", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.khatoni_number.value == "12"

    def test_khasra_number_pattern(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.parcels[0].khasra_number.value == "142/1"

    def test_mutation_number_pattern(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Mutation Number MUT-789", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.mutation_number.value == "MUT-789"

    def test_mutation_date_pattern(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Mutation Date 2023-04-15", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.mutation_date.value == "2023-04-15"

    def test_area_pattern_fractional(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Area 2-5-10", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.parcels[0].area_raw.value == "2-5-10"

    def test_area_pattern_slash(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Area 2/5/10", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.parcels[0].area_raw.value == "2/5/10"

    def test_revenue_pattern(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Revenue 500 INR", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.parcels[0].revenue.value == "500 INR"

    def test_hindi_labels(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("साल २०२३-२४", 0.9, (0, 0, 10, 20)),
                ("खाता संख्या १२३", 0.9, (0, 0, 10, 20)),
                ("खसरा संख्या १४२/१", 0.9, (0, 0, 10, 20)),
                ("रकबा २-५-१०", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.year.value == "२०२३-२४"
        assert result.record.metadata.khata_number.value == "१२३"
        assert result.record.parcels[0].khasra_number.value == "१४२/१"
        assert result.record.parcels[0].area_raw.value == "२-५-१०"

    def test_mixed_hindi_english(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year साल 2023-24", 0.9, (0, 0, 10, 20)),
                ("Khasra Number खसरा 142/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.year.value == "2023-24"
        assert result.record.parcels[0].khasra_number.value == "142/1"

    def test_separators_preserved(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khasra Number 247/2/3", 0.9, (0, 0, 10, 20)),
                ("Area 2:5:10", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.parcels[0].khasra_number.value == "247/2/3"
        assert result.record.parcels[0].area_raw.value == "2:5:10"

    def test_multiple_pages(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year 2023", 0.9, (0, 0, 10, 20)),
            ],
            2: [
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.year.value == "2023"
        assert result.record.metadata.year.provenance.page_number == 1
        assert result.record.parcels[0].khasra_number.value == "142/1"
        assert result.record.parcels[0].khasra_number.provenance.page_number == 2

    def test_repeated_matches(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 143/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert len(result.record.parcels) == 2
        assert result.record.parcels[0].khasra_number.value == "142/1"
        assert result.record.parcels[1].khasra_number.value == "143/1"

    def test_provenance_populated(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year 2023-24", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        prov = result.record.metadata.year.provenance
        assert prov is not None
        assert prov.source_ocr_text == "Year 2023-24"
        assert prov.source_bbox == (0, 0, 10, 20)
        assert prov.page_number == 1
        assert prov.ocr_confidence == 0.9
        assert prov.extraction_confidence == 0.90
        assert prov.extraction_method == ExtractionMethod.REGEX
        assert prov.extractor_version == "pattern-v1"

    def test_ocr_vs_extraction_confidence_separate(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Revenue 500 INR", 0.7, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        prov = result.record.parcels[0].revenue.provenance
        assert prov.ocr_confidence == 0.7
        assert prov.extraction_confidence == 0.75

    def test_exact_text_preserved(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Area २-५-१०", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.parcels[0].area_raw.value == "२-५-१०"

    def test_page_number_not_mistaken_for_year(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Page 1", 0.9, (0, 0, 10, 20)),
                ("Page 2", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.year is None

    def test_unrelated_numbers_not_extracted(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Some random text 12345 here", 0.9, (0, 0, 10, 20)),
                ("Another line 456", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.khata_number is None
        assert result.record.parcels == []

    def test_missing_value_no_extraction(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.record.metadata.year is None

    def test_invalid_ocr_result_raises(self) -> None:
        extractor = PatternExtractor()
        with pytest.raises(InvalidOCRResultError):
            extractor.extract(None)

    def test_empty_ocr_result_returns_partial(self) -> None:
        ocr = OCRResult(pages=[], engine_name="test", language="hi")
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.status == "partial"
        assert "No OCR text available" in result.warnings[0]

    def test_extractor_version_set(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year 2023", 0.9, (0, 0, 10, 20)),
            ]
        })
        extractor = PatternExtractor()
        result = extractor.extract(ocr)
        assert result.extractor_version == "pattern-v1"
        assert result.record.metadata.year.provenance.extractor_version == "pattern-v1"
