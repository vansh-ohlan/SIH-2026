"""Skew detection and correction for scanned RoR documents."""

from typing import Optional

import cv2
import numpy as np


def _projection_profile_variance(binary_image: np.ndarray) -> float:
    """Compute the variance of the horizontal projection profile.

    A well-oriented text document has high variance because text lines
    create strong peaks in the row sums.

    Args:
        binary_image: Binarized image (white background, black text).

    Returns:
        Variance of the row-wise sum.
    """
    profile = np.sum(binary_image, axis=1)
    return float(np.var(profile))


def estimate_skew_angle(
    image: np.ndarray,
    max_angle: float = 5.0,
    angle_step: float = 0.5,
) -> float:
    """Estimate the skew angle of a document image.

    Uses the projection profile method on a binarized, downsampled image.

    Args:
        image: Grayscale input image.
        max_angle: Maximum angle to search (in degrees) in either direction.
        angle_step: Step size for angle search (in degrees).

    Returns:
        Estimated skew angle in degrees. Positive means clockwise rotation.
        Returns 0.0 if no clear skew is detected.
    """
    if len(image.shape) != 2:
        raise ValueError("Skew estimation expects a grayscale image.")

    height, width = image.shape[:2]
    scale = min(1.0, 800.0 / max(height, width))
    resized = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    _, binary = cv2.threshold(resized, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    angles = []
    variances = []

    for angle in np.arange(-max_angle, max_angle + angle_step, angle_step):
        rotated = _rotate_image(binary, angle)
        var = _projection_profile_variance(rotated)
        angles.append(angle)
        variances.append(var)

    if not variances:
        return 0.0

    best_index = int(np.argmax(variances))
    best_angle = angles[best_index]
    best_variance = variances[best_index]

    if best_variance < 1e-6:
        return 0.0

    refined_angles = []
    refined_variances = []

    fine_range = 1.0
    fine_step = 0.1
    for angle in np.arange(
        best_angle - fine_range, best_angle + fine_range + fine_step, fine_step
    ):
        rotated = _rotate_image(binary, angle)
        var = _projection_profile_variance(rotated)
        refined_angles.append(angle)
        refined_variances.append(var)

    best_fine_index = int(np.argmax(refined_variances))
    return float(refined_angles[best_fine_index])


def _rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
    """Rotate an image by angle degrees around its center.

    Args:
        image: Input image.
        angle: Rotation angle in degrees.

    Returns:
        Rotated image with the same dimensions as the input.
    """
    height, width = image.shape[:2]
    center = (width / 2.0, height / 2.0)
    rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(
        image,
        rotation_matrix,
        (width, height),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )


def deskew(
    image: np.ndarray,
    max_angle: float = 5.0,
) -> tuple[np.ndarray, float]:
    """Detect and correct skew in a document image.

    Args:
        image: Grayscale input image.
        max_angle: Maximum skew angle to search (in degrees).

    Returns:
        Tuple of (deskewed image, estimated skew angle in degrees).
        The angle is positive if the original image was rotated clockwise.
    """
    if len(image.shape) != 2:
        raise ValueError("Deskew expects a grayscale image.")

    angle = estimate_skew_angle(image, max_angle=max_angle)
    if abs(angle) < 0.01:
        return image.copy(), 0.0

    height, width = image.shape[:2]
    center = (width / 2.0, height / 2.0)
    rotation_matrix = cv2.getRotationMatrix2D(center, -angle, 1.0)

    deskewed = cv2.warpAffine(
        image,
        rotation_matrix,
        (width, height),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE,
    )

    return deskewed, angle
