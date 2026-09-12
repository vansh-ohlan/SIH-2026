"""FastAPI routes for AI inference."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ai_ml.analysis.result import AnalysisResult
from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.inference.document_inference import DocumentAIInference
from ai_ml.api.schemas import AnalysisResponseSchema, ErrorResponseSchema, HealthResponseSchema


router = APIRouter(prefix="/api/v1", tags=["inference"])


def _get_document_inference_service() -> DocumentAIInference:
    raise NotImplementedError("Document inference service dependency not configured.")


def _serialize_analysis_result(result: AnalysisResult) -> dict[str, Any]:
    return result.model_dump(mode="json")


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
    allowed_suffixes = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif"}
    if suffix not in allowed_suffixes:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "unsupported_file_type",
                "message": f"File type '{suffix}' is not supported. Allowed: {sorted(allowed_suffixes)}",
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
        raise HTTPException(
            status_code=500,
            detail={
                "error": "inference_failure",
                "message": "Document inference failed.",
            },
        ) from exc
    except Exception as exc:
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


@router.get("/health", response_model=HealthResponseSchema, tags=["health"])
def health_check() -> HealthResponseSchema:
    return HealthResponseSchema(status="ok", service="ai-ml-inference")
