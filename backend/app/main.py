"""FastAPI application factory for the backend API gateway."""

from __future__ import annotations

from fastapi import FastAPI

from backend.app.config import BackendConfig
from backend.app.routes import router, get_config


def create_app(config: BackendConfig = None) -> FastAPI:
    """Create and configure the FastAPI application.

    Args:
        config: Optional backend configuration. Uses defaults if not provided.

    Returns:
        FastAPI application instance.
    """
    application = FastAPI(
        title="Bhu-Setu Backend API Gateway",
        description="Accepts land-record document uploads and delegates AI inference.",
        version="0.1.0",
    )

    application.include_router(router)

    if config is not None:
        application.dependency_overrides[get_config] = lambda: config

    return application