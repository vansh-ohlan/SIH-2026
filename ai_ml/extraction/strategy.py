"""Extraction strategy abstraction."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from ai_ml.ocr.schema import OCRResult
from ai_ml.extraction.exceptions import ExtractionConfigurationError, ExtractionFailureError
from ai_ml.extraction.schema import ExtractionResult


class ExtractionStrategy(ABC):
    """Abstract base class for extraction strategies.

    Each strategy implements a different approach to mapping OCR results
    to structured RoR fields. The extraction pipeline can combine multiple
    strategies.
    """

    @abstractmethod
    def extract(
        self,
        ocr_result: OCRResult,
        config: Optional[dict] = None,
    ) -> ExtractionResult:
        """Extract structured fields from an OCR result.

        Args:
            ocr_result: Processed OCR result from the OCR engine.
            config: Optional strategy-specific configuration.

        Returns:
            ExtractionResult containing the structured record.

        Raises:
            ExtractionFailureError: If extraction fails.
            ExtractionConfigurationError: If the configuration is invalid.
        """
        raise NotImplementedError
