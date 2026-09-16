"""Persistence layer for storing AnalysisResponse in the database."""

from __future__ import annotations

import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from backend.app.models import (
    Base,
    Conflict,
    Landholder,
    LandRecord,
    Parcel,
    _serialize,
    _deserialize,
)


def _extract_value(field: Any) -> Optional[str]:
    """Extract the string value from an ExtractedFieldSchema dict."""
    if field is None:
        return None
    if isinstance(field, dict):
        value = field.get("value")
        if value is None:
            return None
        return str(value)
    if hasattr(field, "value"):
        v = field.value
        return None if v is None else str(v)
    return None


def _extract_provenance(field: Any) -> Optional[str]:
    """Extract provenance JSON from an ExtractedFieldSchema dict."""
    if field is None:
        return None
    if isinstance(field, dict):
        prov = field.get("provenance")
        if prov is None:
            return None
        return json.dumps(prov, default=str)
    if hasattr(field, "provenance") and field.provenance is not None:
        return json.dumps(field.provenance.model_dump(), default=str)
    return None


def _metadata_to_dict(metadata: Any) -> dict[str, Any]:
    """Convert MetadataSchema to a flat dict."""
    if metadata is None:
        return {}
    if isinstance(metadata, dict):
        return metadata
    if hasattr(metadata, "model_dump"):
        return metadata.model_dump()
    return {}


def analysis_to_land_record(
    analysis: Any,
    db: Optional[Session] = None,
) -> LandRecord:
    """Convert an AnalysisResponse (dict or model) to a LandRecord entity.

    Args:
        analysis: AnalysisResponse dict or model.
        db: Optional SQLAlchemy session (not used here, for future use).

    Returns:
        LandRecord instance (not yet added to session).
    """
    if hasattr(analysis, "model_dump"):
        data = analysis.model_dump(mode="json")
    elif isinstance(analysis, dict):
        data = analysis
    else:
        data = {}

    extraction = data.get("extraction_result", {}) or {}
    metadata = extraction.get("metadata", {}) or {}

    record = LandRecord(
        document_id=_extract_value(metadata.get("document_id")),
        state=_extract_value(metadata.get("state")),
        district=_extract_value(metadata.get("district")),
        tehsil=_extract_value(metadata.get("tehsil")),
        village=_extract_value(metadata.get("village")),
        year=_extract_value(metadata.get("year")),
        document_type=_extract_value(metadata.get("document_type")),
        khata_number=_extract_value(metadata.get("khata_number")),
        khewat_number=_extract_value(metadata.get("khewat_number")),
        khatoni_number=_extract_value(metadata.get("khatoni_number")),
        mutation_number=_extract_value(metadata.get("mutation_number")),
        mutation_date=_extract_value(metadata.get("mutation_date")),
        mutation_details=_extract_value(metadata.get("mutation_details")),
        extraction_status=extraction.get("status", "success"),
        confidence_score=data.get("confidence_score"),
        risk_level=data.get("extraction_risk"),
        anomaly_score=data.get("anomaly_score"),
        anomaly_risk=data.get("anomaly_risk"),
        validation_error_count=extraction.get("validation_error_count", 0),
        validation_warning_count=extraction.get("validation_warning_count", 0),
        extractor_version=extraction.get("extractor_version"),
        raw_analysis=json.dumps(data, default=str),
        explainability_evidence=_serialize(data.get("explainability_evidence")),
    )

    # Landholders
    for holder in extraction.get("landholders", []) or []:
        record.landholders.append(
            Landholder(
                name=_extract_value(holder.get("name")),
                father_or_husband_name=_extract_value(holder.get("father_or_husband_name")),
                caste=_extract_value(holder.get("caste")),
                address=_extract_value(holder.get("address")),
                share=_extract_value(holder.get("share")),
                is_cultivator=_extract_value(holder.get("is_cultivator")),
                provenance=_extract_provenance(holder.get("name")),
            )
        )

    # Parcels
    for parcel in extraction.get("parcels", []) or []:
        area_raw = _extract_value(parcel.get("area_raw"))
        area_norm = parcel.get("area_normalized")
        if isinstance(area_norm, dict):
            area_norm = area_norm.get("value")
        try:
            area_norm = float(area_norm) if area_norm is not None else None
        except (TypeError, ValueError):
            area_norm = None

        record.parcels.append(
            Parcel(
                ulpin=_extract_value(parcel.get("ulpin")),
                khasra_number=_extract_value(parcel.get("khasra_number")),
                area_raw=area_raw,
                area_normalized=area_norm,
                area_unit=_extract_value(parcel.get("area_unit")),
                land_classification=_extract_value(parcel.get("land_classification")),
                land_type=_extract_value(parcel.get("land_type")),
                cultivation_status=_extract_value(parcel.get("cultivation_status")),
                irrigation_source=_extract_value(parcel.get("irrigation_source")),
                revenue=_extract_value(parcel.get("revenue")),
                remarks=_extract_value(parcel.get("remarks")),
                provenance=_extract_provenance(parcel.get("khasra_number")),
            )
        )

    # Conflicts
    for conflict in extraction.get("conflicts", []) or []:
        if isinstance(conflict, dict):
            record.conflicts.append(
                Conflict(
                    field=conflict.get("field"),
                    issue_type=conflict.get("type") or conflict.get("issue_type"),
                    severity=conflict.get("severity", "medium"),
                    message=conflict.get("message") or json.dumps(conflict, default=str),
                    evidence=_serialize(conflict),
                )
            )

    return record


def _wrap(value: Any, provenance: Any = None) -> Optional[dict[str, Any]]:
    """Rebuild an extracted-field wrapper from a persisted column value."""
    if value is None:
        return None
    field: dict[str, Any] = {"value": value}
    if isinstance(provenance, dict) and provenance:
        field["provenance"] = provenance
    return field


def _compact(mapping: dict[str, Any]) -> dict[str, Any]:
    """Drop keys whose rebuilt field wrapper is empty."""
    return {key: value for key, value in mapping.items() if value is not None}


_METADATA_FIELDS: tuple[str, ...] = (
    "document_id",
    "state",
    "district",
    "tehsil",
    "village",
    "year",
    "document_type",
    "khata_number",
    "khewat_number",
    "khatoni_number",
    "mutation_number",
    "mutation_date",
    "mutation_details",
)


def record_to_extraction(record: LandRecord) -> dict[str, Any]:
    """Rebuild an extraction-shaped view of a persisted :class:`LandRecord`.

    This is the fallback input for the Conflict & Reconciliation Engine when
    ``raw_analysis`` is unavailable, so records that exist only as relational
    rows can still be reconciled. Provenance is restored from the stored
    provenance columns and from persisted conflict evidence.
    """
    metadata = _compact(
        {name: _wrap(getattr(record, name, None)) for name in _METADATA_FIELDS}
    )

    landholders: list[dict[str, Any]] = []
    for holder in record.landholders:
        landholders.append(
            _compact(
                {
                    "name": _wrap(holder.name, _deserialize(holder.provenance)),
                    "father_or_husband_name": _wrap(holder.father_or_husband_name),
                    "caste": _wrap(holder.caste),
                    "address": _wrap(holder.address),
                    "share": _wrap(holder.share),
                    "is_cultivator": _wrap(holder.is_cultivator),
                }
            )
        )

    parcels: list[dict[str, Any]] = []
    for parcel in record.parcels:
        parcels.append(
            _compact(
                {
                    "ulpin": _wrap(parcel.ulpin),
                    "khasra_number": _wrap(
                        parcel.khasra_number, _deserialize(parcel.provenance)
                    ),
                    "area_raw": _wrap(parcel.area_raw),
                    "area_normalized": _wrap(parcel.area_normalized),
                    "area_unit": _wrap(parcel.area_unit),
                    "land_classification": _wrap(parcel.land_classification),
                    "land_type": _wrap(parcel.land_type),
                    "cultivation_status": _wrap(parcel.cultivation_status),
                    "irrigation_source": _wrap(parcel.irrigation_source),
                    "revenue": _wrap(parcel.revenue),
                    "remarks": _wrap(parcel.remarks),
                }
            )
        )

    conflicts: list[dict[str, Any]] = []
    for conflict in record.conflicts:
        evidence = _deserialize(conflict.evidence)
        entry = evidence if isinstance(evidence, dict) else {}
        rebuilt: dict[str, Any] = {
            "field": conflict.field,
            "type": conflict.issue_type,
            "severity": conflict.severity,
            "message": conflict.message,
        }
        if isinstance(entry.get("provenance"), dict):
            rebuilt["provenance"] = entry["provenance"]
        conflicts.append(rebuilt)

    return {
        "extraction_result": {
            "status": record.extraction_status or "success",
            "metadata": metadata,
            "landholders": landholders,
            "parcels": parcels,
            "conflicts": conflicts,
        }
    }


def load_record_analysis(record: LandRecord) -> dict[str, Any]:
    """Return the richest extraction view available for a persisted record.

    Prefers the original ``raw_analysis`` payload because it retains every
    field wrapper with full provenance; falls back to a view rebuilt from the
    relational rows.
    """
    raw = _deserialize(record.raw_analysis)
    if isinstance(raw, dict) and isinstance(raw.get("extraction_result"), dict):
        return raw
    return record_to_extraction(record)


class LandRecordRepository:
    """Repository for LandRecord CRUD operations."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, analysis: Any) -> LandRecord:
        """Persist an AnalysisResponse as a new LandRecord."""
        record = analysis_to_land_record(analysis)
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get(self, record_id: int) -> Optional[LandRecord]:
        """Get a LandRecord by ID."""
        return self.db.query(LandRecord).filter(LandRecord.id == record_id).first()

    def get_by_document_id(self, document_id: str) -> Optional[LandRecord]:
        """Get a LandRecord by document_id."""
        return (
            self.db.query(LandRecord)
            .filter(LandRecord.document_id == document_id)
            .first()
        )

    def list_all(
        self,
        limit: int = 100,
        offset: int = 0,
    ) -> list[LandRecord]:
        """List all LandRecords with pagination."""
        return (
            self.db.query(LandRecord)
            .order_by(LandRecord.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    def delete(self, record_id: int) -> bool:
        """Delete a LandRecord by ID."""
        record = self.get(record_id)
        if record is None:
            return False
        self.db.delete(record)
        self.db.commit()
        return True


class ParcelRepository:
    """Repository for Parcel-centric retrieval operations."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_ulpin(self, ulpin: str) -> Optional[Parcel]:
        """Get a Parcel by its ULPIN (authoritative external identifier)."""
        return self.db.query(Parcel).filter(Parcel.ulpin == ulpin).first()

    def get_by_khasra(
        self,
        khasra_number: str,
        state: Optional[str] = None,
        district: Optional[str] = None,
        tehsil: Optional[str] = None,
        village: Optional[str] = None,
    ) -> list[Parcel]:
        """Get Parcels by khasra number and optional administrative location."""
        query = self.db.query(Parcel).filter(Parcel.khasra_number == khasra_number)

        location_filters = [
            condition
            for condition in (
                LandRecord.state == state if state is not None else None,
                LandRecord.district == district if district is not None else None,
                LandRecord.tehsil == tehsil if tehsil is not None else None,
                LandRecord.village == village if village is not None else None,
            )
            if condition is not None
        ]
        if location_filters:
            query = query.join(
                LandRecord, Parcel.land_record_id == LandRecord.id
            ).filter(*location_filters)

        return query.all()

    def get_by_land_record_id(self, record_id: int) -> list[Parcel]:
        """Get all Parcels for a given LandRecord."""
        return self.db.query(Parcel).filter(Parcel.land_record_id == record_id).all()