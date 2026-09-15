"""Tests for ai_ml.demo non-OCR orchestration and error handling."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from ai_ml.analysis.result import AnalysisResult
from ai_ml.extraction.schema import ExtractionResult
from ai_ml.ocr.validation import OCRValidationUnavailableError
from ai_ml.ocr.config import OCRConfig
from ai_ml.preprocessing.pipeline import run as run_preprocessing
from ai_ml.demo import run_demo, _summarize


def _make_analysis_result(**overrides: Any) -> AnalysisResult:
    extraction_result = ExtractionResult(
        status="success",
        metadata=None,
        landholders=[],
        parcels=[],
        unrecognized_text=[],
        warnings=[],
        extractor_version="test",
        conflicts=[],
        validation_error_count=0,
        validation_warning_count=0,
    )
    data: Dict[str, Any] = {
        "extraction_result": extraction_result,
        "confidence_score": 0.9,
        "extraction_risk": "low",
        "anomaly_features": [0.1, -0.2, 0.05],
        "anomaly_score": 0.05,
        "anomaly_risk": "low",
        "explainability_evidence": {"top_influences": [{"field": "area", "importance": 0.4}]},
    }
    data.update(overrides)
    return AnalysisResult(**data)


class TestRunDemo:
    def test_missing_image_path_exits(self, tmp_path: Path, capsys: pytest.CaptureFixture) -> None:
        with pytest.raises(SystemExit) as exc_info:
            run_demo(str(tmp_path / "nonexistent.png"))
        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "does not exist" in captured.err

    def test_paddleocr_unavailable_exits(self, tmp_path: Path, capsys: pytest.CaptureFixture) -> None:
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake")

        with patch("ai_ml.demo._check_paddleocr_available", return_value=False):
            with pytest.raises(SystemExit) as exc_info:
                run_demo(str(image_path))
        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "PaddleOCR" in captured.err

    def test_preprocessing_unavailable_exits(self, tmp_path: Path, capsys: pytest.CaptureFixture) -> None:
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake")

        with patch("ai_ml.demo._check_paddleocr_available", return_value=True):
            with patch("ai_ml.demo._check_preprocessing_available", return_value=False):
                with pytest.raises(SystemExit) as exc_info:
                    run_demo(str(image_path))
        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "Preprocessing" in captured.err

    def test_ocr_failure_exits(self, tmp_path: Path, capsys: pytest.CaptureFixture) -> None:
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake")

        mock_engine = MagicMock()
        mock_engine.recognize.side_effect = RuntimeError("ocr boom")

        with patch("ai_ml.demo._check_paddleocr_available", return_value=True):
            with patch("ai_ml.demo._check_preprocessing_available", return_value=True):
                with patch("ai_ml.demo._check_extraction_available", return_value=True):
                    with patch("ai_ml.demo.PaddleOCREngine", return_value=mock_engine):
                        with patch("ai_ml.demo.run_preprocessing") as mock_prep:
                            mock_prep.return_value = MagicMock(image=np.zeros((10, 10), dtype=np.uint8))
                            with pytest.raises(SystemExit) as exc_info:
                                run_demo(str(image_path))
        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "OCR inference failed" in captured.err

    def test_inference_failure_exits(self, tmp_path: Path, capsys: pytest.CaptureFixture) -> None:
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake")

        mock_engine = MagicMock()
        mock_engine.recognize.return_value = MagicMock()

        mock_service = MagicMock()
        mock_service.infer.side_effect = RuntimeError("inference boom")

        with patch("ai_ml.demo._check_paddleocr_available", return_value=True):
            with patch("ai_ml.demo._check_preprocessing_available", return_value=True):
                with patch("ai_ml.demo._check_extraction_available", return_value=True):
                    with patch("ai_ml.demo.PaddleOCREngine", return_value=mock_engine):
                        with patch("ai_ml.demo.run_preprocessing") as mock_prep:
                            mock_prep.return_value = MagicMock(image=np.zeros((10, 10), dtype=np.uint8))
                            with patch("ai_ml.demo.DocumentAIInference", return_value=mock_service):
                                with pytest.raises(SystemExit) as exc_info:
                                    run_demo(str(image_path))
        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "Inference pipeline failed" in captured.err


class TestSummarize:
    def test_summarizes_successful_result(self) -> None:
        result = _make_analysis_result(
            confidence_score=0.85,
            extraction_risk="medium",
            anomaly_score=0.3,
            anomaly_risk="high",
        )
        summary = _summarize(result)
        assert summary["status"] == "success"
        assert summary["confidence"]["score"] == 0.85
        assert summary["confidence"]["risk"] == "medium"
        assert summary["anomaly"]["score"] == 0.3
        assert summary["anomaly"]["risk"] == "high"
        assert summary["validation"]["error_count"] == 0
        assert summary["validation"]["warning_count"] == 0

    def test_summarizes_empty_record(self) -> None:
        result = _make_analysis_result()
        summary = _summarize(result)
        assert summary["metadata"] == {}
        assert summary["parcels"] == []
        assert summary["landholders"] == []
