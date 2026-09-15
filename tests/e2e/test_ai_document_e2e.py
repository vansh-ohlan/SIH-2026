"""Pytest suite for Backend <-> AI Service Integration Harness.

Tests:
1. Unit tests for harness contract validation logic.
2. In-memory FastAPI application integration tests (using dummy dependency injection).
3. Live E2E test against running AI FastAPI service (auto-skipped if service is offline).
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any, Dict

import pytest
from PIL import Image

from tests.e2e.harness import (
    AIContractValidationError,
    AIDocumentIntegrationHarness,
    AIServiceUnreachableError,
)

# Optional import of AI FastAPI app for in-memory integration testing
try:
    from fastapi.testclient import TestClient
    from ai_ml.api.server import create_app
    from ai_ml.api.schemas import AnalysisResponseSchema, ExtractionResultSchema
    HAS_FASTAPI_APP = True
except ImportError:
    HAS_FASTAPI_APP = False


@pytest.fixture
def sample_image_path(tmp_path: Path) -> Path:
    """Create a temporary synthetic test image for integration testing."""
    img_path = tmp_path / "test_jamabandi.png"
    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    img.save(img_path)
    return img_path


@pytest.fixture
def mock_inference_service() -> Any:
    """Mock document inference service providing valid AnalysisResult contract."""
    class DummyAnalysisResult:
        def model_dump(self, mode: str = "json") -> Dict[str, Any]:
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

    class DummyService:
        def infer(self, file_path: Path) -> DummyAnalysisResult:
            return DummyAnalysisResult()

    return DummyService()


class TestHarnessContractValidation:
    """Test suite for contract validation logic in AIDocumentIntegrationHarness."""

    def test_harness_validates_valid_contract(self) -> None:
        harness = AIDocumentIntegrationHarness()
        valid_payload = {
            "extraction_result": {
                "status": "success",
                "metadata": {},
                "landholders": [],
                "parcels": [],
                "unrecognized_text": [],
                "warnings": [],
                "validation_error_count": 0,
                "validation_warning_count": 0,
            },
            "confidence_score": 0.9,
            "extraction_risk": "low",
            "anomaly_score": 0.1,
            "anomaly_risk": "low",
        }
        # Should not raise
        harness.validate_contract(valid_payload)

    def test_harness_rejects_missing_top_level_keys(self) -> None:
        harness = AIDocumentIntegrationHarness()
        invalid_payload = {
            "extraction_result": {},
            "confidence_score": 0.9,
            # missing extraction_risk, anomaly_score, anomaly_risk
        }
        with pytest.raises(AIContractValidationError, match="Missing required top-level contract keys"):
            harness.validate_contract(invalid_payload)

    def test_harness_rejects_invalid_extraction_result(self) -> None:
        harness = AIDocumentIntegrationHarness()
        invalid_payload = {
            "extraction_result": "not_a_dict",
            "confidence_score": 0.9,
            "extraction_risk": "low",
            "anomaly_score": 0.1,
            "anomaly_risk": "low",
        }
        with pytest.raises(AIContractValidationError, match="'extraction_result' must be a JSON object"):
            harness.validate_contract(invalid_payload)

    def test_harness_raises_file_not_found(self) -> None:
        harness = AIDocumentIntegrationHarness()
        non_existent_file = Path("C:/tmp/non_existent_ror_document.png")
        with pytest.raises(FileNotFoundError):
            harness.run_document_inference(non_existent_file)


@pytest.mark.skipif(not HAS_FASTAPI_APP, reason="FastAPI app factory not available")
class TestInMemoryFastAPIIntegration:
    """Integration test using in-process FastAPI TestClient with dummy service."""

    def test_in_process_inference(
        self, sample_image_path: Path, mock_inference_service: Any
    ) -> None:
        app = create_app(document_inference_service=mock_inference_service)
        client = TestClient(app)

        # 1. Health check
        health_res = client.get("/api/v1/health")
        assert health_res.status_code == 200
        assert health_res.json()["status"] == "ok"

        # 2. Document inference endpoint POST /api/v1/inference/document
        with open(sample_image_path, "rb") as fh:
            res = client.post(
                "/api/v1/inference/document",
                files={"file": (sample_image_path.name, fh, "image/png")},
            )
        assert res.status_code == 200
        payload = res.json()

        # 3. Validate harness contract check passes on real FastAPI response
        harness = AIDocumentIntegrationHarness()
        harness.validate_contract(payload)
        assert payload["extraction_result"]["status"] == "success"
        assert payload["confidence_score"] == 0.95


class TestLiveAIServiceE2E:
    """Live E2E test against external AI FastAPI service if currently running."""

    def test_live_e2e_inference(self, sample_image_path: Path) -> None:
        url = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
        harness = AIDocumentIntegrationHarness(base_url=url)

        try:
            harness.check_health()
        except AIServiceUnreachableError:
            pytest.skip(
                f"AI Service at {url} is not running. "
                "To run live E2E tests, start the server via: "
                "python -m uvicorn ai_ml.api.server:create_app --factory --port 8000"
            )

        # Run inference against live service
        result = harness.run_document_inference(sample_image_path)
        assert "extraction_result" in result
        assert "confidence_score" in result
