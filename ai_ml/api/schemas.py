"""API request/response schemas for the AI inference boundary."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class FieldProvenanceSchema(BaseModel):
    """Serialized provenance for an extracted field."""

    source_ocr_text: Optional[str] = None
    source_bbox: Optional[tuple[int, int, int, int]] = None
    page_number: Optional[int] = None
    ocr_confidence: Optional[float] = None
    extraction_confidence: Optional[float] = None
    extraction_method: Optional[str] = None
    extractor_version: Optional[str] = None
    notes: Optional[str] = None


class ExtractedFieldSchema(BaseModel):
    """Serialized extracted field."""

    value: Any = None
    provenance: Optional[FieldProvenanceSchema] = None


class LandholderSchema(BaseModel):
    """Serialized landholder."""

    name: Optional[ExtractedFieldSchema] = None
    father_or_husband_name: Optional[ExtractedFieldSchema] = None
    caste: Optional[ExtractedFieldSchema] = None
    address: Optional[ExtractedFieldSchema] = None
    share: Optional[ExtractedFieldSchema] = None
    is_cultivator: Optional[ExtractedFieldSchema] = None


class ParcelSchema(BaseModel):
    """Serialized parcel."""

    khasra_number: Optional[ExtractedFieldSchema] = None
    area_raw: Optional[ExtractedFieldSchema] = None
    area_normalized: Optional[ExtractedFieldSchema] = None
    area_unit: Optional[ExtractedFieldSchema] = None
    land_classification: Optional[ExtractedFieldSchema] = None
    land_type: Optional[ExtractedFieldSchema] = None
    cultivation_status: Optional[ExtractedFieldSchema] = None
    irrigation_source: Optional[ExtractedFieldSchema] = None
    revenue: Optional[ExtractedFieldSchema] = None
    remarks: Optional[ExtractedFieldSchema] = None


class MetadataSchema(BaseModel):
    """Serialized record metadata."""

    document_id: Optional[ExtractedFieldSchema] = None
    state: Optional[ExtractedFieldSchema] = None
    district: Optional[ExtractedFieldSchema] = None
    tehsil: Optional[ExtractedFieldSchema] = None
    village: Optional[ExtractedFieldSchema] = None
    year: Optional[ExtractedFieldSchema] = None
    document_type: Optional[ExtractedFieldSchema] = None
    khata_number: Optional[ExtractedFieldSchema] = None
    khewat_number: Optional[ExtractedFieldSchema] = None
    khatoni_number: Optional[ExtractedFieldSchema] = None
    mutation_number: Optional[ExtractedFieldSchema] = None
    mutation_date: Optional[ExtractedFieldSchema] = None
    mutation_details: Optional[ExtractedFieldSchema] = None


class ExtractionResultSchema(BaseModel):
    """Serialized extraction result."""

    status: str
    metadata: Optional[MetadataSchema] = None
    landholders: list[LandholderSchema] = Field(default_factory=list)
    parcels: list[ParcelSchema] = Field(default_factory=list)
    document_remarks: Optional[ExtractedFieldSchema] = None
    unrecognized_text: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    extractor_version: Optional[str] = None
    conflicts: list[dict[str, Any]] = Field(default_factory=list)
    validation_error_count: int = 0
    validation_warning_count: int = 0


class AnalysisResponseSchema(BaseModel):
    """Top-level API response for document inference."""

    extraction_result: ExtractionResultSchema
    confidence_score: Optional[float] = None
    extraction_risk: Optional[str] = None
    anomaly_features: Optional[list[float]] = None
    anomaly_score: Optional[float] = None
    anomaly_risk: Optional[str] = None
    explainability_evidence: Optional[dict[str, Any]] = None


class ErrorResponseSchema(BaseModel):
    """Standardized error response."""

    error: str
    message: str


class HealthResponseSchema(BaseModel):
    """Health check response."""

    status: str
    service: str


class ReadinessResponseSchema(BaseModel):
    """Readiness check response."""

    status: str
    service: str
    checks: dict[str, Any] = Field(default_factory=dict)
