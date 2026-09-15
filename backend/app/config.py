"""Backend configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass
class BackendConfig:
    """Backend API gateway configuration."""

    ai_service_url: str = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
    ai_timeout: float = float(os.getenv("AI_TIMEOUT", "60.0"))
    max_upload_size: int = int(os.getenv("MAX_UPLOAD_SIZE", str(20 * 1024 * 1024)))
    allowed_extensions: tuple[str, ...] = (
        ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif",
    )
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./bhusetu_dev.db",
    )