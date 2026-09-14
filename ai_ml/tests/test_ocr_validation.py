"""Tests for ai_ml.ocr.validation."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, Optional
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.exceptions import OCREngineUnavailableError
from ai_ml.ocr.postprocess import postprocess, PostprocessConfig
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
from ai_ml.ocr.validation import (
    OCRValidationUnavailableError,
    _check_paddleocr_available,
    _compute_ocr_stats,
    validate_ocr_on_image,
)


def _make_ocr_result(**overrides: Any) -> OCRResult:
    word = OCRWord(text="किलो", confidence=0.9, bbox=(0, 0, 10, 20), language="hi")
    line = OCRLine(line_id="line-1", words=[word], bbox=(0, 0, 10, 20))
    block = OCRBlock(block_id="block-1", lines=[line], bbox=(0, 0, 10, 20))
    page = OCRPage(page_number=1, blocks=[block], width=100, height=200)
    data: Dict[str, Any] = {
        "pages": [page],
        "engine_name": "mock",
        "language": "hi",
    }
    data.update(overrides)
    return OCRResult(**data)


class TestOCRPaddleAvailable:
    def test_returns_true_when_paddleocr_importable(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(sys.modules, "paddleocr", MagicMock())
        assert _check_paddleocr_available() is True

    def test_returns_false_when_paddleocr_missing(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(sys.modules, "paddleocr", None)
        assert _check_paddleocr_available() is False


class TestComputeOCRStats:
    def test_basic_stats(self) -> None:
        result = _make_ocr_result()
        stats = _compute_ocr_stats(result)
        assert stats["total_pages"] == 1
        assert stats["total_words"] == 1
        assert stats["avg_confidence"] == pytest.approx(0.9)
        assert stats["min_confidence"] == pytest.approx(0.9)
        assert stats["max_confidence"] == pytest.approx(0.9)
        assert stats["raw_text"] == "किलो"

    def test_multiple_pages(self) -> None:
        word1 = OCRWord(text="A", confidence=0.8, bbox=(0, 0, 10, 20), language="en")
        line1 = OCRLine(line_id="line-1", words=[word1], bbox=(0, 0, 10, 20))
        block1 = OCRBlock(block_id="block-1", lines=[line1], bbox=(0, 0, 10, 20))
        page1 = OCRPage(page_number=1, blocks=[block1], width=100, height=200)

        word2 = OCRWord(text="B", confidence=0.6, bbox=(0, 0, 10, 20), language="en")
        line2 = OCRLine(line_id="line-2", words=[word2], bbox=(0, 0, 10, 20))
        block2 = OCRBlock(block_id="block-2", lines=[line2], bbox=(0, 0, 10, 20))
        page2 = OCRPage(page_number=2, blocks=[block2], width=100, height=200)

        result = OCRResult(pages=[page1, page2], engine_name="mock", language="en")
        stats = _compute_ocr_stats(result)
        assert stats["total_pages"] == 2
        assert stats["total_words"] == 2
        assert stats["avg_confidence"] == pytest.approx(0.7)

    def test_empty_result(self) -> None:
        page = OCRPage(page_number=1, blocks=[], width=100, height=200)
        result = OCRResult(pages=[page], engine_name="mock", language="en")
        stats = _compute_ocr_stats(result)
        assert stats["total_words"] == 0
        assert stats["avg_confidence"] is None
        assert stats["raw_text"] == ""


class TestValidateOCROnImage:
    def test_missing_paddleocr_raises_clear_error(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("ai_ml.ocr.validation._check_paddleocr_available", lambda: False)
        dummy = tmp_path / "dummy.png"
        dummy.write_bytes(b"fake")
        with pytest.raises(OCRValidationUnavailableError, match="PaddleOCR is not installed"):
            validate_ocr_on_image(dummy)

    def test_missing_image_raises_value_error(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("ai_ml.ocr.validation._check_paddleocr_available", lambda: True)
        with pytest.raises(ValueError, match="does not exist"):
            validate_ocr_on_image(tmp_path / "nonexistent.png")

    def test_runs_preprocessing_and_ocr(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("ai_ml.ocr.validation._check_paddleocr_available", lambda: True)

        image = np.zeros((100, 100), dtype=np.uint8)
        image_path = tmp_path / "test.png"
        import cv2
        cv2.imwrite(str(image_path), image)

        mock_result = _make_ocr_result()
        mock_engine = MagicMock()
        mock_engine.recognize.return_value = mock_result

        with patch("ai_ml.ocr.validation.PaddleOCREngine", return_value=mock_engine) as mock_cls:
            with patch("ai_ml.ocr.validation.postprocess", return_value=mock_result) as mock_post:
                stats = validate_ocr_on_image(image_path, languages=["hi"])

        assert stats["engine_name"] == "mock"
        assert stats["total_words"] == 1
        assert stats["avg_confidence"] == pytest.approx(0.9)
        assert "preprocessing_metadata" in stats
        mock_engine.recognize.assert_called_once()
        mock_post.assert_called_once()

    def test_postprocess_skipped_when_disabled(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("ai_ml.ocr.validation._check_paddleocr_available", lambda: True)

        image = np.zeros((100, 100), dtype=np.uint8)
        image_path = tmp_path / "test.png"
        import cv2
        cv2.imwrite(str(image_path), image)

        mock_result = _make_ocr_result()
        mock_engine = MagicMock()
        mock_engine.recognize.return_value = mock_result

        with patch("ai_ml.ocr.validation.PaddleOCREngine", return_value=mock_engine):
            with patch("ai_ml.ocr.validation.postprocess") as mock_post:
                validate_ocr_on_image(image_path, apply_postprocess=False)

        mock_post.assert_not_called()

    def test_preprocessing_failure_propagates(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("ai_ml.ocr.validation._check_paddleocr_available", lambda: True)

        image = np.zeros((100, 100), dtype=np.uint8)
        image_path = tmp_path / "test.png"
        import cv2
        cv2.imwrite(str(image_path), image)

        with patch("ai_ml.ocr.validation.run_preprocessing", side_effect=RuntimeError("prep failed")):
            with pytest.raises(RuntimeError, match="prep failed"):
                validate_ocr_on_image(image_path)
