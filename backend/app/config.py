"""Backend configuration."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class BackendConfig:
    """Backend API gateway configuration."""

    ai_service_url: str = "http://localhost:8000"
    ai_timeout: float = 60.0
    max_upload_size: int = 20 * 1024 * 1024  # 20 MB
    allowed_extensions: tuple[str, ...] = (
        ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif",
    )