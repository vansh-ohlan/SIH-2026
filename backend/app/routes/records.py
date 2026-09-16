"""Persistence routes for storing and retrieving land records."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.db import get_db, init_db
from backend.app.models import LandRecord, Parcel
from backend.app.repositories import (
    LandRecordRepository,
    ParcelRepository,
    load_record_analysis,
)
from backend.app.schemas import ConflictReportResponse
from backend.app.services.conflict import ConflictEngine, build_conflict_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["records"])


class LandRecordResponse(BaseModel):
    """Response model for a persisted land record."""

    id: int
    document_id: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    tehsil: Optional[str] = None
    village: Optional[str] = None
    confidence_score: Optional[float] = None
    risk_level: Optional[str] = None
    created_at: Optional[str] = None
    landholders_count: int = 0
    parcels_count: int = 0
    conflicts_count: int = 0


class LandRecordDetailResponse(LandRecordResponse):
    """Detailed response including raw analysis data."""

    raw_analysis: Optional[str] = None
    explainability_evidence: Optional[str] = None


class ParcelResponse(BaseModel):
    """Response model for a parcel."""

    id: int
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
    provenance: Optional[str] = None


class ParcelSearchResponse(BaseModel):
    """Response model for parcel search results."""

    parcels: list[ParcelResponse] = Field(default_factory=list)
    land_records: list[LandRecordResponse] = Field(default_factory=list)
    total: int = 0
    message: Optional[str] = None


@router.post("/records", response_model=LandRecordResponse)
def create_land_record(
    analysis: dict,
    db: Session = Depends(get_db),
) -> LandRecordResponse:
    """Persist an AnalysisResponse as a new LandRecord.

    Args:
        analysis: AnalysisResponse dict from the AI service.
        db: Database session.

    Returns:
        Persisted LandRecord.
    """
    repo = LandRecordRepository(db)
    try:
        record = repo.create(analysis)
    except Exception as exc:
        logger.error("Failed to persist land record: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"error": "persistence_failed", "message": "Failed to store land record."},
        ) from exc

    return LandRecordResponse(
        id=record.id,
        document_id=record.document_id,
        state=record.state,
        district=record.district,
        tehsil=record.tehsil,
        village=record.village,
        confidence_score=record.confidence_score,
        risk_level=record.risk_level,
        created_at=record.created_at.isoformat() if record.created_at else None,
        landholders_count=len(record.landholders),
        parcels_count=len(record.parcels),
        conflicts_count=len(record.conflicts),
    )


@router.get("/records/{record_id}", response_model=LandRecordDetailResponse)
def get_land_record(
    record_id: int,
    db: Session = Depends(get_db),
) -> LandRecordDetailResponse:
    """Get a persisted LandRecord by ID."""
    repo = LandRecordRepository(db)
    record = repo.get(record_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "message": f"Land record {record_id} not found."},
        )

    return LandRecordDetailResponse(
        id=record.id,
        document_id=record.document_id,
        state=record.state,
        district=record.district,
        tehsil=record.tehsil,
        village=record.village,
        confidence_score=record.confidence_score,
        risk_level=record.risk_level,
        created_at=record.created_at.isoformat() if record.created_at else None,
        landholders_count=len(record.landholders),
        parcels_count=len(record.parcels),
        conflicts_count=len(record.conflicts),
        raw_analysis=record.raw_analysis,
        explainability_evidence=record.explainability_evidence,
    )


@router.get("/records/{record_id}/conflicts", response_model=ConflictReportResponse)
def get_record_conflicts(
    record_id: int,
    db: Session = Depends(get_db),
) -> ConflictReportResponse:
    """Run the Conflict & Reconciliation Engine over a persisted land record.

    Findings are recomputed on read rather than served from the stored
    ``conflicts`` rows, so the response always reflects the current rule set
    and stays deterministic for the same input. Conflicts originally reported
    by the AI extraction stage are carried through unchanged under the
    ``ai_extraction_conflict`` rule, each keeping its evidence and provenance.

    Results are ordered by severity (most severe first), then rule order, then
    field, issue type, and message.
    """
    repo = LandRecordRepository(db)
    record = repo.get(record_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "not_found",
                "message": f"Land record {record_id} not found.",
            },
        )

    issues = ConflictEngine().run(load_record_analysis(record))
    return ConflictReportResponse(**build_conflict_report(record.id, issues))


@router.get("/records", response_model=list[LandRecordResponse])
def list_land_records(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> list[LandRecordResponse]:
    """List all persisted LandRecords."""
    repo = LandRecordRepository(db)
    records = repo.list_all(limit=limit, offset=offset)
    result = []
    for r in records:
        result.append(LandRecordResponse(
            id=r.id,
            document_id=r.document_id,
            state=r.state,
            district=r.district,
            tehsil=r.tehsil,
            village=r.village,
            confidence_score=r.confidence_score,
            risk_level=r.risk_level,
            created_at=r.created_at.isoformat() if r.created_at else None,
            landholders_count=len(r.landholders),
            parcels_count=len(r.parcels),
            conflicts_count=len(r.conflicts),
        ))
    return result


@router.get("/parcels/search", response_model=ParcelSearchResponse)
def search_parcels(
    ulpin: Optional[str] = Query(None, description="ULPIN (authoritative external identifier)"),
    khasra_number: Optional[str] = Query(None, description="Khasra number"),
    state: Optional[str] = Query(None, description="State"),
    district: Optional[str] = Query(None, description="District"),
    tehsil: Optional[str] = Query(None, description="Tehsil"),
    village: Optional[str] = Query(None, description="Village"),
    db: Session = Depends(get_db),
) -> ParcelSearchResponse:
    """Search parcels by ULPIN or khasra + administrative location.

    At least one of ULPIN or khasra_number must be provided.
    When khasra_number is used, administrative location fields narrow results.
    """
    parcel_repo = ParcelRepository(db)
    record_repo = LandRecordRepository(db)

    if ulpin is not None and ulpin.strip() != "":
        parcel = parcel_repo.get_by_ulpin(ulpin.strip())
        if parcel is None:
            return ParcelSearchResponse(
                parcels=[],
                land_records=[],
                total=0,
                message="ULPIN not found",
            )
        record = record_repo.get(parcel.land_record_id)
        return ParcelSearchResponse(
            parcels=[_parcel_to_response(parcel)],
            land_records=[_record_to_response(record)] if record else [],
            total=1,
        )

    if khasra_number is None or khasra_number.strip() == "":
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_search",
                "message": "Either ulpin or khasra_number must be provided.",
            },
        )

    parcels = parcel_repo.get_by_khasra(
        khasra_number=khasra_number.strip(),
        state=state,
        district=district,
        tehsil=tehsil,
        village=village,
    )

    if not parcels:
        return ParcelSearchResponse(
            parcels=[],
            land_records=[],
            total=0,
            message="No parcels found matching the search criteria.",
        )

    records = []
    seen_ids = set()
    for p in parcels:
        if p.land_record_id not in seen_ids:
            rec = record_repo.get(p.land_record_id)
            if rec:
                records.append(_record_to_response(rec))
                seen_ids.add(p.land_record_id)

    return ParcelSearchResponse(
        parcels=[_parcel_to_response(p) for p in parcels],
        land_records=records,
        total=len(parcels),
    )


def _parcel_to_response(parcel: Parcel) -> ParcelResponse:
    return ParcelResponse(
        id=parcel.id,
        ulpin=parcel.ulpin,
        khasra_number=parcel.khasra_number,
        area_raw=parcel.area_raw,
        area_normalized=parcel.area_normalized,
        area_unit=parcel.area_unit,
        land_classification=parcel.land_classification,
        land_type=parcel.land_type,
        cultivation_status=parcel.cultivation_status,
        irrigation_source=parcel.irrigation_source,
        revenue=parcel.revenue,
        remarks=parcel.remarks,
        provenance=parcel.provenance,
    )


def _record_to_response(record: LandRecord) -> LandRecordResponse:
    return LandRecordResponse(
        id=record.id,
        document_id=record.document_id,
        state=record.state,
        district=record.district,
        tehsil=record.tehsil,
        village=record.village,
        confidence_score=record.confidence_score,
        risk_level=record.risk_level,
        created_at=record.created_at.isoformat() if record.created_at else None,
        landholders_count=len(record.landholders),
        parcels_count=len(record.parcels),
        conflicts_count=len(record.conflicts),
    )