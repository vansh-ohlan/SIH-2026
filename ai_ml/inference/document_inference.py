"""Document-level AI inference adapter.

Provides the smallest clean orchestration layer between raw image/document
input and the existing AI pipeline:

    image path -> preprocessing -> OCR -> InferenceService -> AnalysisResult
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Union

import numpy as np

from ai_ml.analysis.analyzer import Analyzer
from ai_ml.analysis.result import AnalysisResult
from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.pipeline.extraction_pipeline import ExtractionPipeline
from ai_ml.inference.service import InferenceService
from ai_ml.ocr.base import OCREngine
from ai_ml.ocr.schema import OCRResult
from ai_ml.preprocessing.pipeline import run as run_preprocessing


class DocumentAIInference:
    """High-level document AI inference.

    Orchestrates:
    image path -> preprocessing -> OCR -> InferenceService -> AnalysisResult

    All heavy dependencies are injected. No global state is created at
    import time.
    """

    def __init__(
        self,
        ocr_engine: Optional[OCREngine] = None,
        extraction_pipeline: Optional[ExtractionPipeline] = None,
        analyzer: Optional[Analyzer] = None,
    ) -> None:
        self._ocr_engine = ocr_engine
        self._inference_service = InferenceService(
            extraction_pipeline=extraction_pipeline,
            analyzer=analyzer,
        )

    def infer(self, image_path: Union[str, Path]) -> AnalysisResult:
        """Run full document AI inference on an image file.

        Args:
            image_path: Path to the input image file.

        Returns:
            AnalysisResult containing extraction, validation, confidence,
            risk, anomaly, and explainability outputs.

        Raises:
            ValueError: If the image path is invalid.
            RuntimeError: If preprocessing, OCR, or inference fails.
        """
        if image_path is None:
            raise ValueError("image_path must not be None.")

        path = Path(image_path)
        if not path.exists():
            raise ValueError(f"Image file does not exist: {path}")
        if not path.is_file():
            raise ValueError(f"Image path is not a file: {path}")

        try:
            preprocessed = run_preprocessing(str(path))
        except Exception as exc:
            raise RuntimeError(f"Preprocessing failed for '{path}': {exc}") from exc

        if preprocessed.image is None or not isinstance(preprocessed.image, np.ndarray):
            raise RuntimeError(
                f"Preprocessing returned an invalid image for '{path}'."
            )

        if self._ocr_engine is None:
            raise RuntimeError(
                "No OCR engine provided. Inject an OCREngine instance."
            )

        try:
            ocr_result = self._ocr_engine.recognize(preprocessed.image)
        except Exception as exc:
            raise RuntimeError(
                f"OCR failed for '{path}': {exc}"
            ) from exc

        if ocr_result is None or not isinstance(ocr_result, OCRResult):
            raise RuntimeError(
                f"OCR engine returned an invalid result for '{path}'."
            )

        try:
            return self._inference_service.infer(ocr_result)
        except Exception as exc:
            raise RuntimeError(
                f"Inference failed for '{path}': {exc}"
            ) from exc
