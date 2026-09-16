# OCR Module

This module defines the OCR abstraction for the AI/ML pipeline. It provides
a clean engine interface, structured result schemas, and configuration so that
the actual OCR engine can be plugged in without changing the rest of the pipeline.

## Architecture

```
preprocessed image
    ↓
OCR engine (OCREngine)
    ↓
raw OCRResult
    ↓
OCR post-processing
    ↓
structured OCRResult ready for extraction
```

## OCR Result Schema

The `OCRResult` schema preserves spatial and linguistic information needed for
Jamabandi documents:

- `OCRWord`: text, original_text, confidence, bbox, language
- `OCRLine`: line_id, words, bbox
- `OCRBlock`: block_id, lines, bbox
- `OCRPage`: page_number, blocks, width, height
- `OCRResult`: pages, engine_name, language, raw_metadata

Confidence values are floats in `[0.0, 1.0]` or `None` if the engine does not
provide them.

`OCRWord.original_text` preserves the unmodified OCR output for auditability.
When post-processing changes a word, `text` contains the cleaned version and
`original_text` contains the raw OCR text. When no change is made,
`original_text` remains `None`.

## Engine Abstraction

All OCR engines must subclass `OCREngine` and implement:

```python
class MyEngine(OCREngine):
    def recognize(self, image: np.ndarray, config: OCRConfig) -> OCRResult:
        ...
```

The interface is engine-agnostic. The current implementation includes:

- `PaddleOCREngine` — primary adapter for PaddleOCR 3.x
- Future: Tesseract adapter

## Configuration

`OCRConfig` controls engine invocation:

- `languages`: list of language codes, default `["hi", "en"]`
- `confidence_threshold`: minimum confidence to retain words
- `require_bboxes`: whether bounding boxes are required
- `retain_raw_output`: whether to keep raw engine output in `raw_metadata`
- `device`: optional CPU/GPU preference, default `None` (CPU)
- `document_id`: optional document identifier for tracing

## PaddleOCR Integration

### Dependency Installation

```bash
pip install paddleocr
```

PaddleOCR will pull in the required PaddlePaddle runtime automatically.

For CPU-only Windows environments, PaddlePaddle CPU wheels are available via
PyPI. If automatic resolution fails, install PaddlePaddle CPU explicitly:

```bash
python -m pip install paddlepaddle -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
```

### First-Run Behavior

On first use, PaddleOCR automatically downloads the required pre-trained models
from HuggingFace or its model zoo. This requires an internet connection and may
take several minutes depending on the model size. Subsequent runs use the cached
models.

### Hindi / Devanagari Support

The PaddleOCR adapter defaults to `lang="hi"` (Hindi). The language mapping is:

| Our language code | PaddleOCR lang value |
|---|---|
| `hi` | `hi` |
| `en` | `en` |
| `hi+en` | `hi+en` |
| `latin` | `latin` |
| `devanagari` | `devanagari` |

Mixed-language documents (Hindi + English + numeric) are handled by PaddleOCR's
multilingual models where supported. If an unsupported language code is passed,
it is forwarded as-is to PaddleOCR, which may fall back to its default behavior.

### CPU-First Execution

The adapter defaults to CPU inference (`use_gpu=False`). GPU can be enabled by
setting `OCRConfig(device="gpu")`, but this requires `paddlepaddle-gpu` and is
not tested in this project.

### OCR Output Mapping

PaddleOCR 3.x `predict()` returns a list of page result objects. Each result
contains:

- `rec_texts`: list of recognized text strings (line-level)
- `rec_boxes`: list of bounding boxes (quadrilateral `[[x1,y1],[x2,y2],[x3,y3],[x4,y4]]`)
- `rec_scores`: list of confidence floats in `[0.0, 1.0]`
- `rec_polys`: numpy array of polygon points (preserved in `raw_metadata` when enabled)

The adapter maps these to our schema as:

- Each PaddleOCR text entry → `OCRLine` containing a single `OCRWord`
- Quadrilateral boxes → axis-aligned `(x1, y1, x2, y2)` bounding rectangles
- Confidence values are validated and clamped to `[0.0, 1.0]`

### Lazy / Optional Import

`import ai_ml.ocr` does **not** require PaddleOCR to be installed. PaddleOCR
is imported only when `PaddleOCREngine` is instantiated or its `recognize()`
method is called. This keeps architecture tests independent of the heavy OCR
runtime.

### Error Handling

- `OCREngineUnavailableError` — PaddleOCR package not installed or initialization failed
- `OCRImageError` — invalid input image (None, empty array, non-ndarray)
- `OCRInferenceError` — inference failure or empty engine result
- `OCRParsingError` — malformed or unexpected PaddleOCR output structure

### Limitations

- The adapter targets PaddleOCR 3.x. Older versions may have incompatible APIs.
- PaddleOCR line-level output is mapped to single-word `OCRLine`s; true word-level
  segmentation is not currently available from the pipeline output.
- Table structure detection is not implemented here; use PP-StructureV3 for that.
- Model downloads require internet access on first run.
- GPU execution is not tested.

## Hindi-First Design

The architecture explicitly supports Hindi/Devanagari as the primary script:

- Default languages include `"hi"`.
- `OCRWord.language` allows per-word script detection.
- The schema does not assume Latin-only text.
- Engines must preserve Devanagari characters and conjuncts.

## Layout Preservation

OCR output preserves spatial information for table-heavy documents:

- Bounding boxes for every word, line, block, and page.
- Reading order is preserved through `line_id` and `block_id`.
- Page dimensions are recorded.
- Table structure is not extracted here; that is left to a later stage.

## Confidence Handling

- Raw engine confidence is stored per `OCRWord`.
- `OCRConfig.confidence_threshold` can be used to filter low-confidence words.
- Normalization to `[0.0, 1.0]` is the responsibility of each engine adapter.
- Field-level confidence will be computed later by the validation module.

## Post-Processing

OCR recognition and post-processing are kept separate:

```python
from ai_ml.ocr import OCREngine, OCRConfig, postprocess
from ai_ml.ocr.postprocess import PostprocessConfig

engine = PaddleOCREngine()
raw_result = engine.recognize(image, config)

pp_config = PostprocessConfig(
    apply_unicode_normalization=True,
    apply_whitespace_normalization=True,
    retain_original_text=True,
)

clean_result = postprocess(raw_result, config=pp_config)
```

### Post-Processing Behavior

The post-processor is intentionally **conservative** because land records are
legally sensitive. It cleans formatting and obvious OCR artifacts but does not
autocorrect words or guess missing content.

| Operation | Default | Description |
|---|---|---|
| Unicode normalization | Enabled | NFC normalization for Devanagari and mixed text |
| Whitespace normalization | Enabled | Collapses repeated spaces, trims, replaces line breaks |
| Remove empty elements | Enabled | Removes empty or whitespace-only words/lines/blocks |
| Preserve numeric as-is | Enabled | Digits, slashes, hyphens, decimals are never altered |
| Preserve Devanagari as-is | Enabled | Hindi/Devanagari text is preserved without transliteration |
| Retain original text | Enabled | Stores raw OCR text in `OCRWord.original_text` |

### Numeric Preservation

Numeric and semi-numeric patterns are preserved exactly:

- Digits: `123`
- Decimals: `2.5`
- Slash-separated: `142/1`, `247/2/3`
- Hyphenated: `2-5-10` (area notation)

### Hindi / English / Mixed Text

- Devanagari text is preserved without transliteration.
- Mixed Hindi + English + numeric strings are kept intact.
- No forced language normalization is applied.

### Bounding Box / Metadata Preservation

Post-processing never drops or recalculates bounding boxes, page numbers,
line IDs, or block IDs. If a word is removed because it is empty, its
spatial metadata is removed with it.

### Confidence

Confidence values are preserved exactly as returned by the OCR engine.
No artificial inflation or deflation is applied.

### Auditability

When `retain_original_text=True` (default), every changed word stores its
raw OCR text in `original_text`. This allows downstream validation and
human review to compare the original OCR output against the cleaned text.

### Limitations

- No word merging across line breaks.
- No reading-order reordering.
- No table reconstruction.
- No Devanagari-specific spell correction.
- No date/number normalization (e.g., Devanagari numerals are not converted).

## Error Handling

- `OCRError` — base exception
- `OCRImageError` — invalid input image
- `OCREngineUnavailableError` — engine or dependency missing
- `OCRInferenceError` — inference failure
- `OCRParsingError` — malformed engine output
- `OCRConfigurationError` — invalid configuration

Errors are never silently swallowed.

## What Is Intentionally Not Implemented Yet

- Actual OCR inference (beyond the PaddleOCR adapter interface)
- Tesseract adapter
- Layout/table extraction
- Field-level confidence scoring
- Word merging across line breaks
- Reading-order reordering
- Devanagari-specific spell correction
- Date/number normalization
