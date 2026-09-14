"""FastAPI routes for AI inference."""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ai_ml.analysis.result import AnalysisResult
from ai_ml.api.config import APIConfig
from ai_ml.api.schemas import AnalysisResponseSchema, ErrorResponseSchema, HealthResponseSchema, ReadinessResponseSchema
from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.inference.document_inference import DocumentAIInference
from ai_ml.ocr.exceptions import OCREngineUnavailableError
from ai_ml.ocr.paddle_engine import PaddleOCREngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["inference"])

# Default API configuration. Override via dependency injection in production.
_api_config = APIConfig()


def _get_document_inference_service() -> DocumentAIInference:
    raise NotImplementedError("Document inference service dependency not configured.")


def _get_api_config() -> APIConfig:
    return _api_config


def _serialize_analysis_result(result: AnalysisResult) -> dict[str, Any]:
    return result.model_dump(mode="json")


def _check_paddleocr_importable() -> bool:
    try:
        import paddleocr  # noqa: F401
        return True
    except ImportError:
        return False


def _check_preprocessing_importable() -> bool:
    try:
        from ai_ml.preprocessing.pipeline import run as _run  # noqa: F401
        return True
    except ImportError:
        return False


def _check_extraction_importable() -> bool:
    try:
        from ai_ml.extraction.pipeline import ExtractionPipeline  # noqa: F401
        return True
    except ImportError:
        return False


def _check_anomaly_importable() -> bool:
    try:
        from ai_ml.anomaly.isolation_forest import AnomalyModel  # noqa: F401
        return True
    except ImportError:
        return False


def _check_explainability_importable() -> bool:
    try:
        from ai_ml.anomaly.explainer import Explainer  # noqa: F401
        return True
    except ImportError:
        return False


@router.get("/health", response_model=HealthResponseSchema, tags=["health"])
def health_check() -> HealthResponseSchema:
    """Confirm the API process is alive."""
    return HealthResponseSchema(status="ok", service="ai-ml-inference")


@router.get("/ready", response_model=ReadinessResponseSchema, tags=["health"])
def readiness_check() -> ReadinessResponseSchema:
    """Report whether required AI dependencies are available.

    This endpoint performs cheap import-time checks only. It does not
    download models, run OCR, or perform expensive inference.
    """
    checks: dict[str, Any] = {}

    checks["paddleocr_importable"] = _check_paddleocr_importable()
    checks["preprocessing_available"] = _check_preprocessing_importable()
    checks["extraction_available"] = _check_extraction_importable()
    checks["anomaly_available"] = _check_anomaly_importable()
    checks["explainability_available"] = _check_explainability_importable()

    try:
        from ai_ml.ocr.paddle_engine import PaddleOCREngine
        from ai_ml.ocr.config import OCRConfig
        engine = PaddleOCREngine(config=OCRConfig())
        checks["ocr_engine_configured"] = True
        checks["ocr_engine_initialized"] = engine._paddle_ocr is not None
    except (ImportError, OCREngineUnavailableError, Exception):
        checks["ocr_engine_configured"] = False
        checks["ocr_engine_initialized"] = False

    all_ready = all(
        v is True
        for k, v in checks.items()
        if k in {
            "paddleocr_importable",
            "preprocessing_available",
            "extraction_available",
            "anomaly_available",
            "explainability_available",
        }
    )

    status = "ready" if all_ready else "not_ready"

    return ReadinessResponseSchema(
        status=status,
        service="ai-ml-inference",
        checks=checks,
    )


@router.post(
    "/inference/document",
    responses={
        200: {"model": AnalysisResponseSchema, "description": "Successful inference"},
        400: {"model": ErrorResponseSchema, "description": "Invalid request"},
        422: {"model": ErrorResponseSchema, "description": "Unprocessable document"},
        500: {"model": ErrorResponseSchema, "description": "Internal inference failure"},
    },
    summary="Run document AI inference on an uploaded image",
    description=(
        "Accepts an image file, runs preprocessing, OCR, extraction, "
        "validation, confidence/risk scoring, anomaly detection, and "
        "explainability, then returns a unified analysis result."
    ),
)
async def infer_document(
    file: UploadFile = File(..., description="Image file to process (png, jpg, jpeg, bmp, tiff)"),
    document_inference_service: DocumentAIInference = Depends(_get_document_inference_service),
    api_config: APIConfig = Depends(_get_api_config),
) -> JSONResponse:
    """Run document AI inference on an uploaded image file."""
    if file is None or file.filename is None or file.filename.strip() == "":
        raise HTTPException(
            status_code=400,
            detail={
                "error": "missing_file",
                "message": "A file must be provided in the 'file' field.",
            },
        )

    suffix = Path(file.filename).suffix.lower()
    if suffix not in api_config.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "unsupported_file_type",
                "message": f"File type '{suffix}' is not supported. Allowed: {sorted(api_config.allowed_extensions)}",
            },
        )

    temp_path: Optional[Path] = None
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "empty_file",
                    "message": "The uploaded file is empty.",
                },
            )

        if len(content) > api_config.max_upload_size:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "file_too_large",
                    "message": f"Uploaded file exceeds the maximum size of {api_config.max_upload_size} bytes.",
                },
            )

        temp_path = Path(file.filename)
        temp_path.write_bytes(content)

        result = document_inference_service.infer(temp_path)
        return JSONResponse(
            status_code=200,
            content=_serialize_analysis_result(result),
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_input",
                "message": str(exc),
            },
        ) from exc
    except InvalidOCRResultError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "unreadable_document",
                "message": str(exc),
            },
        ) from exc
    except RuntimeError as exc:
        logger.error("Document inference failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "inference_failure",
                "message": "Document inference failed.",
            },
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error during inference: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": "An unexpected error occurred during inference.",
            },
        ) from exc
    finally:
        if temp_path is not None and temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass
