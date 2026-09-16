# Bhu-Setu -- System Architecture

## Overview

Bhu-Setu is a non-disruptive integration layer for land governance. Instead of replacing existing state systems (Bhulekh, IGRS, municipal permission systems), it connects them via APIs and unifies access through a single citizen and officer interface.

## The four layers

### 1. Legacy source systems (existing, not built by us)
- Cadastral maps
- Record of Rights (RoR) / registration records
- Building permits
- Property tax / utility databases

These are simulated with mock data for the hackathon demo -- in production, they would be the real state department systems.

### 2. Data integration layer
- API gateway -- normalizes data from different legacy formats (shapefiles, scanned RoR, CSVs) into a common schema
- ULPID mapping -- Unique Land Parcel ID system, like a "land Aadhaar," linking every record about a parcel across departments

### 3. GIS core engine
- PostGIS / GeoServer -- stores and serves parcel geometry
- Conflict detection -- flags boundary overlaps, RoR-vs-map area mismatches, and other anomalies (rule-based for MVP, ML-assisted as a stretch goal)

### 4. Citizen and governance access layer
- Citizen portal -- search a parcel by ULPID or location, view ownership, tax status, land use, and mutation history
- Officer dashboard -- review flagged conflicts, approve/reject mutations, full audit trail via a SHA-256 hash-chained log

## Data flow (high level)

1. Legacy systems feed raw data into the integration layer
2. Integration layer normalizes and tags each record with a ULPID
3. GIS core stores geometry and runs conflict checks against RoR/tax data
4. Citizens and officers query the access layer, which pulls from GIS core and integration layer via the API contracts defined in docs/api-contracts.md

## Demo scope (what must work live)

- Search parcel by ULPID/location -> unified record view
- Map view with parcel boundaries (mock dataset)
- One conflict-detection example (area mismatch flagged)
- Officer dashboard: view and resolve one flagged case
- OCR: one scanned RoR to structured data

## Out of scope for hackathon build (roadmap/pitch only)

- Real DigiLocker/Aadhaar integration
- Real blockchain (hash-chained log substitutes)
- National-scale multi-state federation
- SMS/USSD fallback for offline access

## Related docs

- api-contracts.md -- endpoint specs for frontend/backend/GIS/ML integration
