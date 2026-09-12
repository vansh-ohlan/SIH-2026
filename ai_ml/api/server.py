"""FastAPI application factory for the AI inference API."""

from __future__ import annotations

from typing import Optional

from fastapi import FastAPI

from ai_ml.api.routes import router, _get_document_inference_service


def create_app(document_inference_service: Optional[object] = None) -> FastAPI:
    """Create and configure the FastAPI application.

    Args:
        document_inference_service: Optional document inference service
            instance. When provided, it is injected into route dependencies
            so tests and deployments can control initialization.

    Returns:
        FastAPI application instance.
    """
    application = FastAPI(
        title="Bhu-Setu AI Inference API",
        description="AI/ML inference endpoints for document understanding.",
        version="0.1.0",
    )

    application.include_router(router)

    if document_inference_service is not None:
        application.dependency_overrides[_get_document_inference_service] = (
            lambda: document_inference_service
        )

    return application
