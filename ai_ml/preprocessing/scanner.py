"""Image loading utilities for scanned RoR documents."""

from pathlib import Path

import cv2
import numpy as np

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}


class UnsupportedFormatError(Exception):
    """Raised when the image format is not supported."""


class ImageLoadError(Exception):
    """Raised when the image cannot be loaded."""


def load_image(path: str) -> np.ndarray:
    """Load an image from disk.

    Args:
        path: File path to the image.

    Returns:
        Loaded image as a NumPy array in BGR format (OpenCV default).

    Raises:
        ImageLoadError: If the file does not exist or cannot be decoded.
        UnsupportedFormatError: If the file extension is not supported.
    """
    file_path = Path(path)

    if not file_path.exists():
        raise ImageLoadError(f"Image file not found: {path}")

    if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFormatError(
            f"Unsupported image format: {file_path.suffix}. "
            f"Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    image = cv2.imread(str(file_path), cv2.IMREAD_COLOR)
    if image is None:
        raise ImageLoadError(f"Failed to decode image: {path}")

    return image
