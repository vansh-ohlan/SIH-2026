"""OCR engine interface.

This module re-exports the OCR engine base class and provides a simple
placeholder for direct use. Actual engine implementations (PaddleOCR,
Tesseract) should subclass OCREngine from base.py.
"""

from ai_ml.ocr.base import OCREngine

__all__ = ["OCREngine"]
