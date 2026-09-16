"""Response schemas for the backend API gateway."""

from __future__ import annotations

from typing import Any, Optional

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


class ConflictIssueResponse(BaseModel):
    """A single reconciled conflict finding.

    ``evidence`` always carries the values that motivated the finding together
    with their provenance, so a consumer can audit the result without
    re-reading the source document.
    """

    field: Optional[str] = None
    issue_type: str
    severity: str
    message: str
    rule: Optional[str] = None
    evidence: dict[str, Any] = Field(default_factory=dict)


class ConflictReportResponse(BaseModel):
    """Deterministic conflict report for one land record."""

    record_id: int
    total: int = 0
    severity_counts: dict[str, int] = Field(default_factory=dict)
    conflicts: list[ConflictIssueResponse] = Field(default_factory=list)


class LandholderView(BaseModel):
    """An owner/landholder with its extraction provenance."""

    name: Optional[str] = None
    father_or_husband_name: Optional[str] = None
    caste: Optional[str] = None
    address: Optional[str] = None
    share: Optional[str] = None
    is_cultivator: Optional[str] = None
    provenance: Optional[Any] = None


class ParcelView(BaseModel):
    """A parcel with its extraction provenance."""

    id: Optional[int] = None
    ulpin: Optional[str] = None
    khasra_number: Optional[str] = None
    area_raw: Optional[str] = None
    area_normalized: Optional[float] = None
    area_unit: Optional[str] = None
    land_classification: Optional[str] = None
    land_type: Optional[str] = None
    cultivation_status: Optional[str] = None
    irrigation_source: Optional[str] = None
    revenue: Optional[str] = None
    remarks: Optional[str] = None
    provenance: Optional[Any] = None
    is_match: bool = False


class MutationView(BaseModel):
    """Mutation (transfer) reference recorded on the land record."""

    mutation_number: Optional[str] = None
    mutation_date: Optional[str] = None
    mutation_details: Optional[str] = None


class AssessmentView(BaseModel):
    """AI assessment signals reported alongside the extraction."""

    confidence_score: Optional[float] = None
    risk_level: Optional[str] = None
    anomaly_score: Optional[float] = None
    anomaly_risk: Optional[str] = None
    extraction_status: Optional[str] = None
    validation_error_count: int = 0
    validation_warning_count: int = 0
    extractor_version: Optional[str] = None


class LandIntelligenceResponse(BaseModel):
    """Unified land intelligence view for one ULPIN."""

    ulpin: str
    record_id: Optional[int] = None
    document_id: Optional[str] = None
    document_type: Optional[str] = None
    year: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    tehsil: Optional[str] = None
    village: Optional[str] = None
    khata_number: Optional[str] = None
    khewat_number: Optional[str] = None
    khatoni_number: Optional[str] = None
    parcel: Optional[ParcelView] = None
    parcels: list[ParcelView] = Field(default_factory=list)
    landholders: list[LandholderView] = Field(default_factory=list)
    mutation: MutationView = Field(default_factory=MutationView)
    assessment: AssessmentView = Field(default_factory=AssessmentView)
    conflicts: Optional[ConflictReportResponse] = None
    explainability_evidence: Optional[Any] = None