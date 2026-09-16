# AI/ML Module — SIH 2026

This module implements the artificial intelligence and machine learning pipeline
for the Smart India Hackathon 2026 land-governance project.

## Purpose

- OCR of scanned Record of Rights (RoR) documents
- Image preprocessing
- Extraction of structured land-record fields
- OCR confidence scoring
- Data validation and consistency checking
- Anomaly detection in land records
- Synthetic/mock training data preparation
- Exposing AI/ML functionality through APIs
- Integration with the backend and land-parcel/ULPIN system

## Planned Pipelines

### OCR Pipeline

```
Scanned RoR
→ Image preprocessing (scanner, cleaner, deskew)
→ OCR engine (PaddleOCR / Tesseract)
→ Raw text
→ Post-processing
```

### Validation Pipeline

```
Raw text
→ Field extraction
→ Structured JSON (Pydantic schema)
→ Rule-based validation
→ Cross-field consistency checks
→ Confidence scoring
```

### Anomaly Detection Pipeline

```
Structured JSON
→ Rule-based anomaly detection
→ Unsupervised outlier detection (future)
→ Explainable risk flags
→ Backend consumption
```

## Backend Communication

The AI/ML module is designed to be called in two ways:

1. **Direct Python package import**: The backend imports
   `ai_ml.pipeline.runner` and calls `run(image_path)` to get results.
2. **HTTP API**: The FastAPI service in `ai_ml.api.server` exposes endpoints
   for asynchronous or remote invocation.

Both interfaces return a common result shape:

```json
{
  "status": "success",
  "raw_text": "...",
  "structured_data": { ... },
  "confidence": { ... },
  "validation": [ ... ],
  "anomalies": [ ... ]
}
```

## Development

```bash
# Install dependencies (to be added to requirements.txt)
pip install -r requirements.txt

# Run pipeline (once implemented)
python -m ai_ml.pipeline.runner --input <image_path>

# Run tests
pytest ai_ml/tests/
```

## Notes

- This is a prototype suitable for SIH demonstration.
- AI outputs are advisory and never silently overwrite official records.
- Synthetic data generation allows development without real labeled datasets.
