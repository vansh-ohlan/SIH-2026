"""Upload routes for the backend API gateway."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.app.config import BackendConfig
from backend.app.db import get_db
from backend.app.schemas import (
    BackendErrorResponse,
    HealthResponse,
    AIReadinessResponse,
)
from backend.app.services import AIServiceWrapper, AIServiceError
from backend.app.repositories import LandRecordRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["documents"])

# Default configuration
_config = BackendConfig()


def get_config() -> BackendConfig:
    return _config


def get_ai_service_dep() -> AIServiceWrapper:
    from backend.app.services import get_ai_service
    return get_ai_service()


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Confirm the backend API is alive."""
    return HealthResponse(status="ok", service="bhusetu-backend")


@router.get("/ai/ready", response_model=AIReadinessResponse)
def ai_readiness() -> AIReadinessResponse:
    """Check if the AI service is reachable."""
    try:
        wrapper = get_ai_service_dep()
        wrapper.client  # Force lazy init check
        return AIReadinessResponse(
            status="ready",
            service="bhusetu-backend",
            ai_service_url=wrapper.client.base_url,
        )
    except Exception as exc:
        logger.warning("AI readiness check failed: %s", exc)
        return AIReadinessResponse(
            status="not_ready",
            service="bhusetu-backend",
            error="AI service client not configured",
        )


@router.post(
    "/documents/upload",
    responses={
        200: {"description": "Successful AI inference + persistence"},
        400: {"model": BackendErrorResponse, "description": "Invalid request"},
        413: {"model": BackendErrorResponse, "description": "File too large"},
        422: {"model": BackendErrorResponse, "description": "Unprocessable document"},
        500: {"model": BackendErrorResponse, "description": "AI inference failure"},
        503: {"model": BackendErrorResponse, "description": "AI service unavailable"},
    },
)
async def upload_document(
    file: UploadFile = File(..., description="Scanned RoR / Jamabandi document image"),
    config: BackendConfig = Depends(get_config),
    ai_service: AIServiceWrapper = Depends(get_ai_service_dep),
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Upload a land-record document for AI inference and persistence.

    Flow: Upload → AIInferenceClient → AnalysisResponse → Database → Response

    Args:
        file: Multipart form file (image).
        config: Backend configuration.
        ai_service: AI service wrapper (injectable).
        db: Database session.

    Returns:
        Persisted land record with analysis result.
    """
    # Validate file presence
    if file is None or file.filename is None or file.filename.strip() == "":
        raise HTTPException(
            status_code=400,
            detail={"error": "missing_file", "message": "A file must be provided."},
        )

    suffix = Path(file.filename).suffix.lower()
    if suffix not in config.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "unsupported_file_type",
                "message": f"File type '{suffix}' is not supported. Allowed: {sorted(config.allowed_extensions)}",
            },
        )

    # Read file content
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=422,
            detail={"error": "empty_file", "message": "The uploaded file is empty."},
        )

    if len(content) > config.max_upload_size:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "file_too_large",
                "message": f"Uploaded file exceeds the maximum size of {config.max_upload_size} bytes.",
            },
        )

    # Save to temp file for AI client
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix, delete=False
        ) as tmp:
            tmp.write(content)
            temp_path = Path(tmp.name)

        try:
            result = ai_service.infer_document(temp_path)
        except AIServiceError as exc:
            logger.error("AI inference failed: %s", exc)
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "ai_service_unavailable",
                    "message": "AI service is currently unavailable. Please try again later.",
                },
            ) from exc

        # Persist to database
        repo = LandRecordRepository(db)
        try:
            record = repo.create(result)
        except Exception as exc:
            logger.error("Failed to persist land record: %s", exc)
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "persistence_failed",
                    "message": "Failed to store land record.",
                },
            ) from exc

        # Build response
        if hasattr(result, "model_dump"):
            analysis_data = result.model_dump(mode="json")
        else:
            analysis_data = result

        return JSONResponse(
            status_code=200,
            content={
                "record_id": record.id,
                "analysis": analysis_data,
            },
        )
    finally:
        if temp_path is not None and temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass