"""Real OCR validation utilities for local developer testing."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Optional

import numpy as np

from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.exceptions import OCREngineUnavailableError
from ai_ml.ocr.paddle_engine import PaddleOCREngine
from ai_ml.ocr.postprocess import postprocess, PostprocessConfig
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
from ai_ml.preprocessing.pipeline import run as run_preprocessing, PreprocessConfig

logger = logging.getLogger(__name__)


class OCRValidationUnavailableError(Exception):
    """Raised when real OCR validation cannot run due to missing dependencies."""


def _check_paddleocr_available() -> bool:
    """Check if PaddleOCR is importable without side effects."""
    try:
        import paddleocr  # noqa: F401
        return True
    except ImportError:
        return False


def validate_ocr_on_image(
    image_path: str | Path,
    languages: Optional[list[str]] = None,
    apply_postprocess: bool = True,
) -> dict[str, Any]:
    """Run real OCR validation on a local image.

    This utility is intended for local developer validation only.
    It is not part of the automated test suite and requires PaddleOCR
    to be installed.

    Args:
        image_path: Path to a local image file.
        languages: OCR language codes. Defaults to ["hi", "en"].
        apply_postprocess: Whether to run OCR post-processing.

    Returns:
        Dict with OCR validation results and statistics.

    Raises:
        OCRValidationUnavailableError: If PaddleOCR is not installed.
        ValueError: If the image path is invalid.
    """
    if not _check_paddleocr_available():
        raise OCRValidationUnavailableError(
            "PaddleOCR is not installed. "
            "Install it with: pip install paddleocr\n"
            "Note: PaddleOCR downloads models on first use. "
            "This validation utility is for local use only."
        )

    path = Path(image_path)
    if not path.exists():
        raise ValueError(f"Image file does not exist: {path}")
    if not path.is_file():
        raise ValueError(f"Path is not a file: {path}")

    languages = languages or ["hi", "en"]
    ocr_config = OCRConfig(languages=languages)
    ocr_engine = PaddleOCREngine(config=ocr_config)
    preprocess_config = PreprocessConfig()

    try:
        preprocessed = run_preprocessing(str(path), config=preprocess_config)
    except Exception as exc:
        logger.error("Preprocessing failed for %s: %s", path, exc)
        raise

    image = preprocessed.image
    if image is None or not isinstance(image, np.ndarray):
        raise ValueError("Preprocessing returned an invalid image.")

    try:
        ocr_result = ocr_engine.recognize(image)
    except Exception as exc:
        logger.error("OCR failed for %s: %s", path, exc)
        raise

    if apply_postprocess:
        try:
            ocr_result = postprocess(ocr_result, config=PostprocessConfig())
        except Exception as exc:
            logger.warning("Post-processing failed for %s: %s", path, exc)

    stats = _compute_ocr_stats(ocr_result)
    stats["preprocessing_metadata"] = preprocessed.metadata
    stats["image_path"] = str(path)
    stats["languages"] = languages

    return stats


def _compute_ocr_stats(ocr_result: OCRResult) -> dict[str, Any]:
    """Compute statistics from an OCR result."""
    total_pages = len(ocr_result.pages)
    total_blocks = 0
    total_lines = 0
    total_words = 0
    confidences: list[float] = []
    texts: list[str] = []
    words_detail: list[dict[str, Any]] = []

    for page in ocr_result.pages:
        for block in page.blocks:
            total_blocks += 1
            for line in block.lines:
                total_lines += 1
                for word in line.words:
                    total_words += 1
                    if word.confidence is not None:
                        confidences.append(word.confidence)
                    texts.append(word.text)
                    words_detail.append({
                        "text": word.text,
                        "confidence": word.confidence,
                        "bbox": word.bbox,
                        "language": word.language,
                        "page": page.page_number,
                    })

    avg_confidence = sum(confidences) / len(confidences) if confidences else None
    min_confidence = min(confidences) if confidences else None
    max_confidence = max(confidences) if confidences else None

    return {
        "engine_name": ocr_result.engine_name,
        "language": ocr_result.language,
        "total_pages": total_pages,
        "total_blocks": total_blocks,
        "total_lines": total_lines,
        "total_words": total_words,
        "unique_texts": len(set(texts)),
        "avg_confidence": avg_confidence,
        "min_confidence": min_confidence,
        "max_confidence": max_confidence,
        "words": words_detail,
        "raw_text": " ".join(texts),
    }
