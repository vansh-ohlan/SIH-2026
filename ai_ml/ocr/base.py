"""Abstract base class for OCR engines."""

from abc import ABC, abstractmethod
from typing import Optional

import numpy as np

from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.exceptions import OCRConfigurationError, OCRImageError, OCRInferenceError
from ai_ml.ocr.schema import OCRResult


class OCREngine(ABC):
    """Abstract interface for OCR engines.

    All OCR engines must implement the `recognize` method, accepting a
    preprocessed image and returning a structured OCRResult.
    """

    @abstractmethod
    def recognize(self, image: np.ndarray, config: Optional[OCRConfig] = None) -> OCRResult:
        """Run OCR on a preprocessed image.

        Args:
            image: Preprocessed image as a NumPy array (typically grayscale uint8).
            config: OCR configuration. Uses engine defaults if not provided.

        Returns:
            Structured OCRResult containing recognized text and metadata.

        Raises:
            OCRImageError: If the input image is invalid.
            OCRConfigurationError: If the configuration is invalid.
            OCRInferenceError: If inference fails.
        """
        raise NotImplementedError
