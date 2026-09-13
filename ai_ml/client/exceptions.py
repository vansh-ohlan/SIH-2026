"""Client exceptions for the AI inference service."""

from __future__ import annotations


class AIClientError(Exception):
    """Base exception for AI inference client errors."""


class AIClientHTTPError(AIClientError):
    """Raised when the server returns an HTTP error status."""

    def __init__(self, status_code: int, body: object | None = None) -> None:
        self.status_code = status_code
        self.body = body
        super().__init__(f"HTTP {status_code}")


class AIClientTimeoutError(AIClientError):
    """Raised when the request times out."""


class AIClientConnectionError(AIClientError):
    """Raised when the client cannot connect to the AI service."""


class AIClientResponseError(AIClientError):
    """Raised when the response cannot be parsed or validated."""
