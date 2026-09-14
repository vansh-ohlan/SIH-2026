"""PaddleOCR adapter for the ai_ml OCR abstraction."""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.exceptions import (
    OCREngineUnavailableError,
    OCRImageError,
    OCRInferenceError,
    OCRParsingError,
)
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
from ai_ml.ocr.base import OCREngine

logger = logging.getLogger(__name__)

_LANGUAGE_CODE_MAP = {
    "hi": "hi",
    "en": "en",
    "hi+en": "hi+en",
    "latin": "latin",
    "devanagari": "devanagari",
}


class PaddleOCREngine(OCREngine):
    """OCR engine backed by PaddleOCR.

    This adapter wraps PaddleOCR (planned primary engine) behind the
    project's OCREngine interface. It uses lazy imports so that importing
    ai_ml.ocr does not require PaddleOCR to be installed.

    CPU-first: uses CPU inference by default. GPU can be enabled via
    OCRConfig.device="gpu", but this is not tested and may require
    paddlepaddle-gpu.
    """

    def __init__(self, config: Optional[OCRConfig] = None) -> None:
        self._paddle_ocr = None
        self._config = config or OCRConfig()

    def _initialize(self) -> None:
        """Lazily initialize the PaddleOCR instance."""
        if self._paddle_ocr is not None:
            return

        try:
            from paddleocr import PaddleOCR  # type: ignore[import-untyped]
        except ImportError as exc:
            raise OCREngineUnavailableError(
                "PaddleOCR is not installed. Install it with: "
                "pip install paddleocr"
            ) from exc

        lang = self._resolve_language(self._config.languages)

        try:
            self._paddle_ocr = PaddleOCR(
                lang=lang,
                device="cpu",
            )
        except Exception as exc:
            raise OCREngineUnavailableError(
                f"Failed to initialize PaddleOCR: {exc}"
            ) from exc

    @staticmethod
    def _resolve_language(languages: list[str]) -> str:
        """Map our language codes to a PaddleOCR language identifier.

        Args:
            languages: List of language codes from OCRConfig.

        Returns:
            PaddleOCR-compatible language string.
        """
        if not languages:
            return "hi"

        primary = languages[0].lower()
        return _LANGUAGE_CODE_MAP.get(primary, primary)

    def recognize(self, image: np.ndarray, config: Optional[OCRConfig] = None) -> OCRResult:
        """Run PaddleOCR on a preprocessed image.

        Args:
            image: Preprocessed image as a NumPy array (grayscale uint8 or BGR).
            config: OCR configuration. Uses engine defaults if not provided.

        Returns:
            Structured OCRResult containing recognized text and metadata.

        Raises:
            OCRImageError: If the input image is invalid.
            OCRConfigurationError: If the configuration is invalid.
            OCRInferenceError: If inference fails.
        """
        if config is not None:
            self._config = config

        if image is None or not isinstance(image, np.ndarray):
            raise OCRImageError("PaddleOCR requires a NumPy ndarray image.")

        if image.size == 0:
            raise OCRImageError("Cannot run OCR on an empty image.")

        self._initialize()

        try:
            raw_results = self._paddle_ocr.predict(input=image)
        except OCREngineUnavailableError:
            raise
        except Exception as exc:
            raise OCRInferenceError(f"PaddleOCR inference failed: {exc}") from exc

        if raw_results is None:
            raise OCRInferenceError("PaddleOCR returned no results.")

        try:
            return self._convert_results(raw_results)
        except (OCRInferenceError, OCRParsingError):
            raise
        except Exception as exc:
            raise OCRParsingError(f"Failed to parse PaddleOCR output: {exc}") from exc

    def _convert_results(self, raw_results: list) -> OCRResult:
        """Convert PaddleOCR output to our OCRResult schema.

        Args:
            raw_results: Raw PaddleOCR predict() output.

        Returns:
            Structured OCRResult.
        """
        pages: list[OCRPage] = []

        for page_index, raw_page in enumerate(raw_results, start=1):
            page_data = self._extract_page_data(raw_page, page_index)
            blocks = [self._build_block(page_data, block_index=1)]
            width = int(getattr(page_data, "get", lambda *_: None)("width") or 0)
            height = int(getattr(page_data, "get", lambda *_: None)("height") or 0)
            pages.append(
                OCRPage(
                    page_number=page_index,
                    blocks=blocks,
                    width=width or None,
                    height=height or None,
                )
            )

        raw_metadata = None
        if self._config.retain_raw_output:
            raw_metadata = {
                "engine": "paddleocr",
                "language": self._resolve_language(self._config.languages),
            }

        return OCRResult(
            pages=pages,
            engine_name="paddleocr",
            language=self._config.languages[0] if self._config.languages else "hi",
            raw_metadata=raw_metadata,
        )

    def _extract_page_data(self, raw_page, page_index: int) -> dict:
        """Extract a dict of page data from a PaddleOCR result object.

        PaddleOCR 3.x result objects expose a ``.json`` attribute or dict-like
        access. We normalize both into a dictionary.

        Args:
            raw_page: Raw PaddleOCR result for one page.
            page_index: 1-based page number.

        Returns:
            Dictionary with rec_texts, rec_boxes, rec_scores, rec_polys.
        """
        if hasattr(raw_page, "json"):
            page_data = raw_page.json
        elif isinstance(raw_page, dict):
            page_data = raw_page
        else:
            raise OCRParsingError(
                f"Unsupported PaddleOCR page result type: {type(raw_page)}"
            )

        if not isinstance(page_data, dict):
            raise OCRParsingError(
                f"PaddleOCR page data is not a dict: {type(page_data)}"
            )

        required_keys = {"rec_texts", "rec_boxes", "rec_scores"}
        missing = required_keys - set(page_data.keys())
        if missing:
            raise OCRParsingError(
                f"PaddleOCR page data missing keys: {missing}"
            )

        return page_data

    def _build_block(self, page_data: dict, block_index: int) -> OCRBlock:
        """Build a single OCRBlock from page-level PaddleOCR data.

        PaddleOCR returns line-level results. We map each recognized line to
        one OCRLine containing a single OCRWord. Block and line IDs are
        synthetic because PaddleOCR does not provide them.

        Args:
            page_data: Parsed page dictionary.
            block_index: 1-based block number.

        Returns:
            OCRBlock containing all recognized lines for this page.
        """
        texts = page_data.get("rec_texts", [])
        boxes = page_data.get("rec_boxes", [])
        scores = page_data.get("rec_scores", [])

        if not texts:
            return OCRBlock(block_id=f"block-{block_index}", lines=[])

        if len(texts) != len(boxes) or len(texts) != len(scores):
            raise OCRParsingError(
                "PaddleOCR output has mismatched text, box, and score counts: "
                f"{len(texts)}, {len(boxes)}, {len(scores)}"
            )

        lines: list[OCRLine] = []
        for line_index, (text, box, score) in enumerate(zip(texts, boxes, scores), start=1):
            bbox = self._normalize_bbox(box)
            confidence = self._normalize_confidence(score)
            word = OCRWord(
                text=str(text),
                confidence=confidence,
                bbox=bbox,
                language=self._config.languages[0] if self._config.languages else None,
            )
            line = OCRLine(
                line_id=f"line-{line_index}",
                words=[word],
                bbox=bbox,
            )
            lines.append(line)

        return OCRBlock(block_id=f"block-{block_index}", lines=lines)

    @staticmethod
    def _normalize_bbox(box) -> Optional[tuple[int, int, int, int]]:
        """Normalize a PaddleOCR bounding box to (x1, y1, x2, y2).

        PaddleOCR returns quadrilateral boxes as lists of 4 points. We
        convert them to axis-aligned bounding rectangles. If the input is
        already rectangular, it is normalized to integer coordinates.

        Args:
            box: PaddleOCR bounding box (quadrilateral or rectangle).

        Returns:
            Normalized bbox as (x1, y1, x2, y2), or None if invalid.
        """
        if box is None:
            return None

        try:
            flat: list[float] = []
            if isinstance(box, (list, tuple)) and len(box) == 4:
                for point in box:
                    if isinstance(point, (list, tuple)) and len(point) >= 2:
                        flat.extend([float(point[0]), float(point[1])])
                    else:
                        flat.append(float(point))
            elif isinstance(box, (list, tuple)) and len(box) >= 4:
                flat = [float(v) for v in box[:4]]

            if len(flat) < 4:
                return None

            xs = flat[0::2]
            ys = flat[1::2]
            x1 = int(min(xs))
            y1 = int(min(ys))
            x2 = int(max(xs))
            y2 = int(max(ys))

            if x2 < x1 or y2 < y1:
                return None

            return (x1, y1, x2, y2)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _normalize_confidence(score: Optional[float]) -> Optional[float]:
        """Normalize confidence to [0.0, 1.0].

        PaddleOCR already returns confidence in [0.0, 1.0], so we mostly
        validate the range.

        Args:
            score: Raw confidence score.

        Returns:
            Normalized confidence, or None if unavailable.
        """
        if score is None:
            return None
        try:
            confidence = float(score)
        except (TypeError, ValueError):
            return None
        return max(0.0, min(1.0, confidence))
