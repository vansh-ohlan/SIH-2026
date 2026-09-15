"""OCR engine configuration."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class OCRConfig:
    """Configuration for an OCR engine invocation."""

    languages: list[str] = None
    confidence_threshold: float = 0.0
    require_bboxes: bool = True
    retain_raw_output: bool = False
    device: str | None = None
    document_id: str | None = None

    def __post_init__(self) -> None:
        if self.languages is None:
            self.languages = ["hi", "en"]
