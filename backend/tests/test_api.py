"""Backend tests for the API gateway."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

# Ensure ai_ml is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.main import create_app
from backend.app.config import BackendConfig
from backend.app.services import AIServiceWrapper, AIServiceError
from backend.app.routes import get_ai_service_dep


def _make_analysis_result(**overrides: Any) -> Dict[str, Any]:
    return {
        "extraction_result": {
            "status": "success",
            "metadata": {
                "document_type": {"value": "Jamabandi"},
                "state": {"value": "Punjab"},
                "district": {"value": "Ludhiana"},
            },
            "landholders": [
                {"name": {"value": "Test Landholder"}, "share": {"value": "1.0"}}
            ],
            "parcels": [
                {"khasra_number": {"value": "100/1"}, "area_raw": {"value": "1000 sqm"}}
            ],
            "document_remarks": None,
            "unrecognized_text": [],
            "warnings": [],
            "extractor_version": "1.0.0",
            "conflicts": [],
            "validation_error_count": 0,
            "validation_warning_count": 0,
        },
        "confidence_score": 0.95,
        "extraction_risk": "low",
        "anomaly_features": [0.0, 0.1],
        "anomaly_score": -0.5,
        "anomaly_risk": "low",
        "explainability_evidence": {"top_influences": []},
    }


class _MockAIWrapper:
    """Mock AI service wrapper for backend tests."""

    def __init__(self, result=None, error=None):
        self.result = result or _make_analysis_result()
        self.error = error
        self.calls = []

    def infer_document(self, file_path):
        self.calls.append(str(file_path))
        if self.error is not None:
            raise AIServiceError(str(self.error))
        return self.result


class TestHealth:
    def test_health_endpoint(self):
        app = create_app()
        client = TestClient(app)
        res = client.get("/api/v1/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"


class TestAIReadiness:
    def test_ai_ready(self):
        app = create_app()
        client = TestClient(app)
        res = client.get("/api/v1/ai/ready")
        assert res.status_code == 200
        assert "status" in res.json()


class TestDocumentUpload:
    def test_successful_upload(self, tmp_path):
        from PIL import Image
        img_path = tmp_path / "test.png"
        Image.new("RGB", (100, 100), color=(255, 255, 255)).save(img_path)

        mock_wrapper = _MockAIWrapper()
        app = create_app()
        app.dependency_overrides[get_ai_service_dep] = lambda: mock_wrapper
        client = TestClient(app)

        with open(img_path, "rb") as fh:
            res = client.post(
                "/api/v1/documents/upload",
                files={"file": ("test.png", fh, "image/png")},
            )
        assert res.status_code == 200
        payload = res.json()
        analysis = payload.get("analysis", payload)
        assert analysis["extraction_result"]["status"] == "success"
        assert analysis["confidence_score"] == 0.95

    def test_unsupported_file_type(self, tmp_path):
        txt_path = tmp_path / "test.txt"
        txt_path.write_text("hello")

        app = create_app()
        client = TestClient(app)
        with open(txt_path, "rb") as fh:
            res = client.post(
                "/api/v1/documents/upload",
                files={"file": ("test.txt", fh, "text/plain")},
            )
        assert res.status_code == 400
        assert res.json()["detail"]["error"] == "unsupported_file_type"

    def test_oversized_file(self, tmp_path):
        from PIL import Image
        img_path = tmp_path / "big.png"
        Image.new("RGB", (100, 100), color=(255, 255, 255)).save(img_path)

        config = BackendConfig(max_upload_size=10)
        app = create_app(config=config)
        app.dependency_overrides[get_ai_service_dep] = lambda: _MockAIWrapper()
        client = TestClient(app)
        with open(img_path, "rb") as fh:
            res = client.post(
                "/api/v1/documents/upload",
                files={"file": ("big.png", fh, "image/png")},
            )
        assert res.status_code == 413
        assert res.json()["detail"]["error"] == "file_too_large"

    def test_empty_file(self, tmp_path):
        empty_path = tmp_path / "empty.png"
        empty_path.write_bytes(b"")

        app = create_app()
        client = TestClient(app)
        with open(empty_path, "rb") as fh:
            res = client.post(
                "/api/v1/documents/upload",
                files={"file": ("empty.png", fh, "image/png")},
            )
        assert res.status_code == 422
        assert res.json()["detail"]["error"] == "empty_file"

    def test_ai_timeout(self, tmp_path):
        from PIL import Image
        img_path = tmp_path / "test.png"
        Image.new("RGB", (100, 100), color=(255, 255, 255)).save(img_path)

        from ai_ml.client.exceptions import AIClientTimeoutError
        mock_wrapper = _MockAIWrapper(error=AIClientTimeoutError("timed out"))
        app = create_app()
        app.dependency_overrides[get_ai_service_dep] = lambda: mock_wrapper
        client = TestClient(app)

        with open(img_path, "rb") as fh:
            res = client.post(
                "/api/v1/documents/upload",
                files={"file": ("test.png", fh, "image/png")},
            )
        assert res.status_code == 503

    def test_ai_unavailable(self, tmp_path):
        from PIL import Image
        img_path = tmp_path / "test.png"
        Image.new("RGB", (100, 100), color=(255, 255, 255)).save(img_path)

        from ai_ml.client.exceptions import AIClientConnectionError
        mock_wrapper = _MockAIWrapper(error=AIClientConnectionError("unreachable"))
        app = create_app()
        app.dependency_overrides[get_ai_service_dep] = lambda: mock_wrapper
        client = TestClient(app)

        with open(img_path, "rb") as fh:
            res = client.post(
                "/api/v1/documents/upload",
                files={"file": ("test.png", fh, "image/png")},
            )
        assert res.status_code == 503

    def test_ai_server_error(self, tmp_path):
        from PIL import Image
        img_path = tmp_path / "test.png"
        Image.new("RGB", (100, 100), color=(255, 255, 255)).save(img_path)

        from ai_ml.client.exceptions import AIClientHTTPError
        mock_wrapper = _MockAIWrapper(error=AIClientHTTPError(status_code=500, body={"error": "inference_failure"}))
        app = create_app()
        app.dependency_overrides[get_ai_service_dep] = lambda: mock_wrapper
        client = TestClient(app)

        with open(img_path, "rb") as fh:
            res = client.post(
                "/api/v1/documents/upload",
                files={"file": ("test.png", fh, "image/png")},
            )
        assert res.status_code == 503

    def test_missing_file(self):
        app = create_app()
        client = TestClient(app)
        res = client.post("/api/v1/documents/upload", files={})
        assert res.status_code == 422  # FastAPI validation error for missing required field