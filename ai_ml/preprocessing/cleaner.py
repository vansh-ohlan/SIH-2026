"""Image cleaning operations for scanned RoR documents."""

from __future__ import annotations

from typing import Optional

import cv2
import numpy as np


def to_grayscale(image: np.ndarray) -> np.ndarray:
    """Convert an image to grayscale.

    Args:
        image: Input image in BGR or grayscale format.

    Returns:
        Grayscale image as a 2D NumPy array.
    """
    if len(image.shape) == 2:
        return image
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def denoise(
    image: np.ndarray,
    strength: int = 10,
    template_window_size: int = 7,
    search_window_size: int = 21,
) -> np.ndarray:
    """Apply conservative non-local means denoising.

    This preserves Devanagari character edges better than aggressive
    blurring while reducing scan noise.

    Args:
        image: Grayscale input image.
        strength: Filter strength. Lower values preserve more detail.
        template_window_size: Odd number, size of template patch.
        search_window_size: Odd number, size of search window.

    Returns:
        Denoised grayscale image.
    """
    if len(image.shape) != 2:
        raise ValueError("Denoising expects a grayscale image.")

    return cv2.fastNlMeansDenoising(
        image,
        h=strength,
        templateWindowSize=template_window_size,
        searchWindowSize=search_window_size,
    )


def enhance_contrast(
    image: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Apply CLAHE contrast enhancement.

    Args:
        image: Grayscale input image.
        clip_limit: Threshold for contrast limiting.
        tile_grid_size: Number of tiles in the row and column directions.

    Returns:
        Contrast-enhanced grayscale image.
    """
    if len(image.shape) != 2:
        raise ValueError("Contrast enhancement expects a grayscale image.")

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    return clahe.apply(image)


def threshold(
    image: np.ndarray,
    max_value: int = 255,
    method: str = "gaussian",
    block_size: int = 11,
    c: int = 2,
) -> np.ndarray:
    """Apply adaptive thresholding.

    Args:
        image: Grayscale input image.
        max_value: Maximum value to use with the THRESH_BINARY threshold.
        method: 'gaussian' or 'mean'.
        block_size: Size of a pixel neighborhood for threshold calculation.
        c: Constant subtracted from the mean or weighted mean.

    Returns:
        Binarized image.

    Raises:
        ValueError: If method is not recognized.
    """
    if len(image.shape) != 2:
        raise ValueError("Thresholding expects a grayscale image.")

    if method == "gaussian":
        method_flag = cv2.ADAPTIVE_THRESH_GAUSSIAN_C
    elif method == "mean":
        method_flag = cv2.ADAPTIVE_THRESH_MEAN_C
    else:
        raise ValueError(f"Unsupported threshold method: {method}")

    return cv2.adaptiveThreshold(
        image,
        max_value,
        method_flag,
        cv2.THRESH_BINARY,
        block_size,
        c,
    )


def remove_table_lines(
    image: np.ndarray,
    horizontal_size: int = 40,
    vertical_size: int = 40,
    reprocess_strength: int = 3,
) -> np.ndarray:
    """Conservatively remove strong horizontal and vertical table lines.

    This operation is intentionally conservative to avoid erasing Devanagari
    characters. It is optional because table structure may be useful for
    downstream layout-aware extraction.

    Args:
        image: Grayscale input image.
        horizontal_size: Length of horizontal line kernel.
        vertical_size: Length of vertical line kernel.
        reprocess_strength: Denoising strength applied after line removal
            to clean residual artifacts.

    Returns:
        Image with strong lines suppressed.
    """
    if len(image.shape) != 2:
        raise ValueError("Table line removal expects a grayscale image.")

    binary = cv2.adaptiveThreshold(
        image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )

    horizontal_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (horizontal_size, 1)
    )
    vertical_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (1, vertical_size)
    )

    horizontal_lines = cv2.morphologyEx(
        binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=1
    )
    vertical_lines = cv2.morphologyEx(
        binary, cv2.MORPH_OPEN, vertical_kernel, iterations=1
    )

    lines_mask = cv2.bitwise_or(horizontal_lines, vertical_lines)
    lines_mask = cv2.dilate(lines_mask, np.ones((2, 2), np.uint8), iterations=1)

    result = image.copy()
    result[lines_mask > 0] = 255

    result = cv2.fastNlMeansDenoising(
        result, h=reprocess_strength, templateWindowSize=7, searchWindowSize=21
    )

    return result
