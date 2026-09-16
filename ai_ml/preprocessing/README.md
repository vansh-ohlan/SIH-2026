# Preprocessing Module

This module provides image preprocessing operations for scanned Rajasthan
Jamabandi / Record of Rights (RoR) documents.

## Purpose

Preprocessing improves OCR readability while preserving information needed for
table and layout extraction. Operations are intentionally conservative and
independently configurable.

## Supported Inputs

- PNG, JPG/JPEG, TIFF, BMP
- Color or grayscale images
- Scanned pages or PDF-converted images

## Pipeline Stages

```
input image
    -> grayscale
    -> denoise
    -> contrast enhancement
    -> deskew
    -> optional threshold
    -> optional table-line removal
    -> output image
```

### Grayscale

Converts color images to grayscale. Grayscale images pass through unchanged.

### Denoise

Applies non-local means denoising. Strength is configurable; the default is
conservative to avoid blurring Devanagari characters.

### Contrast Enhancement

Uses CLAHE (Contrast Limited Adaptive Histogram Equalization) to improve
readability of faded or unevenly lit documents.

### Deskew

Detects small page rotations using the projection profile method and corrects
them. Returns the estimated angle in the metadata. If no clear skew is found,
the angle is 0.0 and the image is unchanged.

### Threshold (Optional)

Adaptive thresholding to produce a binary image. Useful when the downstream
OCR engine prefers black-and-white input. Disabled by default because
binarization can remove subtle gray-level details needed for layout analysis.

### Table-Line Removal (Optional)

Conservatively suppresses strong horizontal and vertical table lines. This is
optional because table structure may be useful for layout-aware extraction.
The operation is intentionally mild to avoid erasing text.

## Configuration

Use `PreprocessConfig` to control each stage:

```python
from ai_ml.preprocessing.pipeline import run, PreprocessConfig

config = PreprocessConfig(
    denoise_strength=10,
    contrast_clip_limit=2.0,
    apply_threshold=True,
    threshold_method="gaussian",
    remove_lines=False,
)

result = run("path/to/image.png", config=config)
image = result.image
metadata = result.metadata
```

## Output

`run()` returns a `PreprocessResult` containing:

- `image`: processed grayscale image as a NumPy array
- `metadata`: dictionary with:
  - `original_width`, `original_height`
  - `final_width`, `final_height`
  - `skew_angle`: estimated angle in degrees (0.0 if none detected)
  - `applied`: list of applied operation names

## Design Notes

- The original image is never modified in place.
- Grayscale is always applied first so that subsequent operations can assume
  a single-channel input.
- Thresholding and table-line removal are opt-in because they are destructive.
- Denoising and contrast defaults are tuned for printed Hindi government
  documents; adjust `denoise_strength` and `contrast_clip_limit` for
  particularly faded or noisy scans.
