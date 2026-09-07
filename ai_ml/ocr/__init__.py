"""OCR subpackage."""

from ai_ml.ocr.base import OCREngine
from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord

__all__ = [
    "OCREngine",
    "OCRConfig",
    "OCRWord",
    "OCRLine",
    "OCRBlock",
    "OCRPage",
    "OCRResult",
]
