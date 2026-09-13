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

## 7. POST /api/v1/inference/document

Upload a scanned RoR image and run the full AI/ML inference pipeline. This is the primary interface between the backend and the AI service.

Request: multipart/form-data
- file: image file (png, jpg, jpeg, bmp, tiff, tif)

Example request:
POST /api/v1/inference/document
Content-Type: multipart/form-data; boundary=----FormBoundary

------FormBoundary
Content-Disposition: form-data; name="file"; filename="ror_sample.png"
Content-Type: image/png

<binary image data>
------FormBoundary--

Response 200:
{
  "extraction_result": {
    "status": "success",
    "metadata": {
      "document_id": { "value": "DOC-123", "provenance": { "source_ocr_text": "...", "extraction_confidence": 0.92 } },
      "state": { "value": "Punjab" },
      "district": { "value": "Ludhiana" },
      "tehsil": { "value": "Ludhiana East" },
      "village": { "value": "Burj Littan" },
      "year": { "value": 2024 },
      "document_type": { "value": "Jamabandi" },
      "khata_number": { "value": "12" },
      "khewat_number": { "value": "5" }
    },
    "landholders": [
      {
        "name": { "value": "Ramesh Kumar", "provenance": { "extraction_confidence": 0.95 } },
        "father_or_husband_name": { "value": "Suresh Kumar" },
        "share": { "value": "0.5" }
      }
    ],
    "parcels": [
      {
        "khasra_number": { "value": "142/3" },
        "area_raw": { "value": "1250 sqm" },
        "area_normalized": { "value": 1250.0 },
        "area_unit": { "value": "sqm" },
        "land_type": { "value": "Residential" }
      }
    ],
    "unrecognized_text": ["..."],
    "warnings": ["Low OCR confidence on page 2"],
    "validation_error_count": 0,
    "validation_warning_count": 1
  },
  "confidence_score": 0.87,
  "extraction_risk": "low",
  "anomaly_score": -0.12,
  "anomaly_risk": "low",
  "anomaly_features": [0.1, -0.2, 0.05],
  "explainability_evidence": {
    "top_influences": [
      { "field": "area_normalized", "importance": 0.4 },
      { "field": "land_type", "importance": 0.25 }
    ]
  }
}

Response 400: Invalid request (missing file, unsupported file type)
{
  "error": "missing_file",
  "message": "A file must be provided in the 'file' field."
}

Response 422: Unreadable or invalid image/OCR failure
{
  "error": "unreadable_document",
  "message": "OCR could not extract required fields"
}

Response 500: Internal inference failure
{
  "error": "inference_failure",
  "message": "Document inference failed."
}

Field meanings:
- extraction fields: structured fields extracted from the document, including metadata (document_id, state, district, village, khata/khewat numbers, year, document_type), landholders (name, father_or_husband_name, share, caste, address), and parcels (khasra_number, area_raw, area_normalized, area_unit, land_type, cultivation_status, irrigation_source, revenue, remarks). Each field has a value and optional provenance.
- field provenance: traceability metadata for a field, including source_ocr_text (raw text from OCR), source_bbox (bounding box x1,y1,x2,y2), page_number, ocr_confidence (OCR engine confidence in [0.0, 1.0]), extraction_confidence (confidence that the extracted value is correct in [0.0, 1.0]), extraction_method (label, regex, spatial, table, ml, llm, manual, unknown), extractor_version, notes.
- OCR confidence: the OCR engine's confidence in the recognized text, in [0.0, 1.0].
- extraction confidence: confidence that the extracted structured value is correct, in [0.0, 1.0].
- overall confidence: pipeline-level confidence_score in [0.0, 1.0], derived from validation and extraction confidence.
- extraction risk: low, medium, or high. Derived from validation counts and extraction confidence. low means extraction is trustworthy, high means manual review is recommended.
- anomaly score: Isolation Forest anomaly score. Negative or low values typically mean normal; high positive values indicate anomaly. Value range depends on model calibration.
- anomaly risk: low, medium, or high. Derived from anomaly score distribution.
- validation counts: validation_error_count and validation_warning_count from the validation layer.
- conflicts: list of conflicting values from different extractors for the same field, e.g. [{"type": "area_mismatch", "values": {...}, "severity": "medium"}].
- explainability_evidence: optional JSON-serializable evidence about which fields influenced the scoring or extraction, e.g. {"top_influences": [{"field": "area_normalized", "importance": 0.4}]}.

Stable integration fields:
- extraction_result.status
- extraction_result.metadata (keys: document_id, state, district, tehsil, village, year, document_type, khata_number, khewat_number, khatoni_number, mutation_number, mutation_date, mutation_details)
- extraction_result.landholders (keys: name, father_or_husband_name, caste, address, share, is_cultivator)
- extraction_result.parcels (keys: khasra_number, area_raw, area_normalized, area_unit, land_classification, land_type, cultivation_status, irrigation_source, revenue, remarks)
- extraction_result.unrecognized_text
- extraction_result.warnings
- extraction_result.conflicts
- extraction_result.validation_error_count
- extraction_result.validation_warning_count
- confidence_score
- extraction_risk (values: low, medium, high)
- anomaly_score
- anomaly_risk (values: low, medium, high)
- explainability_evidence (top-level keys may evolve; consumers should treat it as opaque and display it rather than program against inner keys)

Evolving fields:
- anomaly_features: internal feature vector used for anomaly detection. Shape and semantics may change without notice. Do not depend on length or ordering.
- explainability_evidence inner structure: field names and importance values may evolve as the explainability model changes. Treat as display-only unless explicitly versioned.
- extraction_result.record and extraction_result.raw_ocr_result_summary may be added/removed in future versions.
- Any new metadata keys added under state_specific_fields are optional and should be ignored by consumers that do not understand them.

Error contract:
All errors return a JSON body with this shape:
{
  "error": "snake_case_code",
  "message": "human readable message"
}

Expected HTTP status codes:
- 200 OK: Successful inference.
- 400 Bad Request: Missing file, unsupported file type, or invalid request shape.
- 422 Unprocessable Entity: Unreadable/invalid image, empty file, or OCR failure.
- 500 Internal Server Error: Unexpected inference failure. Do not retry automatically; inspect error code and message.

Shared conventions (all endpoints)

- All timestamps ISO 8601 UTC.
- All errors: { "error": "snake_case_code", "message": "human readable" }
- Auth header (mock for demo): Authorization: Bearer <token> -- Backend returns a dummy token on login, no real verification needed for Phase 1-3.
- CORS open to localhost:3000 for local dev.

## Handoff checklist (Team Lead: confirm each by Hour 2:00)

- [ ] Backend has created these routes as stubs (can return hardcoded JSON matching the shapes above)
- [ ] Frontend has this doc and is building against these shapes, not waiting on live backend
- [ ] ML has confirmed /ocr/extract request/response shape works with their pipeline output
- [ ] GIS has confirmed /map/parcels GeoJSON shape matches what GeoServer/PostGIS will produce
- [ ] Backend has reviewed POST /api/v1/inference/document contract and confirmed it is consumable
- [ ] Backend has reviewed stable vs evolving field list and confirmed alignment
