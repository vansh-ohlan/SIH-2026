"""Preprocessing pipeline orchestration."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from ai_ml.preprocessing.cleaner import (
    denoise,
    enhance_contrast,
    remove_table_lines,
    threshold,
    to_grayscale,
)
from ai_ml.preprocessing.deskew import deskew as _deskew
from ai_ml.preprocessing.scanner import load_image


@dataclass
class PreprocessConfig:
    """Configuration for the preprocessing pipeline."""

    denoise_strength: int = 10
    contrast_clip_limit: float = 2.0
    contrast_tile_grid_size: tuple[int, int] = (8, 8)
    apply_threshold: bool = False
    threshold_method: str = "gaussian"
    threshold_block_size: int = 11
    threshold_c: int = 2
    remove_lines: bool = False
    line_horizontal_size: int = 40
    line_vertical_size: int = 40
    line_reprocess_strength: int = 3
    max_deskew_angle: float = 5.0


@dataclass
class PreprocessResult:
    """Result of the preprocessing pipeline."""

    image: np.ndarray
    metadata: dict = field(default_factory=dict)


def run(
    image_path: str,
    config: Optional[PreprocessConfig] = None,
) -> PreprocessResult:
    """Run the full preprocessing pipeline on an input image.

    Pipeline:
    input image -> grayscale -> denoise -> contrast enhancement -> deskew
    -> optional threshold -> optional table-line removal -> output image

    Args:
        image_path: Path to the input image.
        config: Preprocessing configuration. Uses defaults if not provided.

    Returns:
        PreprocessResult containing the processed image and metadata.

    Raises:
        ImageLoadError: If the image cannot be loaded.
        UnsupportedFormatError: If the image format is not supported.
    """
    if config is None:
        config = PreprocessConfig()

    original = load_image(image_path)
    original_shape = original.shape[:2]
    metadata: dict = {
        "original_height": int(original_shape[0]),
        "original_width": int(original_shape[1]),
        "final_height": None,
        "final_width": None,
        "skew_angle": 0.0,
        "applied": [],
    }

    image = to_grayscale(original)
    metadata["applied"].append("grayscale")

    image = denoise(image, strength=config.denoise_strength)
    metadata["applied"].append("denoise")

    image = enhance_contrast(
        image,
        clip_limit=config.contrast_clip_limit,
        tile_grid_size=config.contrast_tile_grid_size,
    )
    metadata["applied"].append("contrast")

    image, skew_angle = _deskew(image, max_angle=config.max_deskew_angle)
    metadata["applied"].append("deskew")
    metadata["skew_angle"] = float(round(skew_angle, 3))

    if config.apply_threshold:
        image = threshold(
            image,
            method=config.threshold_method,
            block_size=config.threshold_block_size,
            c=config.threshold_c,
        )
        metadata["applied"].append("threshold")

    if config.remove_lines:
        image = remove_table_lines(
            image,
            horizontal_size=config.line_horizontal_size,
            vertical_size=config.line_vertical_size,
            reprocess_strength=config.line_reprocess_strength,
        )
        metadata["applied"].append("remove_table_lines")

    metadata["final_height"] = int(image.shape[0])
    metadata["final_width"] = int(image.shape[1])

    return PreprocessResult(image=image, metadata=metadata)
