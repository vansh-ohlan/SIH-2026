"""Tests for ai_ml.inference.service."""

from __future__ import annotations

from typing import Any, Optional

import pytest

from ai_ml.analysis.analyzer import Analyzer
from ai_ml.analysis.result import AnalysisResult
from ai_ml.analysis.analyzer import Analyzer
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractedField,
    FieldProvenance,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.inference.service import InferenceService


def _make_ocr_result(text="Year 2023"):
    blocks = []
    lines = []
    words = [OCRWord(text=text, confidence=0.9, bbox=(0, 0, 10, 20), language="hi")]
    lines.append(OCRLine(line_id="line-1", words=words, bbox=(0, 0, 10, 20)))
    blocks.append(OCRBlock(block_id="block-1", lines=lines, bbox=(0, 0, 10, 20)))
    pages = [OCRPage(page_number=1, blocks=blocks, width=100, height=100)]
    return OCRResult(pages=pages, engine_name="test", language="hi")


class TestInferenceService:
    def test_infer_returns_analysis_result(self) -> None:
        service = InferenceService()
        ocr = _make_ocr_result("Year 2023")
        result = service.infer(ocr)
        assert isinstance(result, AnalysisResult)

    def test_infer_with_custom_extraction_pipeline(self) -> None:
        from ai_ml.pipeline.extraction_pipeline import ExtractionPipeline
        pipeline = ExtractionPipeline()
        analyzer = Analyzer()
        service = InferenceService(extraction_pipeline=pipeline, analyzer=analyzer)
        ocr = _make_ocr_result("Year 2023")
        result = service.infer(ocr)
        assert isinstance(result, AnalysisResult)

    def test_infer_with_custom_analyzer(self) -> None:
        analyzer = Analyzer()
        service = InferenceService(analyzer=analyzer)
        ocr = _make_ocr_result("Year 2023")
        result = service.infer(ocr)
        assert isinstance(result, AnalysisResult)

    def test_infer_with_none_ocr_raises(self) -> None:
        service = InferenceService()
        with pytest.raises(InvalidOCRResultError):
            service.infer(None)

    def test_infer_with_invalid_type_raises(self) -> None:
        service = InferenceService()
        with pytest.raises(InvalidOCRResultError):
            service.infer("not an OCRResult")

    def test_infer_preserves_extraction_result(self) -> None:
        service = InferenceService()
        ocr = _make_ocr_result("Year 2023")
        result = service.infer(ocr)
        assert result.extraction_result is not None
        assert result.extraction_result.status in ("success", "partial", "failure")

    def test_infer_explainability_populated(self) -> None:
        service = InferenceService()
        ocr = _make_ocr_result("Year 2023")
        result = service.infer(ocr)
        assert result.explainability_evidence is not None
        assert "fields" in result.explainability_evidence

    def test_infer_deterministic(self) -> None:
        service = InferenceService()
        ocr = _make_ocr_result("Year 2023")
        r1 = service.infer(ocr)
        r2 = service.infer(ocr)
        assert r1.confidence_score == r2.confidence_score
        assert r1.extraction_risk == r2.extraction_risk

    def test_default_constructor_creates_defaults(self) -> None:
        service = InferenceService()
        assert service._extraction_pipeline is not None
        assert service._analyzer is not None
