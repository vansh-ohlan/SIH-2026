"""Tests for the persistence layer."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.main import create_app
from backend.app.db import SessionLocal, init_db, engine
from backend.app.models import Base, LandRecord, Landholder, Parcel, Conflict
from backend.app.repositories import LandRecordRepository, analysis_to_land_record


@pytest.fixture(autouse=True)
def clean_db():
    """Clean the database before each test."""
    Base.metadata.drop_all(bind=engine)
    init_db()
    yield
    Base.metadata.drop_all(bind=engine)


def _make_analysis_result(**overrides: Any) -> Dict[str, Any]:
    return {
        "extraction_result": {
            "status": "success",
            "metadata": {
                "document_id": {"value": "DOC-1"},
                "state": {"value": "Punjab"},
                "district": {"value": "Ludhiana"},
                "tehsil": {"value": "Ludhiana East"},
                "village": {"value": "Burj Littan"},
                "year": {"value": "2023-24"},
                "document_type": {"value": "Jamabandi"},
                "khata_number": {"value": "12"},
                "khewat_number": {"value": "5"},
            },
            "landholders": [
                {
                    "name": {"value": "Ramesh Kumar"},
                    "father_or_husband_name": {"value": "Suresh Kumar"},
                    "share": {"value": "1.0"},
                }
            ],
            "parcels": [
                {
                    "khasra_number": {"value": "142/1"},
                    "area_raw": {"value": "1000 sqm"},
                    "area_normalized": {"value": 1000.0},
                    "land_classification": {"value": "Irrigated"},
                    "irrigation_source": {"value": "Canal"},
                    "revenue": {"value": "500"},
                }
            ],
            "conflicts": [
                {
                    "field": "area",
                    "type": "area_mismatch",
                    "severity": "medium",
                    "message": "Area mismatch between RoR and map",
                }
            ],
            "validation_error_count": 1,
            "validation_warning_count": 2,
            "extractor_version": "1.0.0",
        },
        "confidence_score": 0.85,
        "extraction_risk": "medium",
        "anomaly_score": 0.3,
        "anomaly_risk": "high",
        "explainability_evidence": {"top_influences": [{"field": "area", "importance": 0.4}]},
    }


class TestAnalysisToLandRecord:
    def test_creates_land_record(self):
        analysis = _make_analysis_result()
        record = analysis_to_land_record(analysis)
        assert record.document_id == "DOC-1"
        assert record.state == "Punjab"
        assert record.district == "Ludhiana"
        assert record.confidence_score == 0.85
        assert record.risk_level == "medium"
        assert record.extraction_status == "success"
        assert record.validation_error_count == 1
        assert record.validation_warning_count == 2

    def test_creates_landholders(self):
        analysis = _make_analysis_result()
        record = analysis_to_land_record(analysis)
        assert len(record.landholders) == 1
        assert record.landholders[0].name == "Ramesh Kumar"
        assert record.landholders[0].father_or_husband_name == "Suresh Kumar"

    def test_creates_parcels(self):
        analysis = _make_analysis_result()
        record = analysis_to_land_record(analysis)
        assert len(record.parcels) == 1
        assert record.parcels[0].khasra_number == "142/1"
        assert record.parcels[0].area_normalized == 1000.0

    def test_creates_conflicts(self):
        analysis = _make_analysis_result()
        record = analysis_to_land_record(analysis)
        assert len(record.conflicts) == 1
        assert record.conflicts[0].field == "area"
        assert record.conflicts[0].severity == "medium"

    def test_preserves_provenance(self):
        analysis = _make_analysis_result()
        record = analysis_to_land_record(analysis)
        assert record.raw_analysis is not None
        assert record.explainability_evidence is not None


class TestLandRecordRepository:
    def test_create_and_get(self):
        init_db()
        repo = LandRecordRepository(SessionLocal())
        record = repo.create(_make_analysis_result())
        assert record.id is not None

        fetched = repo.get(record.id)
        assert fetched is not None
        assert fetched.document_id == "DOC-1"

    def test_get_by_document_id(self):
        init_db()
        repo = LandRecordRepository(SessionLocal())
        record = repo.create(_make_analysis_result())

        fetched = repo.get_by_document_id("DOC-1")
        assert fetched is not None
        assert fetched.id == record.id

    def test_list_all(self):
        init_db()
        repo = LandRecordRepository(SessionLocal())
        repo.create(_make_analysis_result())
        repo.create(_make_analysis_result(document_id="DOC-2"))

        records = repo.list_all(limit=10, offset=0)
        assert len(records) == 2

    def test_delete(self):
        init_db()
        repo = LandRecordRepository(SessionLocal())
        record = repo.create(_make_analysis_result())
        record_id = record.id

        assert repo.delete(record_id) is True
        assert repo.get(record_id) is None
        assert repo.delete(record_id) is False


class TestPersistenceAPI:
    def test_create_record(self):
        init_db()
        app = create_app()
        client = TestClient(app)
        res = client.post("/api/v1/records", json=_make_analysis_result())
        assert res.status_code == 200
        data = res.json()
        assert data["document_id"] == "DOC-1"
        assert data["state"] == "Punjab"
        assert data["landholders_count"] == 1
        assert data["parcels_count"] == 1
        assert data["conflicts_count"] == 1

    def test_get_record(self):
        init_db()
        app = create_app()
        client = TestClient(app)
        create_res = client.post("/api/v1/records", json=_make_analysis_result())
        record_id = create_res.json()["id"]

        res = client.get(f"/api/v1/records/{record_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == record_id
        assert data["raw_analysis"] is not None

    def test_get_not_found(self):
        init_db()
        app = create_app()
        client = TestClient(app)
        res = client.get("/api/v1/records/9999")
        assert res.status_code == 404

    def test_list_records(self):
        init_db()
        app = create_app()
        client = TestClient(app)
        client.post("/api/v1/records", json=_make_analysis_result())
        client.post("/api/v1/records", json=_make_analysis_result(document_id="DOC-2"))

        res = client.get("/api/v1/records")
        assert res.status_code == 200
        assert len(res.json()) == 2