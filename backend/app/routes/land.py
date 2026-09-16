"""Unified Land Intelligence API routes.

Exposes a single aggregated view of everything the system knows about one
parcel, keyed by its ULPIN: administrative context, ownership, mutation
history, AI assessment signals, and the reconciled conflict report — each
value accompanied by the provenance recorded at extraction time.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Landholder, Parcel, _deserialize
from backend.app.repositories import (
    LandRecordRepository,
    ParcelRepository,
    load_record_analysis,
)
from backend.app.schemas import (
    AssessmentView,
    ConflictReportResponse,
    LandholderView,
    LandIntelligenceResponse,
    MutationView,
    ParcelView,
)
from backend.app.services.conflict import ConflictEngine, build_conflict_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["land"])


def _parcel_view(parcel: Parcel, is_match: bool = False) -> ParcelView:
    return ParcelView(
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
        provenance=_deserialize(parcel.provenance),
        is_match=is_match,
    )


def _landholder_view(holder: Landholder) -> LandholderView:
    return LandholderView(
        name=holder.name,
        father_or_husband_name=holder.father_or_husband_name,
        caste=holder.caste,
        address=holder.address,
        share=holder.share,
        is_cultivator=holder.is_cultivator,
        provenance=_deserialize(holder.provenance),
    )


@router.get("/land/{ulpin}", response_model=LandIntelligenceResponse)
def get_land_intelligence(
    ulpin: str,
    db: Session = Depends(get_db),
) -> LandIntelligenceResponse:
    """Resolve a ULPIN to the unified land intelligence view for its parcel.

    The ULPIN is an authoritative external identifier; this service never
    generates one. When no parcel carries the supplied ULPIN the endpoint
    returns 404 rather than falling back to a Khasra or village lookup, so a
    caller can never receive intelligence for a parcel it did not ask for.

    Conflicts are recomputed by the Conflict & Reconciliation Engine on every
    read, so the report is deterministic and always reflects the current rule
    set.
    """
    key = ulpin.strip()
    if not key:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_ulpin", "message": "ULPIN must not be empty."},
        )

    parcel = ParcelRepository(db).get_by_ulpin(key)
    if parcel is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "message": f"No parcel found for ULPIN '{key}'."},
        )

    record = LandRecordRepository(db).get(parcel.land_record_id)

    # Sorted by primary key so sibling parcels and owners are returned in a
    # stable order regardless of how the relationship was loaded.
    parcels = [
        _parcel_view(p, is_match=p.id == parcel.id)
        for p in sorted(record.parcels, key=lambda p: p.id)
    ]
    landholders = [
        _landholder_view(h) for h in sorted(record.landholders, key=lambda h: h.id)
    ]

    issues = ConflictEngine().run(load_record_analysis(record))

    return LandIntelligenceResponse(
        ulpin=key,
        record_id=record.id,
        document_id=record.document_id,
        document_type=record.document_type,
        year=record.year,
        state=record.state,
        district=record.district,
        tehsil=record.tehsil,
        village=record.village,
        khata_number=record.khata_number,
        khewat_number=record.khewat_number,
        khatoni_number=record.khatoni_number,
        parcel=_parcel_view(parcel, is_match=True),
        parcels=parcels,
        landholders=landholders,
        mutation=MutationView(
            mutation_number=record.mutation_number,
            mutation_date=record.mutation_date,
            mutation_details=record.mutation_details,
        ),
        assessment=AssessmentView(
            confidence_score=record.confidence_score,
            risk_level=record.risk_level,
            anomaly_score=record.anomaly_score,
            anomaly_risk=record.anomaly_risk,
            extraction_status=record.extraction_status,
            validation_error_count=record.validation_error_count or 0,
            validation_warning_count=record.validation_warning_count or 0,
            extractor_version=record.extractor_version,
        ),
        conflicts=ConflictReportResponse(**build_conflict_report(record.id, issues)),
        explainability_evidence=_deserialize(record.explainability_evidence),
    )
