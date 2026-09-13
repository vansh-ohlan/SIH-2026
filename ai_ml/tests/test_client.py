"""Tests for the AI inference HTTP client."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional
from unittest.mock import MagicMock, patch

import pytest
import httpx

from ai_ml.analysis.result import AnalysisResult
from ai_ml.api.schemas import AnalysisResponseSchema
from ai_ml.client.client import AIInferenceClient
from ai_ml.client.exceptions import (
    AIClientConnectionError,
    AIClientHTTPError,
    AIClientResponseError,
    AIClientTimeoutError,
)
from ai_ml.extraction.schema import ExtractionResult


def _build_success_payload(**overrides: Any) -> Dict[str, Any]:
    extraction = ExtractionResult(
        status="success",
        metadata=None,
        landholders=[],
        parcels=[],
        unrecognized_text=[],
        warnings=[],
        extractor_version="test",
        conflicts=[{"type": "area_mismatch"}],
        validation_error_count=0,
        validation_warning_count=1,
    )
    data: Dict[str, Any] = {
        "extraction_result": extraction.model_dump(mode="json"),
        "confidence_score": 0.88,
        "extraction_risk": "low",
        "anomaly_features": [0.1, -0.2, 0.05],
        "anomaly_score": 0.03,
        "anomaly_risk": "low",
        "explainability_evidence": {
            "fields": {"khasra_number": {"importance": 0.6}}
        },
    }
    data.update(overrides)
    return data


def _make_response(status_code: int, payload: Optional[Dict[str, Any]] = None, text: str = "") -> MagicMock:
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.headers = {}
    if payload is not None:
        response.json.return_value = payload
        response.text = json.dumps(payload)
    else:
        response.json.side_effect = ValueError("invalid json")
        response.text = text
    return response


class TestAIInferenceClient:
    def _write_dummy(self, tmp_path: Path, name: str = "doc.png") -> Path:
        file_path = tmp_path / name
        file_path.write_bytes(b"fake-image-bytes")
        return file_path

    def test_successful_document_inference(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        payload = _build_success_payload()
        response = _make_response(200, payload)
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", return_value=response):
            result = client.infer_document(file_path)

        assert isinstance(result, AnalysisResponseSchema)
        assert result.confidence_score == pytest.approx(0.88)
        assert result.extraction_risk == "low"

    def test_multipart_file_upload(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        payload = _build_success_payload()
        response = _make_response(200, payload)
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", return_value=response) as mock_post:
            client.infer_document(file_path)

        assert mock_post.called
        call_args = mock_post.call_args
        assert "files" in call_args.kwargs
        assert call_args.kwargs["files"]["file"][0] == "doc.png"
        assert call_args.args[0] == "http://localhost:8000/api/v1/inference/document"

    def test_endpoint_construction(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        payload = _build_success_payload()
        response = _make_response(200, payload)
        client = AIInferenceClient(base_url="http://localhost:8000/", timeout=30)

        with patch.object(httpx.Client, "post", return_value=response) as mock_post:
            client.infer_document(file_path)

        assert mock_post.call_args.args[0] == "http://localhost:8000/api/v1/inference/document"

    def test_configurable_base_url(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        payload = _build_success_payload()
        response = _make_response(200, payload)
        client = AIInferenceClient(base_url="http://ai:9000/v2")

        with patch.object(httpx.Client, "post", return_value=response) as mock_post:
            client.infer_document(file_path)

        assert mock_post.call_args.args[0] == "http://ai:9000/v2/api/v1/inference/document"

    def test_timeout_handling(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        client = AIInferenceClient(base_url="http://localhost:8000", timeout=0.1)

        with patch.object(httpx.Client, "post", side_effect=httpx.TimeoutException("boom")):
            with pytest.raises(AIClientTimeoutError):
                client.infer_document(file_path)

    def test_connection_failure(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", side_effect=httpx.ConnectError("boom")):
            with pytest.raises(AIClientConnectionError):
                client.infer_document(file_path)

    def test_http_400(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        response = _make_response(400, {"error": "missing_file", "message": "file required"})
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", return_value=response):
            with pytest.raises(AIClientHTTPError) as exc_info:
                client.infer_document(file_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.body == {"error": "missing_file", "message": "file required"}

    def test_http_422(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        response = _make_response(422, {"error": "unreadable_document", "message": "bad image"})
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", return_value=response):
            with pytest.raises(AIClientHTTPError) as exc_info:
                client.infer_document(file_path)

        assert exc_info.value.status_code == 422
        assert exc_info.value.body["error"] == "unreadable_document"

    def test_http_500(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        response = _make_response(500, {"error": "inference_failure", "message": "boom"})
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", return_value=response):
            with pytest.raises(AIClientHTTPError) as exc_info:
                client.infer_document(file_path)

        assert exc_info.value.status_code == 500
        assert exc_info.value.body["error"] == "inference_failure"

    def test_malformed_json_response(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        response = _make_response(200, text="not json")
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", return_value=response):
            with pytest.raises(AIClientResponseError, match="Malformed JSON"):
                client.infer_document(file_path)

    def test_invalid_response_schema(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        response = _make_response(200, {"unexpected": "shape"})
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", return_value=response):
            with pytest.raises(AIClientResponseError, match="schema validation"):
                client.infer_document(file_path)

    def test_complete_response_preserves_all_fields(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path)
        payload = _build_success_payload(
            confidence_score=0.92,
            extraction_risk="medium",
            anomaly_score=0.5,
            anomaly_risk="high",
        )
        response = _make_response(200, payload)
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", return_value=response):
            result = client.infer_document(file_path)

        assert result.confidence_score == pytest.approx(0.92)
        assert result.extraction_risk == "medium"
        assert result.anomaly_score == pytest.approx(0.5)
        assert result.anomaly_risk == "high"
        assert result.extraction_result.status == "success"
        assert result.extraction_result.validation_warning_count == 1
        assert result.extraction_result.conflicts == [{"type": "area_mismatch"}]
        assert result.explainability_evidence["fields"]["khasra_number"]["importance"] == pytest.approx(0.6)

    def test_sensitive_contents_not_leaked_in_errors(self, tmp_path: Path) -> None:
        file_path = self._write_dummy(tmp_path, "sensitive_scan.png")
        response = _make_response(500, {"error": "inference_failure", "message": "Document inference failed."})
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post", return_value=response):
            with pytest.raises(AIClientHTTPError) as exc_info:
                client.infer_document(file_path)

        message = str(exc_info.value)
        assert "sensitive_scan.png" not in message
        assert "password" not in message.lower()

    def test_file_not_found_raises_before_http_call(self, tmp_path: Path) -> None:
        client = AIInferenceClient(base_url="http://localhost:8000")

        with patch.object(httpx.Client, "post") as mock_post:
            with pytest.raises(FileNotFoundError):
                client.infer_document(tmp_path / "missing.png")

        assert not mock_post.called
