"""E2E Integration Test Harness for AI Document Inference.

This module provides the integration boundary harness between the backend
and the AI FastAPI service. It handles readiness verification, multipart file
upload, API contract validation, and human-readable result reporting.

Environment Variables:
    AI_SERVICE_URL: Base URL of the AI FastAPI service (default: http://localhost:8000)
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx

# Default AI Service URL
DEFAULT_AI_SERVICE_URL = "http://localhost:8000"

# Contract required top-level keys for POST /api/v1/inference/document
EXPECTED_TOP_LEVEL_KEYS = {
    "extraction_result",
    "confidence_score",
    "extraction_risk",
    "anomaly_score",
    "anomaly_risk",
}

EXPECTED_EXTRACTION_KEYS = {
    "status",
    "metadata",
    "landholders",
    "parcels",
    "unrecognized_text",
    "warnings",
    "validation_error_count",
    "validation_warning_count",
}


class AIServiceIntegrationError(Exception):
    """Base exception for AI Service Integration failures."""


class AIServiceUnreachableError(AIServiceIntegrationError):
    """Raised when the AI Service cannot be reached or readiness check fails."""


class AIContractValidationError(AIServiceIntegrationError):
    """Raised when the AI Service response fails top-level API contract validation."""


class AIDocumentIntegrationHarness:
    """Backend Integration Harness for AI Document Inference Service."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: float = 60.0,
    ) -> None:
        """Initialize the harness.

        Args:
            base_url: Base URL for AI service. Reads AI_SERVICE_URL env var if not set.
            timeout: HTTP request timeout in seconds.
        """
        raw_url = base_url or os.getenv("AI_SERVICE_URL", DEFAULT_AI_SERVICE_URL)
        self.base_url = raw_url.rstrip("/")
        self.timeout = timeout

    def check_health(self) -> Dict[str, Any]:
        """Check the AI service health endpoint GET /api/v1/health.

        Returns:
            Dict containing health status response.

        Raises:
            AIServiceUnreachableError: If health check fails or endpoint unreachable.
        """
        url = f"{self.base_url}/api/v1/health"
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url)
                if res.status_code == 200:
                    return res.json()
                raise AIServiceUnreachableError(
                    f"Health endpoint returned status code {res.status_code}: {res.text}"
                )
        except httpx.RequestError as exc:
            raise AIServiceUnreachableError(
                f"Could not connect to AI service health endpoint at {url}.\n"
                "To start the AI service locally, run:\n"
                "  python -m uvicorn ai_ml.api.server:create_app --factory --host 0.0.0.0 --port 8000\n"
                "or ensure AI_SERVICE_URL is set correctly."
            ) from exc

    def check_readiness(self) -> Tuple[bool, Dict[str, Any]]:
        """Check the AI service readiness endpoint GET /api/v1/ready.

        Returns:
            Tuple of (is_ready: bool, details_dict).

        Raises:
            AIServiceUnreachableError: If connection fails.
        """
        url = f"{self.base_url}/api/v1/ready"
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    is_ready = data.get("status") == "ready"
                    return is_ready, data
                raise AIServiceUnreachableError(
                    f"Readiness endpoint returned HTTP {res.status_code}"
                )
        except httpx.RequestError as exc:
            raise AIServiceUnreachableError(
                f"Could not connect to AI service readiness endpoint at {url}.\n"
                "To start the AI service locally, run:\n"
                "  python -m uvicorn ai_ml.api.server:create_app --factory --host 0.0.0.0 --port 8000\n"
                "or set AI_SERVICE_URL environment variable to a running instance."
            ) from exc

    def run_document_inference(self, file_path: str | Path) -> Dict[str, Any]:
        """Send local document image to POST /api/v1/inference/document and return response.

        Args:
            file_path: Local file path to scanned RoR / Jamabandi image.

        Returns:
            Validated response dict matching API contract.

        Raises:
            FileNotFoundError: If file_path does not exist.
            AIServiceUnreachableError: If AI service is unreachable or unready.
            AIContractValidationError: If response contract validation fails.
        """
        path = Path(file_path).resolve()
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"Specified document file does not exist: {path}")

        # Step 1: Health & Readiness check
        try:
            ready, details = self.check_readiness()
            if not ready:
                checks = details.get("checks", {})
                failed_checks = [k for k, v in checks.items() if v is not True]
                raise AIServiceUnreachableError(
                    f"AI service at {self.base_url} is NOT ready.\n"
                    f"Failed checks: {failed_checks}\n"
                    "Please verify required dependencies are installed and configured."
                )
        except AIServiceUnreachableError:
            # Re-raise with full actionable instructions
            raise

        # Step 2: Perform multipart/form-data upload to POST /api/v1/inference/document
        url = f"{self.base_url}/api/v1/inference/document"
        mime_type = self._guess_mime(path)

        with open(path, "rb") as fh:
            files = {"file": (path.name, fh, mime_type)}
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(url, files=files)
            except httpx.RequestError as exc:
                raise AIServiceUnreachableError(
                    f"Error connecting to AI service at {url}: {exc}"
                ) from exc

        # Step 3: Check HTTP status
        if response.status_code != 200:
            error_data = self._safe_json(response)
            raise AIContractValidationError(
                f"AI service inference failed with status {response.status_code}: {error_data}"
            )

        payload = response.json()

        # Step 4: Validate top-level contract
        self.validate_contract(payload)

        return payload

    def validate_contract(self, response_data: Dict[str, Any]) -> None:
        """Validate that response_data satisfies top-level API contract.

        Args:
            response_data: Parsed JSON response.

        Raises:
            AIContractValidationError: If keys or types are missing/invalid.
        """
        missing_top = EXPECTED_TOP_LEVEL_KEYS - set(response_data.keys())
        if missing_top:
            raise AIContractValidationError(
                f"Missing required top-level contract keys: {sorted(missing_top)}"
            )

        extraction_result = response_data.get("extraction_result")
        if not isinstance(extraction_result, dict):
            raise AIContractValidationError(
                "'extraction_result' must be a JSON object"
            )

        missing_ext = EXPECTED_EXTRACTION_KEYS - set(extraction_result.keys())
        if missing_ext:
            raise AIContractValidationError(
                f"Missing required extraction_result keys: {sorted(missing_ext)}"
            )

    @staticmethod
    def print_sanitized_summary(
        file_path: str | Path,
        result: Dict[str, Any],
        base_url: str,
    ) -> None:
        """Print a concise, human-readable summary of the response.

        Protects sensitive document contents and PII by printing metadata counts
        and summary metrics rather than raw extracted text.
        """
        ext = result["extraction_result"]
        meta = ext.get("metadata") or {}
        landholders = ext.get("landholders") or []
        parcels = ext.get("parcels") or []
        warnings = ext.get("warnings") or []

        doc_type = (meta.get("document_type") or {}).get("value", "Unknown")
        state = (meta.get("state") or {}).get("value", "N/A")
        district = (meta.get("district") or {}).get("value", "N/A")

        print("\n========================================================")
        print("          AI DOCUMENT INFERENCE INTEGRATION RESULT       ")
        print("========================================================")
        print(f" Target Service URL   : {base_url}")
        print(f" Document Source      : {Path(file_path).name}")
        print(f" Processing Status    : {ext.get('status', 'unknown').upper()}")
        print("--------------------------------------------------------")
        print(f" Overall Confidence   : {result.get('confidence_score', 'N/A')}")
        print(f" Extraction Risk      : {str(result.get('extraction_risk')).upper()}")
        print(f" Anomaly Risk         : {str(result.get('anomaly_risk')).upper()}")
        print(f" Anomaly Score        : {result.get('anomaly_score', 'N/A')}")
        print("--------------------------------------------------------")
        print(f" Inferred Doc Type    : {doc_type}")
        print(f" Jurisdiction         : {state}, {district}")
        print(f" Extracted Landholders: {len(landholders)} record(s)")
        print(f" Extracted Parcels    : {len(parcels)} record(s)")
        print(f" Validation Errors    : {ext.get('validation_error_count', 0)}")
        print(f" Validation Warnings  : {ext.get('validation_warning_count', 0)}")
        if warnings:
            print(f" System Warnings      : {len(warnings)} reported")
        print("--------------------------------------------------------")
        print(" Privacy Note: Raw PII (names, shares, raw OCR) hidden.")
        print(" Contract Validation  : PASSED SUCCESSFUL")
        print("========================================================\n")

    @staticmethod
    def _guess_mime(path: Path) -> str:
        ext = path.suffix.lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".bmp": "image/bmp",
            ".tiff": "image/tiff",
            ".tif": "image/tiff",
        }
        return mime_map.get(ext, "application/octet-stream")

    @staticmethod
    def _safe_json(response: httpx.Response) -> Any:
        try:
            return response.json()
        except Exception:
            return response.text


def main() -> None:
    """CLI entry point for running the E2E Integration Harness."""
    parser = argparse.ArgumentParser(
        description="Run Backend E2E Integration test against AI Document Inference Service."
    )
    parser.add_argument(
        "--file",
        "-f",
        required=True,
        help="Path to local scanned RoR / Jamabandi image (e.g. C:\\tmp\\ror_sample.png)",
    )
    parser.add_argument(
        "--url",
        "-u",
        default=None,
        help="AI Service Base URL (overrides AI_SERVICE_URL env var)",
    )

    args = parser.parse_args()

    harness = AIDocumentIntegrationHarness(base_url=args.url)
    target_url = harness.base_url

    print(f"[E2E Harness] Checking service health & readiness at {target_url}...")
    try:
        result = harness.run_document_inference(args.file)
        harness.print_sanitized_summary(args.file, result, target_url)
        sys.exit(0)
    except AIServiceUnreachableError as err:
        print(f"\n[E2E Harness ERROR] Service Unreachable / Unready:\n{err}", file=sys.stderr)
        sys.exit(2)
    except AIContractValidationError as err:
        print(f"\n[E2E Harness ERROR] Contract Validation Failed:\n{err}", file=sys.stderr)
        sys.exit(3)
    except Exception as err:
        print(f"\n[E2E Harness ERROR] Unexpected Failure:\n{err}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
