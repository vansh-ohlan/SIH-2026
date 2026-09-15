# Bhu-Setu Backend API Gateway

Minimal FastAPI backend that accepts land-record document uploads and delegates
AI inference to the existing AI service.

## Endpoints

- `GET /api/v1/health` — Backend health check
- `GET /api/v1/ai/ready` — AI service readiness check
- `POST /api/v1/documents/upload` — Upload document for AI inference

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_SERVICE_URL` | `http://localhost:8000` | AI service base URL |
| `AI_TIMEOUT` | `60.0` | AI request timeout in seconds |
| `MAX_UPLOAD_SIZE` | `20971520` | Max upload size in bytes (20 MB) |

## Running

```bash
pip install -r requirements.txt
python -m uvicorn backend.app.main:create_app --factory --host 0.0.0.0 --port 8000
```

## Testing

```bash
pytest -q backend/tests
```

## Architecture

```
Client → Backend API Gateway → AIInferenceClient → AI FastAPI Service → AnalysisResponse
```