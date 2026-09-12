"""Integration tests for the AI inference API boundary."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Optional

import pytest
from fastapi.testclient import TestClient

from ai_ml.analysis.result import AnalysisResult
from ai_ml.extraction.schema import ExtractionResult
from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.inference.document_inference import DocumentAIInference
from ai_ml.api.server import create_app


def _make_analysis_result(**overrides: Any) -> AnalysisResult:
    """Build a minimal AnalysisResult for tests."""
    extraction_result = ExtractionResult(
        status="success",
        metadata=None,
        landholders=[],
        parcels=[],
        unrecognized_text=[],
        warnings=[],
        extractor_version="test",
        conflicts=[],
        validation_error_count=0,
        validation_warning_count=0,
    )
    data: Dict[str, Any] = {
        "extraction_result": extraction_result,
        "confidence_score": 0.9,
        "extraction_risk": "low",
        "anomaly_features": [0.1, -0.2, 0.05],
        "anomaly_score": 0.05,
        "anomaly_risk": "low",
        "explainability_evidence": {"top_influences": [{"field": "area", "importance": 0.4}]},
    }
    data.update(overrides)
    return AnalysisResult(**data)


class _MockDocumentInferenceService:
    """Mock document inference service for API tests."""

    def __init__(self, result: Optional[AnalysisResult] = None, failure: Optional[BaseException] = None) -> None:
        self.result = result
        self.failure = failure
        self.calls: list[Path] = []

    def infer(self, path: Path) -> AnalysisResult:
        self.calls.append(path)
        if self.failure is not None:
            raise self.failure
        if self.result is None:
            return _make_analysis_result()
        return self.result


class TestInferenceAPI:
    def test_successful_document_inference(self, tmp_path: Path) -> None:
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake-image-bytes")
        expected = _make_analysis_result(confidence_score=0.95, extraction_risk="low")
        mock_service = _MockDocumentInferenceService(result=expected)

        app = create_app(document_inference_service=mock_service)
        client = TestClient(app)

        with open(image_path, "rb") as fh:
            response = client.post(
                "/api/v1/inference/document",
                files={"file": ("test.png", fh, "image/png")},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["confidence_score"] == 0.95
        assert payload["extraction_risk"] == "low"
        assert "extraction_result" in payload
        assert "anomaly_features" in payload
        assert "explainability_evidence" in payload

    def test_successful_response_serialization(self, tmp_path: Path) -> None:
        image_path = tmp_path / "doc.jpg"
        image_path.write_bytes(b"fake-image-bytes")
        expected = _make_analysis_result()
        mock_service = _MockDocumentInferenceService(result=expected)

        app = create_app(document_inference_service=mock_service)
        client = TestClient(app)

        with open(image_path, "rb") as fh:
            response = client.post(
                "/api/v1/inference/document",
                files={"file": ("doc.jpg", fh, "image/jpeg")},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["extraction_result"]["status"] == "success"
        assert payload["anomaly_score"] == pytest.approx(0.05)
        assert payload["anomaly_risk"] == "low"
        assert isinstance(payload["anomaly_features"], list)
        assert payload["explainability_evidence"]["top_influences"][0]["field"] == "area"

    def test_missing_file_returns_422(self) -> None:
        mock_service = _MockDocumentInferenceService()
        app = create_app(document_inference_service=mock_service)
        client = TestClient(app)

        response = client.post("/api/v1/inference/document", files={})

        assert response.status_code == 422
        body = response.json()
        assert "detail" in body

    def test_unsupported_file_type_returns_400(self, tmp_path: Path) -> None:
        text_file = tmp_path / "notes.txt"
        text_file.write_text("hello", encoding="utf-8")
        mock_service = _MockDocumentInferenceService()
        app = create_app(document_inference_service=mock_service)
        client = TestClient(app)

        with open(text_file, "rb") as fh:
            response = client.post(
                "/api/v1/inference/document",
                files={"file": ("notes.txt", fh, "text/plain")},
            )

        assert response.status_code == 400
        body = response.json()
        assert body["detail"]["error"] == "unsupported_file_type"
        assert "notes.txt" in body["detail"]["message"] or ".txt" in body["detail"]["message"]

    def test_inference_service_failure_returns_500(self, tmp_path: Path) -> None:
        image_path = tmp_path / "doc.png"
        image_path.write_bytes(b"fake-image-bytes")
        mock_service = _MockDocumentInferenceService(failure=RuntimeError("pipeline boom"))

        app = create_app(document_inference_service=mock_service)
        client = TestClient(app)

        with open(image_path, "rb") as fh:
            response = client.post(
                "/api/v1/inference/document",
                files={"file": ("doc.png", fh, "image/png")},
            )

        assert response.status_code == 500
        body = response.json()
        assert body["detail"]["error"] == "inference_failure"
        assert "stack" not in body["detail"]["message"].lower()
        assert "traceback" not in body["detail"]["message"].lower()

    def test_unreadable_document_returns_422(self, tmp_path: Path) -> None:
        image_path = tmp_path / "broken.png"
        image_path.write_bytes(b"fake-image-bytes")
        mock_service = _MockDocumentInferenceService(failure=InvalidOCRResultError("no text found"))

        app = create_app(document_inference_service=mock_service)
        client = TestClient(app)

        with open(image_path, "rb") as fh:
            response = client.post(
                "/api/v1/inference/document",
                files={"file": ("broken.png", fh, "image/png")},
            )

        assert response.status_code == 422
        body = response.json()
        assert body["detail"]["error"] == "unreadable_document"

    def test_malformed_input_empty_file_returns_422(self, tmp_path: Path) -> None:
        empty_file = tmp_path / "empty.png"
        empty_file.write_bytes(b"")
        mock_service = _MockDocumentInferenceService()
        app = create_app(document_inference_service=mock_service)
        client = TestClient(app)

        with open(empty_file, "rb") as fh:
            response = client.post(
                "/api/v1/inference/document",
                files={"file": ("empty.png", fh, "image/png")},
            )

        assert response.status_code == 422
        body = response.json()
        assert body["detail"]["error"] == "empty_file"

    def test_response_contains_confidence_and_risk(self, tmp_path: Path) -> None:
        image_path = tmp_path / "doc.tif"
        image_path.write_bytes(b"fake-image-bytes")
        expected = _make_analysis_result(confidence_score=0.77, extraction_risk="medium", anomaly_score=0.42, anomaly_risk="high")
        mock_service = _MockDocumentInferenceService(result=expected)

        app = create_app(document_inference_service=mock_service)
        client = TestClient(app)

        with open(image_path, "rb") as fh:
            response = client.post(
                "/api/v1/inference/document",
                files={"file": ("doc.tif", fh, "image/tiff")},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["confidence_score"] == pytest.approx(0.77)
        assert payload["extraction_risk"] == "medium"
        assert payload["anomaly_score"] == pytest.approx(0.42)
        assert payload["anomaly_risk"] == "high"

    def test_response_contains_explainability_and_provenance(self, tmp_path: Path) -> None:
        image_path = tmp_path / "doc.bmp"
        image_path.write_bytes(b"fake-image-bytes")
        expected = _make_analysis_result(
            explainability_evidence={"fields": {"khasra_number": {"importance": 0.6}}},
        )
        mock_service = _MockDocumentInferenceService(result=expected)

        app = create_app(document_inference_service=mock_service)
        client = TestClient(app)

        with open(image_path, "rb") as fh:
            response = client.post(
                "/api/v1/inference/document",
                files={"file": ("doc.bmp", fh, "image/bmp")},
            )

        assert response.status_code == 200
        payload = response.json()
        assert "explainability_evidence" in payload
        assert payload["explainability_evidence"]["fields"]["khasra_number"]["importance"] == pytest.approx(0.6)

    def test_api_does_not_expose_internal_stack_traces(self, tmp_path: Path) -> None:
        image_path = tmp_path / "doc.png"
        image_path.write_bytes(b"fake-image-bytes")

        class _BoomService:
            def infer(self, path: Path) -> AnalysisResult:
                raise RuntimeError("internal failure")

        app = create_app(document_inference_service=_BoomService())
        client = TestClient(app)

        with open(image_path, "rb") as fh:
            response = client.post(
                "/api/v1/inference/document",
                files={"file": ("doc.png", fh, "image/png")},
            )

        assert response.status_code == 500
        body = response.json()
        assert "Traceback" not in str(body)
        assert "stack" not in str(body).lower()

    def test_health_endpoint_returns_ok(self) -> None:
        app = create_app(document_inference_service=_MockDocumentInferenceService())
        client = TestClient(app)

        response = client.get("/api/v1/health")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["service"] == "ai-ml-inference"
