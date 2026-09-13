# Real OCR Validation

This directory contains utilities for validating the real PaddleOCR integration
against locally supplied RoR/Jamabandi images.

## Prerequisites

- PaddleOCR installed: `pip install paddleocr`
- First run downloads PaddleOCR model files (~30 MB). This happens only once
  and is cached locally.
- OpenCV and NumPy are already required by the project.

## Usage

Place a local test image in a temporary directory. Do **not** commit real
government/personal documents to this repository.

```python
from pathlib import Path
from ai_ml.ocr.validation import validate_ocr_on_image

image_path = Path(r"C:\\tmp\\ror_sample.png")

if not image_path.exists():
    raise FileNotFoundError(f"Supply a local image at {image_path}")

stats = validate_ocr_on_image(
    image_path,
    languages=["hi", "en"],
    apply_postprocess=True,
)

print("Engine:", stats["engine_name"])
print("Pages:", stats["total_pages"])
print("Words:", stats["total_words"])
print("Avg confidence:", stats["avg_confidence"])
print("Raw text:", stats["raw_text"][:500])
```

## Command-line

Run the validation directly:

```bash
python -c "
from ai_ml.ocr.validation import validate_ocr_on_image
import sys
stats = validate_ocr_on_image(sys.argv[1])
print(stats)
" C:\\tmp\\ror_sample.png
```

## Output

The returned dict contains:

- `engine_name` — OCR engine identifier
- `language` — language config used
- `total_pages`, `total_blocks`, `total_lines`, `total_words`
- `avg_confidence`, `min_confidence`, `max_confidence`
- `words` — list of dicts with text, confidence, bbox, language, page
- `raw_text` — concatenated recognized text
- `preprocessing_metadata` — preprocessing steps and image dimensions

## Notes

- This utility is optional and local-only. It is not part of the automated
  test suite.
- If PaddleOCR is unavailable, `OCRValidationUnavailableError` is raised with
  setup instructions.
- Do not use real personal land records. Use synthetic or sample images for
  local validation.
