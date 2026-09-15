"""Response schemas for the backend API gateway."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Backend health check response."""

    status: str
    service: str


class AIReadinessResponse(BaseModel):
    """AI service readiness response."""

    status: str
    service: str
    ai_service_url: Optional[str] = None
    error: Optional[str] = None


class BackendErrorResponse(BaseModel):
    """Standardized backend error response."""

    error: str
    message: str