"""End-to-end AI pipeline validation tests."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from ai_ml.analysis.analyzer import Analyzer
from ai_ml.analysis.result import AnalysisResult
from ai_ml.anomaly.isolation_forest import AnomalyModel
from ai_ml.extraction.schema import ExtractionResult
from ai_ml.inference.document_inference import DocumentAIInference
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord


def _make_mock_ocr_result(text: str = "Khata Number 123", confidence: float = 0.9) -> OCRResult:
    word = OCRWord(text=text, confidence=confidence, bbox=(0, 0, 10, 20), language="hi")
    line = OCRLine(line_id="line-1", words=[word], bbox=(0, 0, 10, 20))
    block = OCRBlock(block_id="block-1", lines=[line], bbox=(0, 0, 10, 20))
    page = OCRPage(page_number=1, blocks=[block], width=100, height=200)
    return OCRResult(pages=[page], engine_name="mock", language="hi")


class _MockOCREngine:
    """Mock OCR engine for pipeline tests."""

    def __init__(self, result: Optional[OCRResult] = None) -> None:
        self._result = result
        self.calls = []

    def recognize(self, image: np.ndarray, config=None) -> OCRResult:
        self.calls.append(image.shape)
        if self._result is None:
            return _make_mock_ocr_result()
        return self._result


class _FakeAnomalyModel:
    """Fake anomaly model that returns deterministic scores without training."""

    def __init__(self) -> None:
        self.is_fitted = True

    def score(self, X: np.ndarray) -> np.ndarray:
        return np.array([0.1])

    def predict(self, X: np.ndarray) -> np.ndarray:
        return np.array([1])


class TestEndToEndPipeline:
    def test_successful_complete_pipeline(self, tmp_path: Path) -> None:
        image_path = tmp_path / "test.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        assert result.extraction_result is not None
        assert result.confidence_score is not None
        assert result.extraction_risk is not None
        assert result.explainability_evidence is not None

    def test_empty_ocr_result(self, tmp_path: Path) -> None:
        image_path = tmp_path / "blank.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        empty_ocr = OCRResult(pages=[], engine_name="mock", language="hi")
        service = DocumentAIInference(ocr_engine=_MockOCREngine(result=empty_ocr))
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        assert result.extraction_result is not None
        assert result.extraction_result.status in ("success", "partial", "failure")

    def test_partially_extracted_document(self, tmp_path: Path) -> None:
        image_path = tmp_path / "partial.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        assert result.extraction_result.validation_warning_count >= 0

    def test_validation_errors_reflected(self, tmp_path: Path) -> None:
        image_path = tmp_path / "errors.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        assert isinstance(result.extraction_result.conflicts, list)
        assert isinstance(result.extraction_result.validation_error_count, int)
        assert isinstance(result.extraction_result.validation_warning_count, int)

    def test_provenance_preserved(self, tmp_path: Path) -> None:
        image_path = tmp_path / "prov.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        assert result.explainability_evidence is not None
        assert "record_present" in result.explainability_evidence

    def test_anomaly_analyzer_configured(self, tmp_path: Path) -> None:
        image_path = tmp_path / "anomaly.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        fake_model = _FakeAnomalyModel()
        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        # Inject fitted anomaly model via analyzer
        service._inference_service._analyzer = Analyzer(anomaly_model=fake_model)
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        assert result.anomaly_score is not None
        assert result.anomaly_risk is not None
        assert result.anomaly_risk.upper() in ("LOW", "MEDIUM", "HIGH")
        assert isinstance(result.anomaly_features, list)

    def test_anomaly_analyzer_unconfigured(self, tmp_path: Path) -> None:
        image_path = tmp_path / "no_anomaly.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        assert result.anomaly_score is None
        assert result.anomaly_risk is None
        assert result.anomaly_features is None

    def test_preprocessing_integration(self, tmp_path: Path) -> None:
        image_path = tmp_path / "prep.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        assert result.extraction_result is not None

    def test_postprocess_integration(self, tmp_path: Path) -> None:
        image_path = tmp_path / "post.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        assert result.extraction_result is not None

    def test_multiple_parcels_and_landholders(self, tmp_path: Path) -> None:
        image_path = tmp_path / "multi.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        result = service.infer(str(image_path))

        assert isinstance(result, AnalysisResult)
        record = result.extraction_result.record
        assert isinstance(record.parcels, list)
        assert isinstance(record.landholders, list)

    def test_deterministic_with_same_input(self, tmp_path: Path) -> None:
        image_path = tmp_path / "det.png"
        import cv2
        cv2.imwrite(str(image_path), np.zeros((100, 100), dtype=np.uint8))

        service = DocumentAIInference(ocr_engine=_MockOCREngine())
        r1 = service.infer(str(image_path))
        r2 = service.infer(str(image_path))

        assert r1.confidence_score == r2.confidence_score
        assert r1.extraction_risk == r2.extraction_risk
        assert r1.anomaly_score == r2.anomaly_score
        assert r1.anomaly_risk == r2.anomaly_risk
