"""Integration tests for the conflict report and Unified Land Intelligence APIs.

Each test runs against an isolated temporary SQLite database wired in through
the ``get_db`` dependency override, so the shared development database is
never touched.
"""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.db import get_db
from backend.app.main import create_app
from backend.app.models import Base, Conflict, Landholder, LandRecord, Parcel

ULPIN = "ULPIN-0001"
SIBLING_ULPIN = "ULPIN-0002"

OWNER_PROVENANCE = {"page": 1, "bbox": [10, 20, 30, 40], "extraction_method": "pattern"}
KHASRA_PROVENANCE = {"page": 2, "bbox": [5, 6, 7, 8], "extraction_method": "table"}


@pytest.fixture()
def api(tmp_path):
    """Yield a TestClient bound to a throwaway database."""
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'land_intelligence.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=test_engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    app = create_app()

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield SimpleNamespace(client=client, session_factory=session_factory)

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


def conflicted_analysis(**overrides: Any) -> dict[str, Any]:
    """An extraction that trips every conflict rule exactly once.

    * two owners sharing a name but disagreeing on share -> owner contradiction
    * two parcels sharing Khasra 142/1                    -> duplicate Khasra
    * those parcels both in sqm but 100 vs 900            -> area mismatch
    * mutation number present, details absent             -> LOW warning
    * one AI-reported conflict with provenance            -> preserved as CRITICAL
    """
    payload: dict[str, Any] = {
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
                "mutation_number": {"value": "M-9"},
            },
            "landholders": [
                {
                    "name": {"value": "Ramesh Kumar", "provenance": OWNER_PROVENANCE},
                    "father_or_husband_name": {"value": "Suresh Kumar"},
                    "share": {"value": "0.5"},
                },
                {
                    "name": {"value": "Ramesh Kumar"},
                    "father_or_husband_name": {"value": "Suresh Kumar"},
                    "share": {"value": "0.25"},
                },
            ],
            "parcels": [
                {
                    "ulpin": {"value": ULPIN},
                    "khasra_number": {"value": "142/1", "provenance": KHASRA_PROVENANCE},
                    "area_raw": {"value": "100 sqm"},
                    "area_normalized": {"value": 100.0},
                    "area_unit": {"value": "sqm"},
                    "land_classification": {"value": "Irrigated"},
                    "irrigation_source": {"value": "Canal"},
                    "revenue": {"value": "500"},
                },
                {
                    "ulpin": {"value": SIBLING_ULPIN},
                    "khasra_number": {"value": "142/1"},
                    "area_raw": {"value": "900 sqm"},
                    "area_normalized": {"value": 900.0},
                    "area_unit": {"value": "sqm"},
                },
            ],
            "conflicts": [
                {
                    "field": "area",
                    "type": "area_mismatch",
                    "severity": "critical",
                    "message": "Area mismatch between RoR and map",
                    "provenance": {"page": 3, "bbox": [1, 2, 3, 4]},
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
        "explainability_evidence": {
            "top_influences": [{"field": "area", "importance": 0.4}]
        },
    }
    payload.update(overrides)
    return payload


def clean_analysis() -> dict[str, Any]:
    """An extraction that should produce no conflict findings at all."""
    return {
        "extraction_result": {
            "status": "success",
            "metadata": {
                "state": {"value": "Punjab"},
                "district": {"value": "Ludhiana"},
                "tehsil": {"value": "Ludhiana East"},
                "village": {"value": "Burj Littan"},
                "khata_number": {"value": "99"},
            },
            "landholders": [{"name": {"value": "Suresh Singh"}, "share": {"value": "1.0"}}],
            "parcels": [
                {
                    "ulpin": {"value": "ULPIN-CLEAN"},
                    "khasra_number": {"value": "700/2"},
                    "area_raw": {"value": "8 marla"},
                    "area_normalized": {"value": 8.0},
                    "area_unit": {"value": "marla"},
                }
            ],
            "conflicts": [],
        },
        "confidence_score": 0.42,
        "extraction_risk": "high",
    }


def create_record(api, payload: dict[str, Any]) -> int:
    response = api.client.post("/api/v1/records", json=payload)
    assert response.status_code == 200, response.text
    return response.json()["id"]


class TestUlpinPersistence:
    def test_ulpin_is_persisted_from_extraction(self, api):
        create_record(api, conflicted_analysis())
        response = api.client.get("/api/v1/parcels/search", params={"ulpin": ULPIN})
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert body["parcels"][0]["ulpin"] == ULPIN

    def test_parcels_without_ulpin_coexist(self, api):
        """ULPIN is nullable and supplied externally, never generated."""
        payload = conflicted_analysis()
        del payload["extraction_result"]["parcels"][1]["ulpin"]
        create_record(api, payload)

        response = api.client.get("/api/v1/parcels/search", params={"ulpin": ULPIN})
        assert response.json()["total"] == 1


class TestConflictsEndpoint:
    def test_returns_every_rule_finding(self, api):
        record_id = create_record(api, conflicted_analysis())
        response = api.client.get(f"/api/v1/records/{record_id}/conflicts")
        assert response.status_code == 200

        body = response.json()
        assert body["record_id"] == record_id
        assert body["total"] == len(body["conflicts"]) == 5
        assert body["severity_counts"] == {
            "low": 1,
            "medium": 0,
            "high": 3,
            "critical": 1,
        }
        assert [conflict["rule"] for conflict in body["conflicts"]] == [
            "ai_extraction_conflict",
            "owner_contradiction",
            "area_contradiction",
            "duplicate_khasra",
            "mutation_inconsistency",
        ]

    def test_conflicts_are_recomputed_not_just_replayed(self, api):
        """Only one conflict was stored; the engine adds its own findings."""
        record_id = create_record(api, conflicted_analysis())
        record = api.client.get(f"/api/v1/records/{record_id}").json()
        assert record["conflicts_count"] == 1

        body = api.client.get(f"/api/v1/records/{record_id}/conflicts").json()
        assert body["total"] == 5

    def test_clean_record_reports_no_conflicts(self, api):
        record_id = create_record(api, clean_analysis())
        body = api.client.get(f"/api/v1/records/{record_id}/conflicts").json()
        assert body["total"] == 0
        assert body["conflicts"] == []
        assert body["severity_counts"] == {
            "low": 0,
            "medium": 0,
            "high": 0,
            "critical": 0,
        }

    def test_low_confidence_record_is_not_a_conflict(self, api):
        """clean_analysis carries a 0.42 confidence and high risk, yet is clean."""
        record_id = create_record(api, clean_analysis())
        record = api.client.get(f"/api/v1/records/{record_id}").json()
        assert record["confidence_score"] == 0.42
        assert record["risk_level"] == "high"
        assert api.client.get(f"/api/v1/records/{record_id}/conflicts").json()["total"] == 0

    def test_unknown_record_returns_404(self, api):
        response = api.client.get("/api/v1/records/999999/conflicts")
        assert response.status_code == 404
        assert response.json()["detail"]["error"] == "not_found"

    def test_evidence_and_provenance_are_preserved(self, api):
        record_id = create_record(api, conflicted_analysis())
        conflicts = api.client.get(f"/api/v1/records/{record_id}/conflicts").json()["conflicts"]
        by_rule = {conflict["rule"]: conflict for conflict in conflicts}

        ai_evidence = by_rule["ai_extraction_conflict"]["evidence"]
        assert ai_evidence["source"] == "ai"
        assert ai_evidence["provenance"] == {"page": 3, "bbox": [1, 2, 3, 4]}

        owner_evidence = by_rule["owner_contradiction"]["evidence"]
        assert owner_evidence["owners"][0]["provenance"] == OWNER_PROVENANCE
        assert owner_evidence["contradictory_attributes"] == ["share"]

        area_evidence = by_rule["area_contradiction"]["evidence"]
        assert area_evidence["conversion_applied"] is False
        assert area_evidence["comparable"] is True
        assert area_evidence["values"] == [100.0, 900.0]

        khasra_evidence = by_rule["duplicate_khasra"]["evidence"]
        assert khasra_evidence["occurrences"][0]["provenance"] == KHASRA_PROVENANCE

        mutation = by_rule["mutation_inconsistency"]
        assert mutation["severity"] == "low"
        assert mutation["evidence"]["mutation_number"]["provenance"] == {}

    def test_response_is_deterministic(self, api):
        record_id = create_record(api, conflicted_analysis())
        first = api.client.get(f"/api/v1/records/{record_id}/conflicts").json()
        second = api.client.get(f"/api/v1/records/{record_id}/conflicts").json()
        assert first == second

    def test_falls_back_to_relational_rows_without_raw_analysis(self, api):
        """The engine still works when only the normalized rows survive."""
        with api.session_factory() as db:
            record = LandRecord(khata_number=None, village="Burj Littan", raw_analysis=None)
            record.landholders.append(
                Landholder(
                    name="Ramesh Kumar",
                    share="0.5",
                    provenance='{"page": 1, "extraction_method": "pattern"}',
                )
            )
            record.landholders.append(Landholder(name="Ramesh Kumar", share="0.25"))
            record.parcels.append(
                Parcel(
                    ulpin="ULPIN-REBUILT",
                    khasra_number="142/1",
                    area_normalized=100.0,
                    area_unit="sqm",
                )
            )
            record.parcels.append(
                Parcel(khasra_number="142/1", area_normalized=900.0, area_unit="sqm")
            )
            record.conflicts.append(
                Conflict(
                    field="area",
                    issue_type="area_mismatch",
                    severity="critical",
                    message="Area mismatch between RoR and map",
                    evidence='{"provenance": {"page": 3}}',
                )
            )
            db.add(record)
            db.commit()
            record_id = record.id

        body = api.client.get(f"/api/v1/records/{record_id}/conflicts").json()
        rules = [conflict["rule"] for conflict in body["conflicts"]]
        assert "owner_contradiction" in rules
        assert "area_contradiction" in rules
        assert "duplicate_khasra" in rules
        assert "ai_extraction_conflict" in rules
        # khata_number is absent on this row, so the mandatory rule fires too.
        assert "mandatory_field_check" in rules

        ai_conflict = next(c for c in body["conflicts"] if c["rule"] == "ai_extraction_conflict")
        assert ai_conflict["evidence"]["provenance"] == {"page": 3}


class TestLandIntelligenceEndpoint:
    def test_returns_unified_view(self, api):
        create_record(api, conflicted_analysis())
        response = api.client.get(f"/api/v1/land/{ULPIN}")
        assert response.status_code == 200

        body = response.json()
        assert body["ulpin"] == ULPIN
        assert body["document_id"] == "DOC-1"
        assert body["document_type"] == "Jamabandi"
        assert body["year"] == "2023-24"
        assert (body["state"], body["district"], body["tehsil"], body["village"]) == (
            "Punjab",
            "Ludhiana",
            "Ludhiana East",
            "Burj Littan",
        )
        assert body["khata_number"] == "12"
        assert body["khewat_number"] == "5"

    def test_includes_owners_parcels_and_mutation(self, api):
        create_record(api, conflicted_analysis())
        body = api.client.get(f"/api/v1/land/{ULPIN}").json()

        assert [holder["name"] for holder in body["landholders"]] == [
            "Ramesh Kumar",
            "Ramesh Kumar",
        ]
        assert body["landholders"][0]["share"] == "0.5"

        assert len(body["parcels"]) == 2
        assert body["mutation"] == {
            "mutation_number": "M-9",
            "mutation_date": None,
            "mutation_details": None,
        }

    def test_marks_the_matched_parcel(self, api):
        create_record(api, conflicted_analysis())
        body = api.client.get(f"/api/v1/land/{ULPIN}").json()

        assert body["parcel"]["ulpin"] == ULPIN
        assert body["parcel"]["is_match"] is True
        assert [parcel["is_match"] for parcel in body["parcels"]] == [True, False]
        assert [parcel["ulpin"] for parcel in body["parcels"]] == [ULPIN, SIBLING_ULPIN]

    def test_sibling_parcel_resolves_to_the_same_record(self, api):
        create_record(api, conflicted_analysis())
        first = api.client.get(f"/api/v1/land/{ULPIN}").json()
        second = api.client.get(f"/api/v1/land/{SIBLING_ULPIN}").json()

        assert first["record_id"] == second["record_id"]
        assert second["parcel"]["ulpin"] == SIBLING_ULPIN
        assert [parcel["is_match"] for parcel in second["parcels"]] == [False, True]

    def test_provenance_is_returned_as_structured_data(self, api):
        create_record(api, conflicted_analysis())
        body = api.client.get(f"/api/v1/land/{ULPIN}").json()

        assert body["parcel"]["provenance"] == KHASRA_PROVENANCE
        assert body["landholders"][0]["provenance"] == OWNER_PROVENANCE
        assert body["explainability_evidence"] == {
            "top_influences": [{"field": "area", "importance": 0.4}]
        }

    def test_includes_assessment_and_conflict_report(self, api):
        create_record(api, conflicted_analysis())
        body = api.client.get(f"/api/v1/land/{ULPIN}").json()

        assert body["assessment"] == {
            "confidence_score": 0.85,
            "risk_level": "medium",
            "anomaly_score": 0.3,
            "anomaly_risk": "high",
            "extraction_status": "success",
            "validation_error_count": 1,
            "validation_warning_count": 2,
            "extractor_version": "1.0.0",
        }
        assert body["conflicts"]["total"] == 5
        assert body["conflicts"]["record_id"] == body["record_id"]
        assert body["conflicts"]["severity_counts"]["critical"] == 1

    def test_clean_parcel_reports_no_conflicts(self, api):
        create_record(api, clean_analysis())
        body = api.client.get("/api/v1/land/ULPIN-CLEAN").json()
        assert body["conflicts"]["total"] == 0
        assert body["assessment"]["confidence_score"] == 0.42

    def test_unknown_ulpin_returns_404(self, api):
        create_record(api, conflicted_analysis())
        response = api.client.get("/api/v1/land/ULPIN-DOES-NOT-EXIST")
        assert response.status_code == 404
        assert response.json()["detail"]["error"] == "not_found"

    def test_does_not_fall_back_to_khasra_lookup(self, api):
        """A ULPIN miss must never silently return another parcel."""
        create_record(api, conflicted_analysis())
        response = api.client.get("/api/v1/land/142%2F1")
        assert response.status_code == 404

    def test_blank_ulpin_returns_400(self, api):
        response = api.client.get("/api/v1/land/%20%20")
        assert response.status_code == 400
        assert response.json()["detail"]["error"] == "invalid_ulpin"

    def test_surrounding_whitespace_is_trimmed(self, api):
        create_record(api, conflicted_analysis())
        response = api.client.get(f"/api/v1/land/%20{ULPIN}%20")
        assert response.status_code == 200
        assert response.json()["ulpin"] == ULPIN

    def test_response_is_deterministic(self, api):
        create_record(api, conflicted_analysis())
        first = api.client.get(f"/api/v1/land/{ULPIN}").json()
        second = api.client.get(f"/api/v1/land/{ULPIN}").json()
        assert first == second


class TestParcelSearchFilters:
    def test_multiple_location_filters_narrow_results(self, api):
        """Regression: each filter used to append its own join to LandRecord."""
        create_record(api, conflicted_analysis())

        response = api.client.get(
            "/api/v1/parcels/search",
            params={
                "khasra_number": "142/1",
                "state": "Punjab",
                "district": "Ludhiana",
                "tehsil": "Ludhiana East",
                "village": "Burj Littan",
            },
        )
        assert response.status_code == 200
        assert response.json()["total"] == 2

    def test_mismatched_location_filter_excludes_results(self, api):
        create_record(api, conflicted_analysis())
        response = api.client.get(
            "/api/v1/parcels/search",
            params={"khasra_number": "142/1", "state": "Punjab", "district": "Amritsar"},
        )
        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_search_requires_ulpin_or_khasra(self, api):
        response = api.client.get("/api/v1/parcels/search")
        assert response.status_code == 400
        assert response.json()["detail"]["error"] == "invalid_search"
