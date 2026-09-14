"""Architecture-level tests for ai_ml.ocr."""

from typing import Optional
from unittest.mock import MagicMock, patch

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
from ai_ml.ocr.paddle_engine import PaddleOCREngine
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


# ---------------------------------------------------------------------------
# Existing architecture tests
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# PaddleOCR adapter tests (mocked — no real PaddleOCR required)
# ---------------------------------------------------------------------------


class _MockResult:
    """Minimal mock for a PaddleOCR 3.x page result object."""

    def __init__(self, json_data: dict):
        self._json = json_data

    @property
    def json(self):
        return self._json


def _make_mock_page(
    texts,
    boxes,
    scores,
    width: int = 100,
    height: int = 200,
    page_index: int = 1,
):
    """Helper to build a mocked PaddleOCR page result."""
    return _MockResult(
        {
            "rec_texts": texts,
            "rec_boxes": boxes,
            "rec_scores": scores,
            "width": width,
            "height": height,
            "page_index": page_index,
            "input_path": "test.png",
        }
    )


class TestPaddleOCREngineInit:
    def test_missing_dependency_raises(self) -> None:
        with patch.dict("sys.modules", {"paddleocr": None}):
            engine = PaddleOCREngine()
            with pytest.raises(OCREngineUnavailableError):
                engine._initialize()

    def test_init_failure_raises(self) -> None:
        mock_cls = MagicMock()
        mock_cls.side_effect = RuntimeError("init failed")
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine()
            with pytest.raises(OCREngineUnavailableError):
                engine._initialize()

    def test_cpu_default(self) -> None:
        mock_cls = MagicMock()
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine(OCRConfig())
            engine._initialize()
            mock_cls.assert_called_once()
            kwargs = mock_cls.call_args.kwargs
            assert kwargs.get("device") == "cpu"

    def test_constructor_does_not_pass_show_log(self) -> None:
        mock_cls = MagicMock()
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine(OCRConfig())
            engine._initialize()
            kwargs = mock_cls.call_args.kwargs
            assert "show_log" not in kwargs


class TestPaddleOCREngineRecognize:
    def test_recognize_with_hindi_config(self) -> None:
        mock_cls = MagicMock()
        mock_cls.return_value.predict.return_value = [
            _make_mock_page(
                texts=["नमस्ते", "दुनिया"],
                boxes=[[[0, 0], [10, 0], [10, 20], [0, 20]], [[20, 0], [40, 0], [40, 20], [20, 20]]],
                scores=[0.95, 0.88],
            )
        ]
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine(OCRConfig(languages=["hi"]))
            image = np.zeros((100, 100), dtype=np.uint8)
            result = engine.recognize(image)
            assert isinstance(result, OCRResult)
            assert result.engine_name == "paddleocr"
            assert result.language == "hi"
            assert len(result.pages) == 1
            assert len(result.pages[0].blocks) == 1
            assert len(result.pages[0].blocks[0].lines) == 2

    def test_recognize_returns_structured_words(self) -> None:
        mock_cls = MagicMock()
        mock_cls.return_value.predict.return_value = [
            _make_mock_page(
                texts=["कृष्ण"],
                boxes=[[[5, 5], [15, 5], [15, 25], [5, 25]]],
                scores=[0.92],
            )
        ]
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine(OCRConfig())
            image = np.zeros((100, 100), dtype=np.uint8)
            result = engine.recognize(image)
            page = result.pages[0]
            line = page.blocks[0].lines[0]
            word = line.words[0]
            assert word.text == "कृष्ण"
            assert word.confidence == 0.92
            assert word.bbox == (5, 5, 15, 25)

    def test_recognize_empty_result(self) -> None:
        mock_cls = MagicMock()
        mock_cls.return_value.predict.return_value = []
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine()
            image = np.zeros((100, 100), dtype=np.uint8)
            result = engine.recognize(image)
            assert isinstance(result, OCRResult)
            assert len(result.pages) == 0

    def test_recognize_invalid_image_raises(self) -> None:
        engine = PaddleOCREngine()
        with pytest.raises(OCRImageError):
            engine.recognize(None)

    def test_recognize_empty_image_raises(self) -> None:
        engine = PaddleOCREngine()
        with pytest.raises(OCRImageError):
            engine.recognize(np.zeros((0, 0), dtype=np.uint8))

    def test_recognize_inference_failure_raises(self) -> None:
        mock_cls = MagicMock()
        mock_cls.return_value.predict.side_effect = RuntimeError("inference failed")
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine()
            image = np.zeros((100, 100), dtype=np.uint8)
            with pytest.raises(OCRInferenceError):
                engine.recognize(image)

    def test_recognize_malformed_output_raises(self) -> None:
        mock_cls = MagicMock()
        mock_cls.return_value.predict.return_value = [_make_mock_page(texts=["x"], boxes=[], scores=[0.5])]
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine()
            image = np.zeros((100, 100), dtype=np.uint8)
            with pytest.raises(OCRParsingError):
                engine.recognize(image)

    def test_recognize_none_result_raises(self) -> None:
        mock_cls = MagicMock()
        mock_cls.return_value.predict.return_value = None
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine()
            image = np.zeros((100, 100), dtype=np.uint8)
            with pytest.raises(OCRInferenceError):
                engine.recognize(image)


class TestPaddleOCREngineOutputConversion:
    def test_quadrilateral_bbox_normalized(self) -> None:
        engine = PaddleOCREngine()
        quad = [[10, 20], [50, 20], [50, 80], [10, 80]]
        assert engine._normalize_bbox(quad) == (10, 20, 50, 80)

    def test_rectangular_bbox_normalized(self) -> None:
        engine = PaddleOCREngine()
        rect = [5, 10, 15, 30]
        assert engine._normalize_bbox(rect) == (5, 10, 15, 30)

    def test_invalid_bbox_returns_none(self) -> None:
        engine = PaddleOCREngine()
        assert engine._normalize_bbox(None) is None
        assert engine._normalize_bbox([1, 2]) is None
        assert engine._normalize_bbox("invalid") is None

    def test_confidence_clamping(self) -> None:
        engine = PaddleOCREngine()
        assert engine._normalize_confidence(0.5) == 0.5
        assert engine._normalize_confidence(1.2) == 1.0
        assert engine._normalize_confidence(-0.1) == 0.0
        assert engine._normalize_confidence(None) is None

    def test_multi_page_result(self) -> None:
        mock_cls = MagicMock()
        mock_cls.return_value.predict.return_value = [
            _make_mock_page(texts=["page1"], boxes=[[[0, 0], [10, 0], [10, 20], [0, 20]]], scores=[0.9], page_index=1),
            _make_mock_page(texts=["page2"], boxes=[[[0, 0], [20, 0], [20, 30], [0, 30]]], scores=[0.85], page_index=2),
        ]
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            engine = PaddleOCREngine()
            image = np.zeros((100, 100), dtype=np.uint8)
            result = engine.recognize(image)
            assert len(result.pages) == 2
            assert result.pages[0].page_number == 1
            assert result.pages[1].page_number == 2
            assert result.pages[0].blocks[0].lines[0].words[0].text == "page1"
            assert result.pages[1].blocks[0].lines[0].words[0].text == "page2"

    def test_retain_raw_output(self) -> None:
        mock_cls = MagicMock()
        mock_cls.return_value.predict.return_value = [
            _make_mock_page(texts=["x"], boxes=[[[0, 0], [10, 0], [10, 20], [0, 20]]], scores=[0.9])
        ]
        with patch.dict("sys.modules", {"paddleocr": MagicMock(PaddleOCR=mock_cls)}):
            config = OCRConfig(retain_raw_output=True)
            engine = PaddleOCREngine(config)
            image = np.zeros((100, 100), dtype=np.uint8)
            result = engine.recognize(image)
            assert result.raw_metadata is not None
            assert result.raw_metadata["engine"] == "paddleocr"

    def test_hindi_language_resolution(self) -> None:
        engine = PaddleOCREngine()
        assert engine._resolve_language(["hi"]) == "hi"
        assert engine._resolve_language(["en"]) == "en"
        assert engine._resolve_language(["hi", "en"]) == "hi"
        assert engine._resolve_language([]) == "hi"
        assert engine._resolve_language(["latin"]) == "latin"


# ---------------------------------------------------------------------------
# Post-processing tests
# ---------------------------------------------------------------------------


def _make_result(words) -> OCRResult:
    """Helper to build a minimal OCRResult from a list of (text, confidence, bbox)."""
    word_objs = []
    for idx, (text, confidence, bbox) in enumerate(words, start=1):
        word_objs.append(
            OCRWord(
                text=text,
                confidence=confidence,
                bbox=bbox,
                language="hi" if any("\u0900" <= ch <= "\u097F" for ch in text) else "en",
            )
        )
    line = OCRLine(line_id="line-1", words=word_objs, bbox=(0, 0, 100, 100))
    block = OCRBlock(block_id="block-1", lines=[line], bbox=(0, 0, 100, 100))
    page = OCRPage(page_number=1, blocks=[block], width=100, height=100)
    return OCRResult(pages=[page], engine_name="test", language="hi")


class TestPostprocessUnicodeNormalization:
    def test_nfc_normalization(self) -> None:
        result = _make_result([("नमस्ते", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "नमस्ते"

    def test_mixed_hindi_english_preserved(self) -> None:
        result = _make_result([("जिला Jaipur", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert "जिला" in word.text
        assert "Jaipur" in word.text

    def test_devanagari_not_transliterated(self) -> None:
        result = _make_result([("खसरा", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "खसरा"


class TestPostprocessWhitespace:
    def test_repeated_spaces_collapsed(self) -> None:
        result = _make_result([("नमस्ते   दुनिया", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "नमस्ते दुनिया"

    def test_leading_trailing_whitespace_removed(self) -> None:
        result = _make_result([("  नमस्ते  ", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "नमस्ते"

    def test_newline_normalized(self) -> None:
        result = _make_result([("नमस्ते\nदुनिया", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert "\n" not in word.text
        assert word.text == "नमस्ते दुनिया"


class TestPostprocessPunctuation:
    def test_repeated_punctuation_collapsed(self) -> None:
        result = _make_result([("विवरण!!", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "विवरण!"

    def test_numeric_slash_preserved(self) -> None:
        result = _make_result([("142/1", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "142/1"

    def test_numeric_hyphen_preserved(self) -> None:
        result = _make_result([("2-5-10", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "2-5-10"


class TestPostprocessNumericPreservation:
    def test_integer_preserved(self) -> None:
        result = _make_result([("123", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "123"

    def test_decimal_preserved(self) -> None:
        result = _make_result([("2.5", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "2.5"

    def test_fraction_slash_preserved(self) -> None:
        result = _make_result([("1/2", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "1/2"

    def test_khasra_number_preserved(self) -> None:
        result = _make_result([("247/2/3", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "247/2/3"


class TestPostprocessEmptyElements:
    def test_empty_word_removed(self) -> None:
        result = _make_result([("नमस्ते", 0.9, (0, 0, 10, 20)), ("", 0.5, (10, 0, 20, 20))])
        processed = postprocess(result)
        words = processed.pages[0].blocks[0].lines[0].words
        assert len(words) == 1
        assert words[0].text == "नमस्ते"

    def test_whitespace_only_word_removed(self) -> None:
        result = _make_result([("नमस्ते", 0.9, (0, 0, 10, 20)), ("   ", 0.5, (10, 0, 20, 20))])
        processed = postprocess(result)
        words = processed.pages[0].blocks[0].lines[0].words
        assert len(words) == 1

    def test_empty_line_removed(self) -> None:
        words = [OCRWord(text="", confidence=0.5, bbox=(0, 0, 10, 20))]
        line = OCRLine(line_id="line-empty", words=words, bbox=(0, 0, 10, 20))
        block = OCRBlock(block_id="block-1", lines=[line], bbox=(0, 0, 10, 20))
        page = OCRPage(page_number=1, blocks=[block], width=100, height=100)
        result = OCRResult(pages=[page], engine_name="test", language="hi")
        processed = postprocess(result)
        assert len(processed.pages) == 1
        assert len(processed.pages[0].blocks) == 1
        assert len(processed.pages[0].blocks[0].lines) == 1
        assert processed.pages[0].blocks[0].lines[0].words == []


class TestPostprocessConfidence:
    def test_confidence_preserved(self) -> None:
        result = _make_result([("नमस्ते", 0.87, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.confidence == 0.87

    def test_none_confidence_preserved(self) -> None:
        result = _make_result([("नमस्ते", None, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.confidence is None


class TestPostprocessBoundingBox:
    def test_bbox_preserved(self) -> None:
        bbox = (5, 10, 15, 30)
        result = _make_result([("नमस्ते", 0.9, bbox)])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.bbox == bbox

    def test_page_dimensions_preserved(self) -> None:
        result = _make_result([("नमस्ते", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        page = processed.pages[0]
        assert page.width == 100
        assert page.height == 100
        assert page.page_number == 1


class TestPostprocessOriginalTextAuditability:
    def test_original_text_preserved_when_changed(self) -> None:
        result = _make_result([("नमस्ते   दुनिया", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "नमस्ते दुनिया"
        assert word.original_text == "नमस्ते   दुनिया"

    def test_original_text_none_when_unchanged(self) -> None:
        result = _make_result([("नमस्ते", 0.9, (0, 0, 10, 20))])
        processed = postprocess(result)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.text == "नमस्ते"
        assert word.original_text is None

    def test_original_text_can_be_disabled(self) -> None:
        from ai_ml.ocr.postprocess import PostprocessConfig
        result = _make_result([("नमस्ते   दुनिया", 0.9, (0, 0, 10, 20))])
        config = PostprocessConfig(retain_original_text=False)
        processed = postprocess(result, config=config)
        word = processed.pages[0].blocks[0].lines[0].words[0]
        assert word.original_text is None


class TestPostprocessIdempotence:
    def test_double_postprocess_is_stable(self) -> None:
        result = _make_result([("नमस्ते   दुनिया", 0.9, (0, 0, 10, 20))])
        processed_once = postprocess(result)
        processed_twice = postprocess(processed_once)
        word1 = processed_once.pages[0].blocks[0].lines[0].words[0]
        word2 = processed_twice.pages[0].blocks[0].lines[0].words[0]
        assert word1.text == word2.text
        assert word1.confidence == word2.confidence
