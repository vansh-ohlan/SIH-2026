"""Persistence routes for storing and retrieving land records."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.db import get_db, init_db
from backend.app.models import LandRecord
from backend.app.repositories import LandRecordRepository

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


@router.get("/records", response_model=list[LandRecordResponse])
def list_land_records(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> list[LandRecordResponse]:
    """List all persisted LandRecords."""
    repo = LandRecordRepository(db)
    records = repo.list_all(limit=limit, offset=offset)
    return [
        LandRecordResponse(
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
        )
        for r in records
    ]