"""Unit tests for ai_ml.preprocessing."""

from pathlib import Path

import cv2
import numpy as np
import pytest

from ai_ml.preprocessing.cleaner import (
    denoise,
    enhance_contrast,
    remove_table_lines,
    threshold,
    to_grayscale,
)
from ai_ml.preprocessing.deskew import deskew, estimate_skew_angle
from ai_ml.preprocessing.pipeline import PreprocessConfig, run
from ai_ml.preprocessing.scanner import ImageLoadError, UnsupportedFormatError, load_image


@pytest.fixture()
def sample_color_image(tmp_path: Path) -> str:
    """Create a temporary color image and return its path."""
    image = np.array([[[120, 140, 160], [200, 220, 240]], [[10, 20, 30], [255, 255, 255]]], dtype=np.uint8)
    path = tmp_path / "color.png"
    cv2.imwrite(str(path), image)
    return str(path)


@pytest.fixture()
def sample_gray_image(tmp_path: Path) -> str:
    """Create a temporary grayscale image and return its path."""
    image = np.array([[40, 180], [200, 255]], dtype=np.uint8)
    path = tmp_path / "gray.png"
    cv2.imwrite(str(path), image)
    return str(path)


@pytest.fixture()
def sample_document_image(tmp_path: Path) -> str:
    """Create a synthetic document-like image with text-like horizontal lines."""
    image = np.full((200, 400), 255, dtype=np.uint8)
    for y in range(20, 200, 30):
        cv2.putText(
            image,
            "Sample Text Line",
            (10, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            0,
            1,
            cv2.LINE_AA,
        )
    path = tmp_path / "document.png"
    cv2.imwrite(str(path), image)
    return str(path)


class TestScanner:
    def test_load_image_missing_file(self) -> None:
        with pytest.raises(ImageLoadError):
            load_image("nonexistent_file.png")

    def test_load_image_unsupported_format(self, tmp_path: Path) -> None:
        path = tmp_path / "file.txt"
        path.write_text("not an image")
        with pytest.raises(UnsupportedFormatError):
            load_image(str(path))

    def test_load_image_color(self, sample_color_image: str) -> None:
        image = load_image(sample_color_image)
        assert image.ndim == 3
        assert image.shape[2] == 3

    def test_load_image_grayscale(self, sample_gray_image: str) -> None:
        image = load_image(sample_gray_image)
        assert image.ndim == 3 or image.ndim == 2


class TestGrayscale:
    def test_color_to_grayscale(self, sample_color_image: str) -> None:
        image = load_image(sample_color_image)
        gray = to_grayscale(image)
        assert gray.ndim == 2

    def test_grayscale_passthrough(self, sample_gray_image: str) -> None:
        image = load_image(sample_gray_image)
        gray = to_grayscale(image)
        assert gray.ndim == 2


class TestDenoise:
    def test_denoise_returns_grayscale(self, sample_document_image: str) -> None:
        image = load_image(sample_document_image)
        gray = to_grayscale(image)
        denoised = denoise(gray)
        assert denoised.ndim == 2
        assert denoised.dtype == np.uint8

    def test_denoise_rejects_color(self, sample_color_image: str) -> None:
        image = load_image(sample_color_image)
        with pytest.raises(ValueError):
            denoise(image)


class TestContrast:
    def test_enhance_contrast_returns_grayscale(self, sample_document_image: str) -> None:
        image = load_image(sample_document_image)
        gray = to_grayscale(image)
        enhanced = enhance_contrast(gray)
        assert enhanced.ndim == 2
        assert enhanced.dtype == np.uint8

    def test_enhance_contrast_rejects_color(self, sample_color_image: str) -> None:
        image = load_image(sample_color_image)
        with pytest.raises(ValueError):
            enhance_contrast(image)


class TestThreshold:
    def test_threshold_gaussian(self, sample_document_image: str) -> None:
        image = load_image(sample_document_image)
        gray = to_grayscale(image)
        binary = threshold(gray, method="gaussian")
        assert binary.ndim == 2
        assert binary.dtype == np.uint8

    def test_threshold_mean(self, sample_document_image: str) -> None:
        image = load_image(sample_document_image)
        gray = to_grayscale(image)
        binary = threshold(gray, method="mean")
        assert binary.ndim == 2

    def test_threshold_invalid_method(self, sample_document_image: str) -> None:
        image = load_image(sample_document_image)
        gray = to_grayscale(image)
        with pytest.raises(ValueError):
            threshold(gray, method="invalid")


class TestRemoveTableLines:
    def test_remove_lines_returns_grayscale(self, sample_document_image: str) -> None:
        image = load_image(sample_document_image)
        gray = to_grayscale(image)
        result = remove_table_lines(gray)
        assert result.ndim == 2
        assert result.dtype == np.uint8

    def test_remove_lines_rejects_color(self, sample_color_image: str) -> None:
        image = load_image(sample_color_image)
        with pytest.raises(ValueError):
            remove_table_lines(image)


class TestDeskew:
    def test_deskew_returns_tuple(self, sample_document_image: str) -> None:
        image = load_image(sample_document_image)
        gray = to_grayscale(image)
        result_image, angle = deskew(gray)
        assert isinstance(result_image, np.ndarray)
        assert isinstance(angle, float)

    def test_deskew_preserves_dimensions(self, sample_document_image: str) -> None:
        image = load_image(sample_document_image)
        gray = to_grayscale(image)
        result_image, _ = deskew(gray)
        assert result_image.shape == gray.shape

    def test_deskew_rejects_color(self, sample_color_image: str) -> None:
        image = load_image(sample_color_image)
        with pytest.raises(ValueError):
            deskew(image)

    def test_deskew_flat_image_returns_zero_angle(self) -> None:
        flat = np.full((100, 200), 255, dtype=np.uint8)
        _, angle = deskew(flat)
        assert angle == 0.0


class TestPipeline:
    def test_pipeline_runs(self, sample_document_image: str) -> None:
        config = PreprocessConfig(
            apply_threshold=True,
            remove_lines=False,
        )
        result = run(sample_document_image, config=config)
        assert isinstance(result.image, np.ndarray)
        assert result.image.ndim == 2
        assert result.image.dtype == np.uint8

    def test_pipeline_metadata(self, sample_document_image: str) -> None:
        result = run(sample_document_image)
        meta = result.metadata
        assert "original_width" in meta
        assert "original_height" in meta
        assert "final_width" in meta
        assert "final_height" in meta
        assert "skew_angle" in meta
        assert "applied" in meta
        assert meta["original_width"] == meta["final_width"]
        assert meta["original_height"] == meta["final_height"]
        assert "grayscale" in meta["applied"]
        assert "denoise" in meta["applied"]
        assert "contrast" in meta["applied"]
        assert "deskew" in meta["applied"]

    def test_pipeline_with_table_line_removal(self, sample_document_image: str) -> None:
        config = PreprocessConfig(remove_lines=True)
        result = run(sample_document_image, config=config)
        assert isinstance(result.image, np.ndarray)
        assert "remove_table_lines" in result.metadata["applied"]

    def test_pipeline_invalid_path(self) -> None:
        with pytest.raises(ImageLoadError):
            run("nonexistent_image.png")
