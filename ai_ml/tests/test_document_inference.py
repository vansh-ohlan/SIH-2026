"""Tests for ai_ml.inference.document_inference."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import numpy as np
import pytest

from ai_ml.analysis.analyzer import Analyzer
from ai_ml.analysis.result import AnalysisResult
from ai_ml.ocr.schema import OCRResult
from ai_ml.inference.document_inference import DocumentAIInference


class _MockOCREngine:
    """Mock OCR engine for tests."""

    def __init__(self, result: Optional[OCRResult] = None) -> None:
        self._result = result
        self.calls = []

    def recognize(self, image: np.ndarray, config=None) -> OCRResult:
        self.calls.append(image.shape)
        if self._result is None:
            from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRWord
            words = [OCRWord(text="Khata Number 123", confidence=0.9, bbox=(0, 0, 10, 20), language="hi")]
            lines = [OCRLine(line_id="line-1", words=words, bbox=(0, 0, 10, 20))]
            blocks = [OCRBlock(block_id="block-1", lines=lines, bbox=(0, 0, 10, 20))]
            pages = [OCRPage(page_number=1, blocks=blocks, width=100, height=100)]
            return OCRResult(pages=pages, engine_name="mock", language="hi")
        return self._result


class TestDocumentAIInference:
    def test_valid_image_returns_analysis_result(self, tmp_path: Path) -> None:
        import cv2
        image_path = tmp_path / "test.png"
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        mock_ocr = _MockOCREngine()
        service = DocumentAIInference(ocr_engine=mock_ocr)
        result = service.infer(str(image_path))
        assert isinstance(result, AnalysisResult)

    def test_none_image_path_raises(self) -> None:
        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        with pytest.raises(ValueError):
            service.infer(None)

    def test_missing_file_raises(self) -> None:
        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        with pytest.raises(ValueError):
            service.infer("/nonexistent/path.png")

    def test_no_ocr_engine_raises(self, tmp_path: Path) -> None:
        import cv2
        image_path = tmp_path / "test.png"
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))
        service = DocumentAIInference()
        with pytest.raises(RuntimeError):
            service.infer(str(image_path))

    def test_ocr_failure_raises_clear_error(self, tmp_path: Path) -> None:
        import cv2

        class _FailingOCR:
            def recognize(self, image, config=None):
                raise RuntimeError("mock OCR failure")

        image_path = tmp_path / "test.png"
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))
        service = DocumentAIInference(ocr_engine=_FailingOCR())
        with pytest.raises(RuntimeError, match="OCR failed"):
            service.infer(str(image_path))

    def test_invalid_input_type_raises(self) -> None:
        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        with pytest.raises((ValueError, TypeError)):
            service.infer(12345)

    def test_provenance_preserved(self, tmp_path: Path) -> None:
        import cv2
        image_path = tmp_path / "test.png"
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        mock_ocr = _MockOCREngine()
        service = DocumentAIInference(ocr_engine=mock_ocr)
        result = service.infer(str(image_path))
        assert result.explainability_evidence is not None
        assert result.explainability_evidence["record_present"] is True

    def test_deterministic_with_same_input(self, tmp_path: Path) -> None:
        import cv2
        image_path = tmp_path / "test.png"
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        mock_ocr = _MockOCREngine()
        service = DocumentAIInference(ocr_engine=mock_ocr)
        r1 = service.infer(str(image_path))
        r2 = service.infer(str(image_path))
        assert r1.confidence_score == r2.confidence_score
        assert r1.extraction_risk == r2.extraction_risk
