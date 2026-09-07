"""OCR post-processing interface."""

from typing import Optional

from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.exceptions import OCRConfigurationError
from ai_ml.ocr.schema import OCRResult


def postprocess(result: OCRResult, config: Optional[OCRConfig] = None) -> OCRResult:
    """Post-process raw OCR results.

    This function is intentionally a placeholder. Future implementations may:
    - Merge hyphenated / line-wrapped words
    - Normalize Devanagari numerals and date formats
    - Reorder or merge lines/blocks based on reading order
    - Filter low-confidence words
    - Normalize spacing and punctuation

    Args:
        result: Raw OCRResult from the engine.
        config: OCR configuration. Uses defaults if not provided.

    Returns:
        Post-processed OCRResult.

    Raises:
        OCRConfigurationError: If the configuration is invalid.
    """
    if config is None:
        from ai_ml.ocr.config import OCRConfig
        config = OCRConfig()

    return result
