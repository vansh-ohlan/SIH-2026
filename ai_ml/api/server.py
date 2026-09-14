"""FastAPI application factory for the AI inference API."""

from __future__ import annotations

from typing import Optional

from fastapi import FastAPI

from ai_ml.api.config import APIConfig
from ai_ml.api.routes import router, _get_document_inference_service, _get_api_config


def create_app(
    document_inference_service: Optional[object] = None,
    api_config: Optional[APIConfig] = None,
) -> FastAPI:
    """Create and configure the FastAPI application.

    Args:
        document_inference_service: Optional document inference service
            instance. When provided, it is injected into route dependencies
            so tests and deployments can control initialization.
        api_config: Optional API configuration. When provided, it is injected
            into route dependencies so tests and deployments can control
            limits and settings.

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

    if api_config is not None:
        application.dependency_overrides[_get_api_config] = lambda: api_config

    return application
