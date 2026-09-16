# ULPIN / Parcel-Centric Retrieval

## Overview

The system supports retrieval of unified land records via three methods:

1. **ULPIN** (when available) — authoritative external identifier
2. **Khasra number + administrative location**
3. **LandRecord ID**

## Important Note

> **ULPIN is treated as an authoritative external identifier; this system does not generate official ULPIN values.**

ULPIN must be supplied externally by an authoritative source. The system stores it as a nullable, unique field on the Parcel model.

### How a ULPIN reaches the database

`analysis_to_land_record()` reads the parcel-level `ulpin` field from the extraction payload and persists it verbatim:

```json
{
  "extraction_result": {
    "parcels": [
      { "ulpin": { "value": "ULPIN-0001" }, "khasra_number": { "value": "142/1" } }
    ]
  }
}
```

A ULPIN is **never derived** from a Khasra number or administrative codes. When the authoritative source has not supplied one, the column stays `NULL` and the ULPIN-keyed endpoints return `404` for that parcel — they do not fall back to a Khasra or village lookup, so a caller can never receive intelligence for a parcel it did not ask for.

## Database Design

### Parcel Model

```python
class Parcel(Base):
    __tablename__ = "parcels"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    land_record_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("land_records.id"), index=True
    )
    ulpin: Mapped[Optional[str]] = mapped_column(
        String(64), index=True, unique=True, nullable=True
    )
    # ... other fields
```

- `ulpin` is nullable (NULL when not yet assigned)
- `ulpin` is unique (one parcel per ULPIN)
- `ulpin` is indexed for fast lookup
- SQLite-compatible (unique constraint works in SQLite)

## API Endpoints

### GET /api/v1/land/{ulpin}

**Unified Land Intelligence API.** Resolves a ULPIN to everything the system knows about that parcel: administrative context, ownership, mutation history, AI assessment signals, and the reconciled conflict report — each value with its extraction provenance. See [Unified Land Intelligence response](#unified-land-intelligence-response).

### GET /api/v1/records/{record_id}

Retrieve a land record by its internal ID.

### GET /api/v1/records/{record_id}/conflicts

Run the Conflict & Reconciliation Engine over a record. See [conflict-engine.md](./conflict-engine.md).

### GET /api/v1/parcels/search?ulpin=...

Search by ULPIN.

### GET /api/v1/parcels/search?khasra_number=...&state=...&district=...&tehsil=...&village=...

Search by khasra number and administrative location. Administrative filters combine: all supplied filters must match, and `LandRecord` is joined once regardless of how many are given.

## Search Validation

- **ULPIN search**: ULPIN must be provided and non-empty
- **Khasra search**: khasra_number must be provided. Administrative fields (state, district, tehsil, village) are optional filters.
- **Invalid search**: Returns 400 with `{"error": "invalid_search", "message": "..."}`
- **Not found**: Returns 200 with empty results and a message
- **Multiple results**: Returns all matching parcels

## Response Format

```json
{
  "parcels": [
    {
      "id": 1,
      "ulpin": "123456789012",
      "khasra_number": "142/1",
      "area_raw": "1000 sqm",
      "area_normalized": 1000.0,
      "land_classification": "Irrigated",
      "irrigation_source": "Canal",
      "revenue": "500"
    }
  ],
  "land_records": [
    {
      "id": 1,
      "document_id": "DOC-1",
      "state": "Punjab",
      "district": "Ludhiana",
      "tehsil": "Ludhiana East",
      "village": "Burj Littan",
      "confidence_score": 0.85,
      "risk_level": "medium",
      "landholders_count": 1,
      "parcels_count": 1,
      "conflicts_count": 1
    }
  ],
  "total": 1
}
```

## Unified Land Intelligence response

`GET /api/v1/land/{ulpin}` returns one aggregated view. Sibling parcels of the same record are included so a caller can see the whole holding, and exactly one entry in `parcels` carries `is_match: true`.

```json
{
  "ulpin": "ULPIN-0001",
  "record_id": 1,
  "document_id": "DOC-1",
  "document_type": "Jamabandi",
  "year": "2023-24",
  "state": "Punjab",
  "district": "Ludhiana",
  "tehsil": "Ludhiana East",
  "village": "Burj Littan",
  "khata_number": "12",
  "khewat_number": "5",
  "khatoni_number": null,
  "parcel": {
    "id": 1,
    "ulpin": "ULPIN-0001",
    "khasra_number": "142/1",
    "area_raw": "100 sqm",
    "area_normalized": 100.0,
    "area_unit": "sqm",
    "land_classification": "Irrigated",
    "irrigation_source": "Canal",
    "revenue": "500",
    "provenance": { "page": 2, "bbox": [5, 6, 7, 8], "extraction_method": "table" },
    "is_match": true
  },
  "parcels": [ { "...": "every parcel on the record, one with is_match true" } ],
  "landholders": [
    {
      "name": "Ramesh Kumar",
      "father_or_husband_name": "Suresh Kumar",
      "share": "0.5",
      "provenance": { "page": 1, "bbox": [10, 20, 30, 40], "extraction_method": "pattern" }
    }
  ],
  "mutation": {
    "mutation_number": "M-9",
    "mutation_date": null,
    "mutation_details": null
  },
  "assessment": {
    "confidence_score": 0.85,
    "risk_level": "medium",
    "anomaly_score": 0.3,
    "anomaly_risk": "high",
    "extraction_status": "success",
    "validation_error_count": 1,
    "validation_warning_count": 2,
    "extractor_version": "1.0.0"
  },
  "conflicts": {
    "record_id": 1,
    "total": 5,
    "severity_counts": { "low": 1, "medium": 0, "high": 3, "critical": 1 },
    "conflicts": [ { "...": "see conflict-engine.md" } ]
  },
  "explainability_evidence": {
    "top_influences": [ { "field": "area", "importance": 0.4 } ]
  }
}
```

Guarantees:

- **Provenance is structured, not escaped.** `provenance` and `explainability_evidence` are returned as JSON objects parsed from storage.
- **Deterministic.** Parcels and landholders are ordered by primary key, and `conflicts` carries the engine's deterministic ordering. Repeated calls return identical payloads.
- **Assessment is not a verdict.** `confidence_score` and `risk_level` are reported as signals; a low score never appears in `conflicts`.

### Status codes

| Code | Condition |
| --- | --- |
| `200` | Parcel resolved. |
| `400` | `{"error": "invalid_ulpin"}` — the ULPIN is blank or whitespace only. |
| `404` | `{"error": "not_found"}` — no parcel carries that ULPIN. No Khasra or village fallback is attempted. |

Leading and trailing whitespace in the path segment is trimmed before lookup, so `/api/v1/land/%20ULPIN-0001%20` resolves to `ULPIN-0001`.

## Repository Methods

```python
class ParcelRepository:
    def get_by_ulpin(self, ulpin: str) -> Optional[Parcel]
    def get_by_khasra(self, khasra_number, state, district, tehsil, village) -> list[Parcel]
    def get_by_land_record_id(self, record_id: int) -> list[Parcel]
```

## Limitations

- ULPIN is not generated by this system
- No GIS/PostGIS geometry support yet
- No ULPIN validation algorithm (no checksum or digit-length verification)
- SQLite is used for development; PostgreSQL for production
- Because `ulpin` is unique, `GET /api/v1/land/{ulpin}` resolves to exactly one parcel on one record. The view spans that record's parcels, owners, mutation history, and conflicts — it does **not** reconcile the same physical parcel across different documents or revenue years. Cross-document reconciliation would require relaxing the unique constraint or introducing a parcel-identity table.
- Conflict findings are recomputed per request rather than materialized, so there is no stored conflict history or audit trail of how findings changed as rules evolved.