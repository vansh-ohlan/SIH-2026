"""OCR result schema."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class OCRWord:
    """Represents a single recognized word."""

    text: str
    original_text: Optional[str] = None
    confidence: Optional[float] = None
    bbox: Optional[tuple[int, int, int, int]] = None
    language: Optional[str] = None


@dataclass
class OCRLine:
    """Represents a line of recognized text."""

    line_id: str
    words: list[OCRWord] = field(default_factory=list)
    bbox: Optional[tuple[int, int, int, int]] = None


@dataclass
class OCRBlock:
    """Represents a block of text, often corresponding to a table cell or paragraph."""

    block_id: str
    lines: list[OCRLine] = field(default_factory=list)
    bbox: Optional[tuple[int, int, int, int]] = None


@dataclass
class OCRPage:
    """Represents a single page of OCR results."""

    page_number: int
    blocks: list[OCRBlock] = field(default_factory=list)
    width: Optional[int] = None
    height: Optional[int] = None


@dataclass
class OCRResult:
    """Top-level OCR result container."""

    pages: list[OCRPage] = field(default_factory=list)
    engine_name: Optional[str] = None
    language: Optional[str] = None
    raw_metadata: Optional[dict] = None
