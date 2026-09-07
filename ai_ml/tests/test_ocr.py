"""Architecture-level tests for ai_ml.ocr."""

from typing import Optional

import numpy as np
import pytest

from ai_ml.ocr.base import OCREngine
from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.exceptions import (
    OCRConfigurationError,
    OCRImageError,
    OCRInferenceError,
    OCREngineUnavailableError,
    OCRParsingError,
    OCRError,
)
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
from ai_ml.ocr.postprocess import postprocess


class FakeOCREngine(OCREngine):
    """Fake OCR engine for testing the interface."""

    def __init__(self, raise_error: Optional[Exception] = None) -> None:
        self.raise_error = raise_error

    def recognize(self, image: np.ndarray, config: Optional[OCRConfig] = None) -> OCRResult:
        if self.raise_error is not None:
            raise self.raise_error
        if image is None or not isinstance(image, np.ndarray):
            raise OCRImageError("Invalid image")
        if image.size == 0:
            raise OCRInferenceError("Empty image")
        word = OCRWord(text="नमस्ते", confidence=0.95, bbox=(0, 0, 10, 20), language="hi")
        line = OCRLine(line_id="line-1", words=[word], bbox=(0, 0, 10, 20))
        block = OCRBlock(block_id="block-1", lines=[line], bbox=(0, 0, 10, 20))
        page = OCRPage(page_number=1, blocks=[block], width=100, height=200)
        return OCRResult(
            pages=[page],
            engine_name="fake",
            language="hi",
            raw_metadata={"foo": "bar"},
        )


class TestOCRResultSchema:
    def test_word_creation(self) -> None:
        word = OCRWord(text="test", confidence=0.9, bbox=(0, 0, 10, 20), language="en")
        assert word.text == "test"
        assert word.confidence == 0.9
        assert word.bbox == (0, 0, 10, 20)
        assert word.language == "en"

    def test_word_none_fields(self) -> None:
        word = OCRWord(text="test")
        assert word.confidence is None
        assert word.bbox is None
        assert word.language is None

    def test_line_creation(self) -> None:
        word = OCRWord(text="hello")
        line = OCRLine(line_id="L1", words=[word])
        assert line.line_id == "L1"
        assert len(line.words) == 1

    def test_block_creation(self) -> None:
        line = OCRLine(line_id="L1")
        block = OCRBlock(block_id="B1", lines=[line])
        assert block.block_id == "B1"
        assert len(block.lines) == 1

    def test_page_creation(self) -> None:
        block = OCRBlock(block_id="B1")
        page = OCRPage(page_number=1, blocks=[block], width=800, height=600)
        assert page.page_number == 1
        assert page.width == 800
        assert page.height == 600

    def test_result_creation(self) -> None:
        page = OCRPage(page_number=1)
        result = OCRResult(pages=[page], engine_name="test", language="hi", raw_metadata={"k": "v"})
        assert result.engine_name == "test"
        assert result.language == "hi"
        assert result.raw_metadata == {"k": "v"}
        assert len(result.pages) == 1

    def test_confidence_range(self) -> None:
        word = OCRWord(text="x", confidence=1.0)
        assert word.confidence == 1.0
        word_low = OCRWord(text="x", confidence=0.0)
        assert word_low.confidence == 0.0


class TestOCRConfig:
    def test_defaults(self) -> None:
        config = OCRConfig()
        assert config.languages == ["hi", "en"]
        assert config.confidence_threshold == 0.0
        assert config.require_bboxes is True
        assert config.retain_raw_output is False
        assert config.device is None
        assert config.document_id is None

    def test_custom_values(self) -> None:
        config = OCRConfig(languages=["hi"], confidence_threshold=0.5, device="cpu", document_id="doc-1")
        assert config.languages == ["hi"]
        assert config.confidence_threshold == 0.5
        assert config.device == "cpu"
        assert config.document_id == "doc-1"


class TestFakeEngine:
    def test_recognize_returns_result(self) -> None:
        engine = FakeOCREngine()
        image = np.zeros((100, 100), dtype=np.uint8)
        result = engine.recognize(image)
        assert isinstance(result, OCRResult)
        assert result.engine_name == "fake"
        assert len(result.pages) == 1
        assert result.pages[0].page_number == 1

    def test_recognize_uses_default_config(self) -> None:
        engine = FakeOCREngine()
        image = np.zeros((100, 100), dtype=np.uint8)
        result = engine.recognize(image)
        assert isinstance(result, OCRResult)

    def test_recognize_raises_on_image_error(self) -> None:
        engine = FakeOCREngine(raise_error=OCRImageError("bad image"))
        with pytest.raises(OCRImageError):
            engine.recognize(None)

    def test_recognize_raises_on_inference_error(self) -> None:
        engine = FakeOCREngine(raise_error=OCRInferenceError("inference failed"))
        image = np.zeros((10, 10), dtype=np.uint8)
        with pytest.raises(OCRInferenceError):
            engine.recognize(image)

    def test_recognize_raises_on_generic_exception(self) -> None:
        engine = FakeOCREngine(raise_error=RuntimeError("unexpected"))
        with pytest.raises(RuntimeError):
            engine.recognize(np.zeros((10, 10), dtype=np.uint8))


class TestPostprocessInterface:
    def test_postprocess_returns_result(self) -> None:
        engine = FakeOCREngine()
        image = np.zeros((100, 100), dtype=np.uint8)
        raw = engine.recognize(image)
        result = postprocess(raw)
        assert isinstance(result, OCRResult)

    def test_postprocess_passes_result_through(self) -> None:
        engine = FakeOCREngine()
        image = np.zeros((100, 100), dtype=np.uint8)
        raw = engine.recognize(image)
        result = postprocess(raw)
        assert result.engine_name == raw.engine_name
        assert result.pages == raw.pages


class TestExceptions:
    def test_base_exception(self) -> None:
        with pytest.raises(OCRError):
            raise OCRError("base")

    def test_image_error(self) -> None:
        with pytest.raises(OCRImageError):
            raise OCRImageError("bad image")

    def test_engine_unavailable_error(self) -> None:
        with pytest.raises(OCREngineUnavailableError):
            raise OCREngineUnavailableError("missing dependency")

    def test_inference_error(self) -> None:
        with pytest.raises(OCRInferenceError):
            raise OCRInferenceError("failed")

    def test_parsing_error(self) -> None:
        with pytest.raises(OCRParsingError):
            raise OCRParsingError("bad output")

    def test_configuration_error(self) -> None:
        with pytest.raises(OCRConfigurationError):
            raise OCRConfigurationError("bad config")

    def test_exception_hierarchy(self) -> None:
        with pytest.raises(OCRError):
            raise OCRImageError("subclass")
