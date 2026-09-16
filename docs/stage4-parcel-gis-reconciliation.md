# Stage 4: Parcel-Centric GIS & Multi-Source Data Reconciliation

> **Problem Statement 26014 (SIH 2026)**: *“An Integrated GIS-based Digital Public Infrastructure for Land Governance.”*  
> **Milestone**: Stage 4 — Parcel-Centric GIS & Data Reconciliation  
> **Status**: Completed  
> **Branch**: `feature/stage4-parcel-gis-reconciliation`  

---

## 1. Overview & Objective

Stage 4 establishes **Bhu-Setu** as a unified, parcel-centric Digital Public Infrastructure (DPI) that seamlessly links multi-source land registers across state revenue departments, cadastral GIS mapping authorities, registration and deed registries, and municipal master planning authorities.

### Core Principle
- **Unified Parcel-Centric Core**: Land parcels serve as the atomic anchor (`parcel_id` / `ulpin` / `ulpid`), interconnecting all disparate statutory registries.
- **Explainable Decision Support**: Automated cross-reconciliation surface explainable discrepancy reports for authorized officials without replacing human statutory authority.
- **Dual-Persona Interface**: Citizens view clean, jargon-free lifecycle statuses (`Verified`, `Under Review`, `Needs Verification`, `Conflict Detected`), while officers access deep multi-source comparison matrices and adjudication tools.
- **Representative Multi-State Synthetic Datasets**: Multi-state cadastre across Punjab (Ludhiana), Chandigarh (UT), and Tamil Nadu (Sriperumbudur), explicitly labeled `[DEMO / SYNTHETIC]`.

---

## 2. Parcel-Centric Data Architecture

```
                                  ┌───────────────────────────────┐
                                  │   POSTGIS CADASTRAL PARCEL    │
                                  │ (EPSG:4326 PostGIS Geometry)  │
                                  │           parcel_id           │
                                  └──────────────┬────────────────┘
                                                 │
                 ┌───────────────────────────────┼───────────────────────────────┐
                 │                               │                               │
                 ▼                               ▼                               ▼
    ┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
    │  State RoR (Bhulekh)    │    │   Bhu-Naksha Cadastre   │    │     NGDRS Registry      │
    │  - Khewat / Khatauni    │    │  - Polygon Coordinates  │    │  - Sub-Registrar Deeds  │
    │  - Declared Jamabandi   │    │  - Digitized Extent     │    │  - Registered Parties   │
    │  - Recorded Titleholder │    │  - Centroid & Perimeter │    │  - Encumbrance Status   │
    └─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
                 │                               │                               │
                 └───────────────────────────────┼───────────────────────────────┘
                                                 │
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │   RECONCILIATION ENGINE       │
                                  │  - Area Variance Checks       │
                                  │  - Titleholder Cross-Checks   │
                                  │  - Encumbrance Adjudication   │
                                  │  - Status Determination       │
                                  └──────────────┬────────────────┘
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         ▼                                               ▼
          ┌─────────────────────────────┐                 ┌─────────────────────────────┐
          │     CITIZEN PORTAL          │                 │     OFFICER ADJUDICATION    │
          │  - Simplified Status Badge  │                 │  - Multi-Source Matrix      │
          │  - Interactive Cadastre Map │                 │  - Detailed Audit Trail     │
          │  - Zero ML Jargon           │                 │  - SHA-256 Chained Actions  │
          └─────────────────────────────┘                 └─────────────────────────────┘
```

---

## 3. Parcel Data Model

| Field | Type | Description |
| :--- | :--- | :--- |
| `parcel_id` | `string` | Canonical internal ID (`PARCEL-PB-LDH-0042`) |
| `ulpid` / `ulpin` | `string` | Unique Land Parcel Identification Number (`PB-LDH-0042`) |
| `survey_no` / `khasra_no` | `string` | Cadastral survey/khasra identifier (`142/3`) |
| `village`, `district`, `state` | `string` | Administrative hierarchy (`Burj Littan`, `Ludhiana`, `Punjab`) |
| `owner` | `object` | Registered titleholder metadata (`name`, `since`, `father_or_husband_name`) |
| `area_sqm` | `number` | PostGIS ground polygon calculated area |
| `ror_area_sqm` | `number` | Declared area from revenue Record of Rights (Jamabandi) |
| `surveyed_area_sqm` | `number` | PostGIS georeferenced ground surveyed polygon extent |
| `land_use` | `string` | Classification (`Residential`, `Agricultural`, `Commercial`, `Industrial`) |
| `geometry` | `GeoJSON.Polygon` | WGS 84 (EPSG:4326) PostGIS georeferenced boundary ring |
| `record_status` | `enum` | `verified` \| `under_review` \| `needs_verification` \| `conflict_detected` |
| `source_records` | `MultiSourceRecords` | Structured summary of State RoR, GIS, NGDRS, and Municipal Zoning |

---

## 4. Multi-Source Integration Adapters

1. **State Land Record Adapter (`StateLandRecordAdapter`)**:
   - Fetches Jamabandi / Patta / RoR documents from state revenue systems.
   - Extracts `khewat_no`, `khatauni_no`, `khasra_no`, `declared_area_sqm`, `owner_name`, `last_mutation_date`.
2. **Bhu-Naksha GIS Adapter (`BhuNakshaGisAdapter`)**:
   - Fetches georeferenced cadastral boundaries from state GIS services.
   - Computes `calculated_area_sqm`, `perimeter_meters`, `centroid`, `srid` (EPSG:4326).
3. **NGDRS Registration Adapter (`NgdrsRegistrationAdapter`)**:
   - Integrates with Sub-Registrar deed registry databases.
   - Extracts `deed_number`, `registration_date`, `registered_party`, `encumbrance_status`.

---

## 5. Explainable Cross-Reconciliation Rules

Every reconciliation finding contains full structured explainability:

```json
{
  "field_compared": "Parcel Surface Extent (Area)",
  "source_a_name": "State RoR (Jamabandi)",
  "source_a_value": "1250 sqm",
  "source_b_name": "Bhu-Naksha GIS Polygon (EPSG:4326)",
  "source_b_value": "1180 sqm",
  "difference": "70 sqm variance",
  "reason": "Digitized ground cadastral polygon boundary differs from legacy paper Jamabandi extent.",
  "severity": "medium",
  "recommended_action": "review"
}
```

### Active Rules:
1. **Area Discrepancy Rule**: Compares declared RoR area with digitized cadastral GIS polygon area (tolerance threshold: 0.01 sqm).
2. **Titleholder Discrepancy Rule**: Compares revenue ledger titleholder against registered deed party in NGDRS registry.
3. **Survey/Khasra Consistency Rule**: Verifies presence and consistency of survey identifiers across revenue databases.
4. **Encumbrance & Mutation Status Rule**: Flags active encumbrances or unadjudicated succession notices under officer review.

---

## 6. API Endpoints

### `GET /api/parcel/:ulpid/reconciliation`
Returns full multi-source cross-reconciliation report for the specified parcel.

#### Response Shape (200 OK):
```json
{
  "parcel_id": "PARCEL-PB-LDH-0042",
  "ulpid": "PB-LDH-0042",
  "ulpin": "PB-LDH-0042",
  "survey_no": "142/3",
  "owner_name": "Ramesh Kumar",
  "village": "Burj Littan",
  "district": "Ludhiana",
  "state": "Punjab",
  "record_status": "conflict_detected",
  "findings": [
    {
      "field_compared": "Parcel Surface Extent (Area)",
      "source_a_name": "State RoR (Jamabandi)",
      "source_a_value": "1250 sqm",
      "source_b_name": "Bhu-Naksha GIS Polygon (EPSG:4326)",
      "source_b_value": "1180 sqm",
      "difference": "70 sqm variance",
      "reason": "Digitized ground cadastral polygon boundary differs from legacy paper Jamabandi extent.",
      "severity": "medium",
      "recommended_action": "review"
    }
  ],
  "has_conflicts": true,
  "source_records": {
    "state_ror": { ... },
    "cadastral_gis": { ... },
    "registration_ngdrs": { ... },
    "municipal_zoning": { ... }
  },
  "confidence_score": 0.82,
  "disclaimer": "DEMO / SYNTHETIC DATA — Automated cross-reconciliation for hackathon demonstration. Authorized officials make final statutory determinations."
}
```

---

## 7. Synthetic Data Disclosure & Integrity

All parcel datasets across Ludhiana (Punjab), Chandigarh (UT), and Sriperumbudur (Tamil Nadu) are explicitly marked as **`[DEMO / SYNTHETIC]`** for hackathon demonstration purposes. Automated checks provide decision support only; authorized government revenue officers hold statutory authority for mutations and boundary reconciliation.
