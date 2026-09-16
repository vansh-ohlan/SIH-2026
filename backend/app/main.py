"""FastAPI application factory for the backend API gateway."""

from __future__ import annotations

from fastapi import FastAPI

from backend.app.config import BackendConfig
from backend.app.db import init_db
from backend.app.routes import router, get_config
from backend.app.routes.land import router as land_router
from backend.app.routes.records import router as records_router


def create_app(config: BackendConfig = None, database_url: str = None) -> FastAPI:
    """Create and configure the FastAPI application.

    Args:
        config: Optional backend configuration. Uses defaults if not provided.
        database_url: Optional database URL. Uses default if not provided.

    Returns:
        FastAPI application instance.
    """
    if database_url is not None:
        from backend.app.db import reset_engine
        reset_engine(database_url)

    application = FastAPI(
        title="Bhu-Setu Backend API Gateway",
        description="Accepts land-record document uploads and delegates AI inference.",
        version="0.1.0",
    )

    application.include_router(router)
    application.include_router(records_router)
    application.include_router(land_router)

    if config is not None:
        application.dependency_overrides[get_config] = lambda: config

    init_db()

    return application