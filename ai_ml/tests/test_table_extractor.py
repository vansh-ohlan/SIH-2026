"""Tests for ai_ml.extraction.table_extractor."""

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
from ai_ml.extraction.table_extractor import TableExtractor


class TestGroupLinesIntoRows:
    def test_lines_with_similar_y_grouped(self) -> None:
        lines = [
            {"text": "200/1", "confidence": 0.9, "bbox": (0, 0, 10, 10), "page_number": 1},
            {"text": "2.5", "confidence": 0.9, "bbox": (20, 2, 30, 12), "page_number": 1},
            {"text": "कृषि", "confidence": 0.9, "bbox": (40, 1, 50, 11), "page_number": 1},
        ]
        rows = TableExtractor()._flatten_ocr_result(
            type("OCRResult", (), {"pages": []})()
        )
        # Use the module-level function directly
        from ai_ml.extraction.table_extractor import _group_lines_into_rows
        grouped = _group_lines_into_rows(lines)
        assert len(grouped) == 1

    def test_lines_with_different_y_separated(self) -> None:
        lines = [
            {"text": "200/1", "confidence": 0.9, "bbox": (0, 0, 10, 10), "page_number": 1},
            {"text": "200/2", "confidence": 0.9, "bbox": (0, 50, 10, 60), "page_number": 1},
        ]
        from ai_ml.extraction.table_extractor import _group_lines_into_rows
        grouped = _group_lines_into_rows(lines)
        assert len(grouped) == 2

    def test_lines_without_bbox_fallback(self) -> None:
        lines = [
            {"text": "200/1", "confidence": 0.9, "bbox": None, "page_number": 1},
            {"text": "2.5", "confidence": 0.9, "bbox": None, "page_number": 1},
        ]
        from ai_ml.extraction.table_extractor import _group_lines_into_rows
        grouped = _group_lines_into_rows(lines)
        assert len(grouped) == 0

    def test_empty_lines_returns_empty(self) -> None:
        from ai_ml.extraction.table_extractor import _group_lines_into_rows
        grouped = _group_lines_into_rows([])
        assert grouped == []


class TestLooksLikeTableRow:
    def test_khasra_pattern_matches(self) -> None:
        from ai_ml.extraction.table_extractor import _looks_like_table_row
        assert _looks_like_table_row([{"text": "200/1 2.5 कृषि सिंचित 50", "bbox": (0, 0, 10, 10), "confidence": 0.9, "page_number": 1}]) is True

    def test_non_table_text_does_not_match(self) -> None:
        from ai_ml.extraction.table_extractor import _looks_like_table_row
        assert _looks_like_table_row([{"text": "जयपुर", "bbox": (0, 0, 10, 10), "confidence": 0.9, "page_number": 1}]) is False


class TestExtractRowFields:
    def test_extracts_khasra_and_revenue(self) -> None:
        from ai_ml.extraction.table_extractor import _extract_row_fields
        lines = [{"text": "200/1 2.5 कृषि सिंचित 50", "bbox": (0, 0, 10, 10), "confidence": 0.9, "page_number": 1}]
        fields = _extract_row_fields(lines)
        assert "khasra_number" in fields
        assert "revenue" in fields

    def test_returns_empty_for_non_table(self) -> None:
        from ai_ml.extraction.table_extractor import _extract_row_fields
        lines = [{"text": "जयपुर", "bbox": (0, 0, 10, 10), "confidence": 0.9, "page_number": 1}]
        fields = _extract_row_fields(lines)
        assert fields == {}


class TestBuildParcelFromRow:
    def test_parcel_has_provenance(self) -> None:
        from ai_ml.extraction.table_extractor import _build_parcel_from_row
        row_lines = [{"text": "200/1 2.5", "bbox": (0, 0, 10, 10), "confidence": 0.9, "page_number": 1}]
        fields = {"khasra_number": {"value": "200/1", "confidence": 0.9, "source_text": "200/1 2.5"}}
        parcel = _build_parcel_from_row(0, row_lines, fields)
        assert isinstance(parcel, Parcel)
        assert parcel.khasra_number is not None
        assert parcel.khasra_number.value == "200/1"
        assert parcel.khasra_number.provenance is not None
        assert parcel.khasra_number.provenance.extraction_method == ExtractionMethod.TABLE

    def test_parcel_handles_missing_bbox(self) -> None:
        from ai_ml.extraction.table_extractor import _build_parcel_from_row
        row_lines = [{"text": "200/1", "bbox": None, "confidence": 0.9, "page_number": 1}]
        fields = {"khasra_number": {"value": "200/1", "confidence": 0.9, "source_text": "200/1"}}
        parcel = _build_parcel_from_row(0, row_lines, fields)
        assert isinstance(parcel, Parcel)
        assert parcel.khasra_number.value == "200/1"


class TestTableExtractor:
    def test_returns_partial_on_empty_ocr(self) -> None:
        from ai_ml.ocr.schema import OCRResult
        extractor = TableExtractor()
        result = extractor.extract(OCRResult(pages=[]))
        assert result.status == "partial"

    def test_extracts_parcels_from_table_rows(self) -> None:
        from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
        words1 = [OCRWord(text="200/1", confidence=0.9, bbox=(0, 0, 10, 10), language="hi")]
        line1 = OCRLine(line_id="line-1", words=words1, bbox=(0, 0, 10, 10))
        block1 = OCRBlock(block_id="block-1", lines=[line1], bbox=(0, 0, 10, 10))
        page1 = OCRPage(page_number=1, blocks=[block1], width=100, height=100)
        ocr = OCRResult(pages=[page1], engine_name="test", language="hi")

        extractor = TableExtractor()
        result = extractor.extract(ocr)
        assert result.status == "success"
        assert len(result.record.parcels) >= 1

    def test_provenance_preserved(self) -> None:
        from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
        words1 = [OCRWord(text="200/1 2.5", confidence=0.9, bbox=(0, 0, 10, 10), language="hi")]
        line1 = OCRLine(line_id="line-1", words=words1, bbox=(0, 0, 10, 10))
        block1 = OCRBlock(block_id="block-1", lines=[line1], bbox=(0, 0, 10, 10))
        page1 = OCRPage(page_number=1, blocks=[block1], width=100, height=100)
        ocr = OCRResult(pages=[page1], engine_name="test", language="hi")

        extractor = TableExtractor()
        result = extractor.extract(ocr)
        parcel = result.record.parcels[0]
        assert parcel.khasra_number is not None
        assert parcel.khasra_number.provenance.source_ocr_text == "200/1 2.5"
        assert parcel.khasra_number.provenance.page_number == 1
        assert parcel.khasra_number.provenance.extraction_method == ExtractionMethod.TABLE

    def test_multiple_pages(self) -> None:
        from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
        words1 = [OCRWord(text="200/1", confidence=0.9, bbox=(0, 0, 10, 10), language="hi")]
        line1 = OCRLine(line_id="line-1", words=words1, bbox=(0, 0, 10, 10))
        block1 = OCRBlock(block_id="block-1", lines=[line1], bbox=(0, 0, 10, 10))
        page1 = OCRPage(page_number=1, blocks=[block1], width=100, height=100)

        words2 = [OCRWord(text="200/2", confidence=0.9, bbox=(0, 50, 10, 60), language="hi")]
        line2 = OCRLine(line_id="line-2", words=words2, bbox=(0, 50, 10, 60))
        block2 = OCRBlock(block_id="block-2", lines=[line2], bbox=(0, 50, 10, 60))
        page2 = OCRPage(page_number=2, blocks=[block2], width=100, height=100)

        ocr = OCRResult(pages=[page1, page2], engine_name="test", language="hi")
        extractor = TableExtractor()
        result = extractor.extract(ocr)
        assert len(result.record.parcels) >= 2

    def test_no_bbox_skips_row_aware_extraction(self) -> None:
        from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
        words1 = [OCRWord(text="200/1", confidence=0.9, bbox=None, language="hi")]
        line1 = OCRLine(line_id="line-1", words=words1, bbox=None)
        block1 = OCRBlock(block_id="block-1", lines=[line1], bbox=None)
        page1 = OCRPage(page_number=1, blocks=[block1], width=100, height=100)
        ocr = OCRResult(pages=[page1], engine_name="test", language="hi")

        extractor = TableExtractor()
        result = extractor.extract(ocr)
        assert result.status == "partial"

    def test_does_not_overwrite_existing_behavior(self) -> None:
        from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
        words1 = [OCRWord(text="किसान नाम राम", confidence=0.9, bbox=(0, 0, 10, 10), language="hi")]
        line1 = OCRLine(line_id="line-1", words=words1, bbox=(0, 0, 10, 10))
        block1 = OCRBlock(block_id="block-1", lines=[line1], bbox=(0, 0, 10, 10))
        page1 = OCRPage(page_number=1, blocks=[block1], width=100, height=100)
        ocr = OCRResult(pages=[page1], engine_name="test", language="hi")

        extractor = TableExtractor()
        result = extractor.extract(ocr)
        assert result.status == "partial"
