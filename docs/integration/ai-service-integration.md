# Backend <-> AI Service E2E Integration Guide

This guide describes how to run and verify the end-to-end (E2E) integration between the Bhu-Setu backend boundary and the AI FastAPI inference service.

---

## Architecture & Request Flow

```
+------------------------------------+
|  Scanned RoR / Jamabandi Document  |
|  (e.g., C:\tmp\ror_sample.png)     |
+------------------------------------+
                  |
                  v
+------------------------------------+
| Backend Integration Boundary       |
| (tests/e2e/harness.py)             |
+------------------------------------+
                  |
                  | 1. GET /api/v1/ready (Readiness Check)
                  | 2. POST /api/v1/inference/document (multipart/form-data)
                  v
+------------------------------------+
| AI FastAPI Service                 |
| (ai_ml/api/server.py :8000)        |
+------------------------------------+
                  |
                  v
+------------------------------------+
| Structured Analysis JSON           |
| (Extraction, Risk, Anomaly, Evid.) |
+------------------------------------+
```

---

## 1. Starting the AI FastAPI Service

### Option A: Local Python / Uvicorn Server

Ensure dependencies from `ai_ml/requirements.txt` are installed:

```powershell
pip install -r ai_ml/requirements.txt
```

Launch the FastAPI application server:

```powershell
python -m uvicorn ai_ml.api.server:create_app --factory --host 0.0.0.0 --port 8000 --reload
```

### Option B: Docker Container

Build and launch using the AI service Dockerfile:

```powershell
docker build -t bhusetu-ai-service -f ai_ml/Dockerfile ai_ml
docker run -d -p 8000:8000 --name ai-service bhusetu-ai-service
```

---

## 2. Service Configuration (`AI_SERVICE_URL`)

The backend integration boundary connects to the AI service using the `AI_SERVICE_URL` environment variable.

- **Default (Local Dev)**: `http://localhost:8000`
- **Custom / Staging**:

```powershell
# Windows PowerShell
$env:AI_SERVICE_URL="http://localhost:8000"

# Linux / WSL / Bash
export AI_SERVICE_URL="http://localhost:8000"
```

---

## 3. Running the E2E Integration Harness

### Option A: CLI Runner with Real Scanned Document

You can run the harness directly against a local sample document image (e.g. `C:\tmp\ror_sample.png` or `./sample.jpg`):

```powershell
python -m tests.e2e.harness --file "C:\tmp\ror_sample.png"
```

To target a custom service URL via CLI flag:

```powershell
python -m tests.e2e.harness --file "C:\tmp\ror_sample.png" --url "http://127.0.0.1:8000"
```

### Option B: Pytest Test Suite

Run unit and integration tests via `pytest`:

```powershell
python -m pytest tests/e2e/test_ai_document_e2e.py -v
```

> **Note for CI Pipelines**: If the AI FastAPI service is offline during test execution, live E2E tests automatically skip gracefully without breaking CI build steps.

---

## 4. Contract Definition & Success Criteria

### Required Endpoint
- **Method**: `POST`
- **Path**: `/api/v1/inference/document`
- **Content-Type**: `multipart/form-data`
- **Form Field**: `file` (image binary: `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.tif`)

### Success Criteria
An integration call is considered successful when:
1. **HTTP Status Code**: `200 OK`
2. **Top-Level Contract Keys**: Response JSON contains all required top-level fields:
   - `extraction_result` (Object containing `status`, `metadata`, `landholders`, `parcels`, `warnings`, `validation_error_count`)
   - `confidence_score` (Float between 0.0 and 1.0)
   - `extraction_risk` (`"low"`, `"medium"`, or `"high"`)
   - `anomaly_score` (Float)
   - `anomaly_risk` (`"low"`, `"medium"`, or `"high"`)
3. **Data Sanitization**: Harness prints a concise summary report without exposing raw PII or unredacted citizen document contents in console logs.

---

## 5. Troubleshooting & Common Error Cases

| Error Symptom | Root Cause | Solution |
| :--- | :--- | :--- |
| `AIServiceUnreachableError: Could not connect to AI service health endpoint` | The AI FastAPI server process is not running, or port 8000 is blocked. | Start the service using `python -m uvicorn ai_ml.api.server:create_app --factory --port 8000` or check firewall/port bindings. |
| `AIServiceUnreachableError: AI service is NOT ready` | Dependencies (e.g., `paddleocr`, OCR engine) failed import/readiness checks. | Check `GET http://localhost:8000/api/v1/ready` response JSON to see which check failed. Install missing dependencies from `ai_ml/requirements.txt`. |
| `HTTP 400 Bad Request` (`unsupported_file_type` or `missing_file`) | File extension is not allowed or multipart field name is not `file`. | Ensure image has extension `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, or `.tif`, and form field name is `file`. |
| `HTTP 422 Unprocessable Entity` (`unreadable_document` or `empty_file`) | Image file is zero bytes or unreadable by OCR engine. | Pass a valid image file containing readable land record text. |

---

## 6. Distinction: API Integration Success vs. OCR Accuracy

- **API Integration Success**: Verifies that network transport, multipart form encoding, HTTP routing, status codes, and schema contract validation function properly between the backend and AI service.
- **OCR Recognition Accuracy**: Refers to how accurately the AI model extracts specific textual values (names, survey numbers, areas) from low-quality or handwritten historical document scans. OCR accuracy is evaluated separately using ground-truth benchmark datasets in `ai_ml/tests/test_benchmark.py`. Integration testing guarantees that when the AI service completes inference, the backend receives and understands the structured output payload.
