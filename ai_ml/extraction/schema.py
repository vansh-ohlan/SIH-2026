"""Extraction schema for Rajasthan Jamabandi / RoR records."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class ExtractionMethod(str, Enum):
    """Enumeration of extraction method types."""

    LABEL = "label"
    REGEX = "regex"
    SPATIAL = "spatial"
    TABLE = "table"
    ML = "ml"
    LLM = "llm"
    MANUAL = "manual"
    UNKNOWN = "unknown"


class FieldProvenance(BaseModel):
    """Provenance metadata for an extracted field.

    This allows every extracted value to be traced back to its OCR source
    and extraction method.
    """

    source_ocr_text: Optional[str] = Field(
        default=None,
        description="Raw OCR text from which this field was extracted.",
    )
    source_bbox: Optional[tuple[int, int, int, int]] = Field(
        default=None,
        description="Bounding box (x1, y1, x2, y2) of the source OCR text.",
    )
    page_number: Optional[int] = Field(
        default=None,
        description="Page number where the source text was found.",
    )
    ocr_confidence: Optional[float] = Field(
        default=None,
        description="OCR engine confidence for the source text, in [0.0, 1.0].",
    )
    extraction_confidence: Optional[float] = Field(
        default=None,
        description="Confidence that the extracted value is correct, in [0.0, 1.0].",
    )
    extraction_method: ExtractionMethod = Field(
        default=ExtractionMethod.UNKNOWN,
        description="Method used to extract this field.",
    )
    extractor_version: Optional[str] = Field(
        default=None,
        description="Version of the extractor that produced this field.",
    )
    notes: Optional[str] = Field(
        default=None,
        description="Additional notes about this extraction.",
    )

    model_config = {"use_enum_values": True}


class ExtractedField(BaseModel):
    """A single extracted field with its value and provenance."""

    value: Any = Field(
        description="The extracted value. None if the field is missing or unknown.",
    )
    provenance: Optional[FieldProvenance] = Field(
        default=None,
        description="Provenance metadata for this field.",
    )


class Landholder(BaseModel):
    """Represents a landholder / owner."""

    name: Optional[ExtractedField] = Field(
        default=None,
        description="Name of the landholder.",
    )
    father_or_husband_name: Optional[ExtractedField] = Field(
        default=None,
        description="Father's or husband's name.",
    )
    caste: Optional[ExtractedField] = Field(
        default=None,
        description="Caste or social category as recorded.",
    )
    address: Optional[ExtractedField] = Field(
        default=None,
        description="Address of the landholder.",
    )
    share: Optional[ExtractedField] = Field(
        default=None,
        description="Ownership share (e.g., fractional).",
    )
    is_cultivator: Optional[ExtractedField] = Field(
        default=None,
        description="Whether this person is also the cultivator.",
    )


class Parcel(BaseModel):
    """Represents a single land parcel / Khasra entry."""

    khasra_number: Optional[ExtractedField] = Field(
        default=None,
        description="Khasra / survey number.",
    )
    area_raw: Optional[ExtractedField] = Field(
        default=None,
        description="Raw area string exactly as printed (e.g., '2-5-10').",
    )
    area_normalized: Optional[ExtractedField] = Field(
        default=None,
        description="Normalized area value, if available. Do not perform legal conversion here.",
    )
    area_unit: Optional[ExtractedField] = Field(
        default=None,
        description="Unit of area (e.g., Bigha, Biswa, Biswansi, Hectare).",
    )
    land_classification: Optional[ExtractedField] = Field(
        default=None,
        description="Type of land (e.g., irrigated, unirrigated, barren).",
    )
    land_type: Optional[ExtractedField] = Field(
        default=None,
        description="Land type / Kism (e.g., agricultural, non-agricultural).",
    )
    cultivation_status: Optional[ExtractedField] = Field(
        default=None,
        description="Current cultivation status (e.g., under cultivation, fallow).",
    )
    irrigation_source: Optional[ExtractedField] = Field(
        default=None,
        description="Source of irrigation (e.g., tubewell, canal, rainfed).",
    )
    revenue: Optional[ExtractedField] = Field(
        default=None,
        description="Land revenue or rent amount.",
    )
    remarks: Optional[ExtractedField] = Field(
        default=None,
        description="Parcel-specific remarks.",
    )


class RoRMetadata(BaseModel):
    """Document-level metadata for a Jamabandi / RoR record."""

    document_id: Optional[ExtractedField] = Field(
        default=None,
        description="Unique document identifier.",
    )
    state: Optional[ExtractedField] = Field(
        default=None,
        description="State name.",
    )
    district: Optional[ExtractedField] = Field(
        default=None,
        description="District name.",
    )
    tehsil: Optional[ExtractedField] = Field(
        default=None,
        description="Tehsil / sub-district name.",
    )
    village: Optional[ExtractedField] = Field(
        default=None,
        description="Village / Mouja name.",
    )
    year: Optional[ExtractedField] = Field(
        default=None,
        description="Patwari / revision year.",
    )
    document_type: Optional[ExtractedField] = Field(
        default=None,
        description="Document type (e.g., khata, khasra).",
    )
    khata_number: Optional[ExtractedField] = Field(
        default=None,
        description="Khata / account number.",
    )
    khewat_number: Optional[ExtractedField] = Field(
        default=None,
        description="Khewat / ownership account number.",
    )
    khatoni_number: Optional[ExtractedField] = Field(
        default=None,
        description="Khatoni / holding number within a Khewat.",
    )
    mutation_number: Optional[ExtractedField] = Field(
        default=None,
        description="Mutation / transfer reference number.",
    )
    mutation_date: Optional[ExtractedField] = Field(
        default=None,
        description="Date of mutation.",
    )
    mutation_details: Optional[ExtractedField] = Field(
        default=None,
        description="Details of mutation.",
    )
    state_specific_fields: dict[str, Any] = Field(
        default_factory=dict,
        description="Extensible mapping for state-specific fields.",
    )


class RoRRecord(BaseModel):
    """Structured representation of a Rajasthan Jamabandi / RoR record.

    This schema is designed to be:
    - Conservative: missing fields are represented as None, not guessed.
    - Auditable: every field carries provenance metadata.
    - Extensible: state-specific fields can be added without breaking the core schema.
    - Multi-parcel: a single record can contain multiple parcels.
    """

    metadata: RoRMetadata = Field(
        default_factory=RoRMetadata,
        description="Document-level metadata.",
    )
    landholders: list[Landholder] = Field(
        default_factory=list,
        description="List of landholders / owners.",
    )
    parcels: list[Parcel] = Field(
        default_factory=list,
        description="List of land parcels / Khasra entries.",
    )
    document_remarks: Optional[ExtractedField] = Field(
        default=None,
        description="Document-level remarks.",
    )
    unrecognized_text: list[str] = Field(
        default_factory=list,
        description="OCR text that could not be mapped to any known field.",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Warnings generated during extraction.",
    )


class ExtractionResult(BaseModel):
    """Top-level result of the extraction pipeline."""

    record: Optional[RoRRecord] = Field(
        default=None,
        description="The extracted RoR record, if extraction succeeded.",
    )
    status: str = Field(
        default="success",
        description="Extraction status: success, partial, failure.",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Global warnings about the extraction.",
    )
    extractor_version: Optional[str] = Field(
        default=None,
        description="Version of the extraction pipeline.",
    )
    raw_ocr_result_summary: Optional[dict[str, Any]] = Field(
        default=None,
        description="Summary of the raw OCR result for auditability.",
    )
    conflicts: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Conflicting values from different extractors for the same field.",
    )
