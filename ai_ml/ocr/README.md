# OCR Module

This module defines the OCR abstraction for the AI/ML pipeline. It provides
a clean engine interface, structured result schemas, and configuration so that
the actual OCR engine (planned: PaddleOCR, with Tesseract as a future fallback)
can be plugged in without changing the rest of the pipeline.

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

- `OCRWord`: text, confidence, bbox, language
- `OCRLine`: line_id, words, bbox
- `OCRBlock`: block_id, lines, bbox
- `OCRPage`: page_number, blocks, width, height
- `OCRResult`: pages, engine_name, language, raw_metadata

Confidence values are floats in `[0.0, 1.0]` or `None` if the engine does not
provide them.

## Engine Abstraction

All OCR engines must subclass `OCREngine` and implement:

```python
class MyEngine(OCREngine):
    def recognize(self, image: np.ndarray, config: OCRConfig) -> OCRResult:
        ...
```

The interface is engine-agnostic. PaddleOCR and Tesseract adapters will be
implemented as separate subclasses.

## Configuration

`OCRConfig` controls engine invocation:

- `languages`: list of language codes, default `["hi", "en"]`
- `confidence_threshold`: minimum confidence to retain words
- `require_bboxes`: whether bounding boxes are required
- `retain_raw_output`: whether to keep raw engine output in `raw_metadata`
- `device`: optional CPU/GPU preference
- `document_id`: optional document identifier for tracing

## Hindi-First Design

The architecture explicitly supports Hindi/Devanagari as the primary script:

- Default languages include `"hi"`.
- `OCRWord.language` allows per-word script detection.
- The schema does not assume Latin-only text.
- Future engines must preserve Devanagari characters and conjuncts.

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

## Post-Processing Boundary

OCR recognition and post-processing are kept separate:

```python
from ai_ml.ocr import OCREngine, OCRConfig, postprocess

engine = MyEngine()
raw_result = engine.recognize(image, config)
clean_result = postprocess(raw_result, config)
```

Post-processing currently returns the result unchanged. Future implementations
may add word merging, numeral normalization, and reading-order correction.

## Planned Integrations

- **Primary:** PaddleOCR (strong Devanagari support, layout analysis)
- **Fallback:** Tesseract 5+ with Hindi language pack

Neither engine is a current dependency. The abstraction is designed so that
adding either engine requires only a new subclass of `OCREngine`.

## Error Handling

- `OCRError` — base exception
- `OCRImageError` — invalid input image
- `OCREngineUnavailableError` — engine or dependency missing
- `OCRInferenceError` — inference failure
- `OCRParsingError` — malformed engine output
- `OCRConfigurationError` — invalid configuration

Errors are never silently swallowed.

## What Is Intentionally Not Implemented Yet

- Actual OCR inference
- PaddleOCR or Tesseract adapters
- Layout/table extraction
- Field-level confidence scoring
- Devanagari-specific post-processing rules
- Language auto-detection
