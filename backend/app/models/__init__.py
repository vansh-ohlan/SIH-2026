"""SQLAlchemy models for land-record persistence."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""


class LandRecord(Base):
    """Top-level entity for a single AI-processed document."""

    __tablename__ = "land_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    state: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    district: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    tehsil: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    village: Mapped[Optional[str]] = mapped_column(String(256), index=True)
    year: Mapped[Optional[str]] = mapped_column(String(16))
    document_type: Mapped[Optional[str]] = mapped_column(String(64))
    khata_number: Mapped[Optional[str]] = mapped_column(String(64))
    khewat_number: Mapped[Optional[str]] = mapped_column(String(64))
    khatoni_number: Mapped[Optional[str]] = mapped_column(String(64))
    mutation_number: Mapped[Optional[str]] = mapped_column(String(64))
    mutation_date: Mapped[Optional[str]] = mapped_column(String(32))
    mutation_details: Mapped[Optional[str]] = mapped_column(String(512))
    extraction_status: Mapped[Optional[str]] = mapped_column(String(32), default="success")
    confidence_score: Mapped[Optional[float]] = mapped_column(Float)
    risk_level: Mapped[Optional[str]] = mapped_column(String(16), index=True)
    anomaly_score: Mapped[Optional[float]] = mapped_column(Float)
    anomaly_risk: Mapped[Optional[str]] = mapped_column(String(16))
    validation_error_count: Mapped[int] = mapped_column(Integer, default=0)
    validation_warning_count: Mapped[int] = mapped_column(Integer, default=0)
    extractor_version: Mapped[Optional[str]] = mapped_column(String(64))
    raw_analysis: Mapped[Optional[str]] = mapped_column(Text)
    explainability_evidence: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )

    landholders: Mapped[list["Landholder"]] = relationship(
        back_populates="land_record",
        cascade="all, delete-orphan",
    )
    parcels: Mapped[list["Parcel"]] = relationship(
        back_populates="land_record",
        cascade="all, delete-orphan",
    )
    conflicts: Mapped[list["Conflict"]] = relationship(
        back_populates="land_record",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<LandRecord(id={self.id}, document_id={self.document_id!r})>"


class Landholder(Base):
    """Landholder / owner extracted from the document."""

    __tablename__ = "landholders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    land_record_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("land_records.id"), index=True
    )
    name: Mapped[Optional[str]] = mapped_column(String(512))
    father_or_husband_name: Mapped[Optional[str]] = mapped_column(String(512))
    caste: Mapped[Optional[str]] = mapped_column(String(256))
    address: Mapped[Optional[str]] = mapped_column(String(1024))
    share: Mapped[Optional[str]] = mapped_column(String(64))
    is_cultivator: Mapped[Optional[str]] = mapped_column(String(16))
    provenance: Mapped[Optional[str]] = mapped_column(Text)

    land_record: Mapped["LandRecord"] = relationship(back_populates="landholders")

    def __repr__(self) -> str:
        return f"<Landholder(id={self.id}, name={self.name!r})>"


class Parcel(Base):
    """Parcel / khasra extracted from the document."""

    __tablename__ = "parcels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    land_record_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("land_records.id"), index=True
    )
    khasra_number: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    area_raw: Mapped[Optional[str]] = mapped_column(String(256))
    area_normalized: Mapped[Optional[float]] = mapped_column(Float)
    area_unit: Mapped[Optional[str]] = mapped_column(String(32))
    land_classification: Mapped[Optional[str]] = mapped_column(String(256))
    land_type: Mapped[Optional[str]] = mapped_column(String(128))
    cultivation_status: Mapped[Optional[str]] = mapped_column(String(128))
    irrigation_source: Mapped[Optional[str]] = mapped_column(String(256))
    revenue: Mapped[Optional[str]] = mapped_column(String(256))
    remarks: Mapped[Optional[str]] = mapped_column(String(1024))
    provenance: Mapped[Optional[str]] = mapped_column(Text)

    land_record: Mapped["LandRecord"] = relationship(back_populates="parcels")

    def __repr__(self) -> str:
        return f"<Parcel(id={self.id}, khasra={self.khasra_number!r})>"


class Conflict(Base):
    """Conflict or validation issue detected during extraction."""

    __tablename__ = "conflicts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    land_record_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("land_records.id"), index=True
    )
    field: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    issue_type: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    severity: Mapped[Optional[str]] = mapped_column(String(16), index=True)
    message: Mapped[Optional[str]] = mapped_column(Text)
    evidence: Mapped[Optional[str]] = mapped_column(Text)

    land_record: Mapped["LandRecord"] = relationship(back_populates="conflicts")

    def __repr__(self) -> str:
        return f"<Conflict(id={self.id}, field={self.field!r}, severity={self.severity!r})>"


def _serialize(value: Any) -> Optional[str]:
    """Serialize a value to JSON string for storage."""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    try:
        return json.dumps(value, default=str)
    except (TypeError, ValueError):
        return str(value)


def _deserialize(text: Optional[str]) -> Any:
    """Deserialize a JSON string from storage."""
    if text is None:
        return None
    try:
        return json.loads(text)
    except (TypeError, ValueError, json.JSONDecodeError):
        return text