# Bhu-Setu API Contracts

Owner: Backend team. Any change after Hour 3:00 must be flagged in the team channel -- Frontend and ML are building against these shapes.

Base URL (local dev): http://localhost:5000/api

---

## 1. GET /parcel/{ulpid}

Full unified record for one parcel -- powers the citizen portal detail view.

Request:
GET /api/parcel/PB-LDH-0042

Response 200:
{
  "ulpid": "PB-LDH-0042",
  "geometry": { "type": "Polygon", "coordinates": [[[75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.91], [75.85, 30.90]]] },
  "owner": { "name": "Ramesh Kumar", "since": "2011-04-12" },
  "area_sqm": 1250,
  "land_use": "Residential",
  "tax_status": { "paid": true, "last_paid": "2026-03-01", "dues": 0 },
  "mutations": [
    { "date": "2011-04-12", "type": "Sale", "from": "State", "to": "Ramesh Kumar" }
  ]
}

Response 404:
{ "error": "ulpid_not_found", "message": "No parcel found for this ULPID" }

---

## 2. GET /parcel/search?q={query}

Search by owner name or location text -- powers the citizen portal search bar.

Request:
GET /api/parcel/search?q=Ramesh

Response 200:
[
  { "ulpid": "PB-LDH-0042", "name": "Ramesh Kumar", "lat": 30.905, "lng": 75.855 }
]

Empty matches return [], not 404.

---

## 3. GET /parcel/{ulpid}/conflicts

Flagged issues for a parcel -- powers the conflict detected badge and officer dashboard queue.

Response 200:
[
  {
    "type": "area_mismatch",
    "description": "RoR area (1250 sqm) does not match surveyed area (1180 sqm)",
    "severity": "medium"
  }
]

No conflicts returns [].

Severity values: low, medium, high (frontend maps these to badge colors -- keep this exact set, do not add new values without telling Frontend).

---

## 4. POST /mutation/{ulpid}

Officer submits a decision on a flagged mutation/conflict.

Request:
{
  "decision": "approved",
  "officer_id": "OFF-102",
  "notes": "Verified against original survey map"
}

decision must be one of: approved, rejected, needs_review.

Response 200:
{
  "status": "recorded",
  "audit_hash": "9f3a7c1e...",
  "timestamp": "2026-09-08T10:15:00Z"
}

audit_hash = SHA-256 of the mutation record, chained to the previous hash for that ULPID (this is our tamper-evidence story for the pitch -- no real blockchain needed).

---

## 5. POST /ocr/extract

Upload a scanned RoR image/PDF, get back structured fields. Used by ML team pipeline, called from officer dashboard digitize record button.

Request: multipart/form-data, field name file

Response 200:
{
  "owner": "Suresh Singh",
  "area": 980,
  "survey_no": "142/3",
  "confidence": 0.87
}

If confidence is less than 0.6, frontend should show Please verify manually instead of auto-filling.

Response 422:
{ "error": "unreadable_document", "message": "OCR could not extract required fields" }

---

## 6. GET /map/parcels

GeoJSON of all parcels, for map rendering (GIS team layer feeds this, Backend exposes it).

Response 200 -- standard GeoJSON FeatureCollection, one Feature per parcel:
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "ulpid": "PB-LDH-0042", "land_use": "Residential" },
      "geometry": { "type": "Polygon", "coordinates": [[[75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.91], [75.85, 30.90]]] }
    }
  ]
}

---

## Shared conventions (all endpoints)

- All timestamps ISO 8601 UTC.
- All errors: { "error": "snake_case_code", "message": "human readable" }
- Auth header (mock for demo): Authorization: Bearer <token> -- Backend returns a dummy token on login, no real verification needed for Phase 1-3.
- CORS open to localhost:3000 for local dev.

## Handoff checklist (Team Lead: confirm each by Hour 2:00)

- [ ] Backend has created these routes as stubs (can return hardcoded JSON matching the shapes above)
- [ ] Frontend has this doc and is building against these shapes, not waiting on live backend
- [ ] ML has confirmed /ocr/extract request/response shape works with their pipeline output
- [ ] GIS has confirmed /map/parcels GeoJSON shape matches what GeoServer/PostGIS will produce
