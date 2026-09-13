"""AI inference HTTP client."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from ai_ml.api.schemas import AnalysisResponseSchema
from ai_ml.client.exceptions import (
    AIClientConnectionError,
    AIClientHTTPError,
    AIClientResponseError,
    AIClientTimeoutError,
)


class AIInferenceClient:
    """Lightweight client for the AI document inference API.

    Example:
        client = AIInferenceClient(base_url="http://localhost:8000")
        result = client.infer_document("scan.png")
        print(result.confidence_score)
    """

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        timeout: float = 60.0,
    ) -> None:
        """Initialize the client.

        Args:
            base_url: Base URL of the AI inference service.
            timeout: Request timeout in seconds.
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def infer_document(self, file_path: str | Path) -> AnalysisResponseSchema:
        """Upload a document/image and return the AI analysis result.

        Args:
            file_path: Path to the document image file.

        Returns:
            Parsed API response model.

        Raises:
            AIClientConnectionError: If the service is unreachable.
            AIClientTimeoutError: If the request exceeds the timeout.
            AIClientHTTPError: If the server returns a 4xx/5xx status.
            AIClientResponseError: If the response is malformed or fails schema validation.
        """
        path = Path(file_path)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"File not found: {file_path}")

        url = f"{self.base_url}/api/v1/inference/document"

        with open(path, "rb") as fh:
            file_bytes = fh.read()

        files = {
            "file": (
                path.name,
                file_bytes,
                self._guess_mime_type(path),
            ),
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, files=files)
        except httpx.TimeoutException as exc:
            raise AIClientTimeoutError("Request to AI service timed out.") from exc
        except httpx.ConnectError as exc:
            raise AIClientConnectionError("Could not connect to AI service.") from exc
        except httpx.HTTPError as exc:
            raise AIClientConnectionError("HTTP client error while calling AI service.") from exc

        if response.status_code >= 400:
            body = self._safe_json(response)
            raise AIClientHTTPError(status_code=response.status_code, body=body)

        try:
            payload = response.json()
        except ValueError as exc:
            raise AIClientResponseError("Malformed JSON response from AI service.") from exc

        try:
            return AnalysisResponseSchema.model_validate(payload)
        except Exception as exc:
            raise AIClientResponseError("Response schema validation failed.") from exc

    @staticmethod
    def _guess_mime_type(path: Path) -> str:
        """Guess a MIME type from file extension."""
        suffix = path.suffix.lower()
        mapping = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".bmp": "image/bmp",
            ".tiff": "image/tiff",
            ".tif": "image/tiff",
        }
        return mapping.get(suffix, "application/octet-stream")

    @staticmethod
    def _safe_json(response: httpx.Response) -> object | None:
        """Extract JSON body safely without exposing sensitive content."""
        try:
            return response.json()
        except ValueError:
            return None
