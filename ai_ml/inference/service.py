"""AI inference service layer.

Provides a clean callable interface over the existing extraction, analysis,
and explainability components.
"""

from __future__ import annotations

from typing import Any, Optional

from ai_ml.analysis.analyzer import Analyzer
from ai_ml.analysis.result import AnalysisResult
from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.pipeline.extraction_pipeline import ExtractionPipeline
from ai_ml.ocr.schema import OCRResult


class InferenceService:
    """High-level AI inference service.

    Orchestrates OCR -> Extraction -> Analysis -> Unified Result.

    Dependencies are injected to avoid hidden global state and to keep
    model initialization lazy.
    """

    def __init__(
        self,
        extraction_pipeline: Optional[ExtractionPipeline] = None,
        analyzer: Optional[Analyzer] = None,
    ) -> None:
        self._extraction_pipeline = extraction_pipeline or ExtractionPipeline()
        self._analyzer = analyzer or Analyzer()

    def infer(self, ocr_result: OCRResult) -> AnalysisResult:
        """Run full AI inference on an OCR result.

        Args:
            ocr_result: OCRResult produced by the OCR layer.

        Returns:
            AnalysisResult containing extraction, validation, confidence,
            risk, anomaly, and explainability outputs.

        Raises:
            InvalidOCRResultError: If the input is not a valid OCRResult.
            RuntimeError: If inference fails for any other reason.
        """
        if ocr_result is None or not isinstance(ocr_result, OCRResult):
            raise InvalidOCRResultError("A valid OCRResult is required for inference.")

        try:
            extraction_result = self._extraction_pipeline.extract(ocr_result)
        except Exception as exc:
            raise RuntimeError(f"Extraction failed during inference: {exc}") from exc

        try:
            analysis_result = self._analyzer.analyze(extraction_result)
        except Exception as exc:
            raise RuntimeError(f"Analysis failed during inference: {exc}") from exc

        return analysis_result
