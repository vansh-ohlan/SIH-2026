"""API configuration for the AI inference service."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class APIConfig:
    """Configuration for the AI inference API.

    All values are safe defaults. Override at application startup if needed.
    """

    max_upload_size: int = 20 * 1024 * 1024  # 20 MB
    allowed_mime_prefixes: tuple[str, ...] = field(
        default_factory=lambda: ("image/",)
    )
    allowed_extensions: tuple[str, ...] = field(
        default_factory=lambda: (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif")
    )
