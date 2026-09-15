"""AI service client wrapper for the backend.

Uses the existing ai_ml.client.AIInferenceClient. The wrapper is injectable
so tests can replace it with a mock.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from ai_ml.client.client import AIInferenceClient
from ai_ml.client.exceptions import (
    AIClientConnectionError,
    AIClientHTTPError,
    AIClientResponseError,
    AIClientTimeoutError,
)
from ai_ml.api.schemas import AnalysisResponseSchema


class AIServiceError(Exception):
    """Base error for AI service failures in the backend."""


class AIServiceUnavailableError(AIServiceError):
    """AI service is unreachable or timed out."""


class AIServiceHTTPError(AIServiceError):
    """AI service returned an HTTP error response."""


class AIServiceResponseError(AIServiceError):
    """AI service returned an invalid response."""


class AIServiceWrapper:
    """Thin wrapper around AIInferenceClient for backend use.

    Args:
        client: Optional AIInferenceClient instance for dependency injection.
    """

    def __init__(self, client: Optional[AIInferenceClient] = None) -> None:
        self._client = client

    @property
    def client(self) -> AIInferenceClient:
        if self._client is None:
            raise RuntimeError("AI client not configured")
        return self._client

    def infer_document(self, file_path: str | Path) -> AnalysisResponseSchema:
        """Run AI document inference.

        Args:
            file_path: Path to the uploaded document image.

        Returns:
            AnalysisResponseSchema from the AI service.

        Raises:
            AIServiceUnavailableError: Connection/timeout failures.
            AIServiceHTTPError: HTTP 4xx/5xx from AI service.
            AIServiceResponseError: Invalid response from AI service.
        """
        try:
            return self.client.infer_document(file_path)
        except AIClientTimeoutError as exc:
            raise AIServiceUnavailableError("AI service request timed out.") from exc
        except AIClientConnectionError as exc:
            raise AIServiceUnavailableError("AI service is unreachable.") from exc
        except AIClientHTTPError as exc:
            raise AIServiceHTTPError(
                f"AI service returned HTTP {exc.status_code}."
            ) from exc
        except AIClientResponseError as exc:
            raise AIServiceResponseError(
                f"AI service returned invalid response: {exc}"
            ) from exc


def get_ai_service() -> AIServiceWrapper:
    """Dependency injection factory for the AI service wrapper."""
    return AIServiceWrapper()