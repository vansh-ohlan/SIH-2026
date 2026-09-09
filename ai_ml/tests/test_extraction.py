"""General extraction integration tests."""

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


class TestExtractionArchitecture:
    def test_extractors_are_independent(self) -> None:
        label = LabelExtractor()
        pattern = PatternExtractor()
        assert isinstance(label, ExtractionStrategy)
        assert isinstance(pattern, ExtractionStrategy)

    def test_pattern_extractor_returns_extraction_result(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023", 0.9, (0, 0, 10, 20))]})
        result = PatternExtractor().extract(ocr)
        assert isinstance(result, ExtractionResult)

    def test_label_extractor_returns_extraction_result(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023", 0.9, (0, 0, 10, 20))]})
        result = LabelExtractor().extract(ocr)
        assert isinstance(result, ExtractionResult)

    def test_provenance_preserved_across_extractors(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023", 0.9, (0, 0, 10, 20))]})
        pattern_result = PatternExtractor().extract(ocr)
        label_result = LabelExtractor().extract(ocr)
        p_prov = pattern_result.record.metadata.year.provenance
        l_prov = label_result.record.metadata.year.provenance
        assert p_prov is not None
        assert l_prov is not None
        assert p_prov.source_ocr_text == "Year 2023"
        assert l_prov.source_ocr_text == "Year 2023"

    def test_ocr_confidence_separate_from_extraction_confidence(self) -> None:
        ocr = _make_ocr_result({1: [("Revenue 500 INR", 0.5, (0, 0, 10, 20))]})
        result = PatternExtractor().extract(ocr)
        prov = result.record.parcels[0].revenue.provenance
        assert prov.ocr_confidence == 0.5
        assert prov.extraction_confidence != prov.ocr_confidence

    def test_invalid_ocr_raises(self) -> None:
        with pytest.raises(InvalidOCRResultError):
            PatternExtractor().extract(None)
        with pytest.raises(InvalidOCRResultError):
            LabelExtractor().extract(None)

    def test_empty_ocr_returns_partial_both_extractors(self) -> None:
        ocr = OCRResult(pages=[], engine_name="test", language="hi")
        pattern_result = PatternExtractor().extract(ocr)
        label_result = LabelExtractor().extract(ocr)
        assert pattern_result.status == "partial"
        assert label_result.status == "partial"

    def test_multiple_pages_combined(self) -> None:
        ocr = _make_ocr_result({
            1: [("Year 2023", 0.9, (0, 0, 10, 20))],
            2: [("Khasra Number 142/1", 0.9, (0, 0, 10, 20))],
        })
        result = PatternExtractor().extract(ocr)
        assert result.record.metadata.year.value == "2023"
        assert result.record.parcels[0].khasra_number.value == "142/1"

    def test_no_ml_or_llm_in_pattern_extractor(self) -> None:
        import ai_ml.extraction.pattern_extractor as mod
        source = open(mod.__file__, encoding="utf-8").read().lower()
        assert "sklearn" not in source
        assert "tensorflow" not in source
        assert "torch" not in source
        assert "openai" not in source
        assert "anthropic" not in source

    def test_schema_models_are_pydantic(self) -> None:
        from pydantic import BaseModel
        assert issubclass(RoRRecord, BaseModel)
        assert issubclass(ExtractionResult, BaseModel)
        assert issubclass(ExtractedField, BaseModel)
