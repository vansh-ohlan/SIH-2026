# Bhu-Setu Stage 3: OCR, Document Intelligence & AI/ML Decision Support

## 1. Executive Summary

Bhu-Setu incorporates an end-to-end **Document Intelligence & Decision Support Layer** for ingesting, validating, and reconciling scanned Record of Rights (RoR / Jamabandi / Patta) documents with PostGIS cadastral survey geometries and land registry ledgers.

> [!IMPORTANT]
> **Core Governance Principle**: AI/ML models provide **advisory decision support only**. The final legal determination on land title transfers, boundary disputes, or mutation determinations is strictly executed by authorized government revenue officers. All approved, rejected, or disputed decisions generate cryptographic SHA-256 tamper-evident hash receipts chained in PostgreSQL.

---

## 2. OCR Pipeline Architecture

```
Scanned RoR Document (PDF, PNG, JPG, TIFF)
       │
       ▼
1. Validation Layer (Buffer integrity, MIME type, max 10MB limit)
       │
       ▼
2. Preprocessing & OCR Engine Boundary (AI_ML_SERVICE_URL or Local Deterministic Engine)
       │
       ▼
3. Field Extraction & Normalization (Owner, Area, Survey/Khasra No, Confidence)
       │
       ▼
4. Confidence Quality Assessment:
   ├─ Score < 0.60 ──► "Manual verification required" (Advisory flag, no auto-rejection)
   └─ Score >= 0.60 ─► "Extraction confidence acceptable for review"
       │
       ▼
5. Cross-Data Reconciliation Engine (PostGIS DB + EPSG:4326 GIS Polygon Area)
       │
       ▼
6. Explainable Rule-Based Anomaly Generation (What was compared, What differs, Why flagged)
       │
       ▼
7. Statutory Officer Adjudication (Approve / Reject / Needs Review + Notes)
       │
       ▼
8. Cryptographic SHA-256 Tamper-Evident Ledger Commit
```

---

## 3. Frozen API Contract Compliance

The public OCR contract specified in `docs/api-contracts.md` remains 100% frozen and unmodified:

### `POST /api/ocr/extract`
- **Request**: `multipart/form-data` with form field `file`.
- **Response 200 (Success)**:
  ```json
  {
    "owner": "Suresh Singh",
    "area": 980,
    "survey_no": "142/3",
    "confidence": 0.87
  }
  ```
- **Response 422 (Unreadable/Corrupted Document)**:
  ```json
  {
    "error": "unreadable_document",
    "message": "OCR could not extract required fields"
  }
  ```

### `POST /api/ocr/decision-support` (Stage 3 Extension)
- **Request**: `multipart/form-data` or `application/json` with `ulpid` and optional document file.
- **Response 200**:
  ```json
  {
    "ulpid": "PB-LDH-0042",
    "ocr_extracted": {
      "owner": "Ramesh Kumar",
      "area": 1250,
      "survey_no": "142/3",
      "confidence": 0.89
    },
    "stored_parcel": {
      "owner_name": "Ramesh Kumar",
      "ror_area_sqm": 1250,
      "surveyed_area_sqm": 1180,
      "land_use": "Residential"
    },
    "confidence_assessment": {
      "score": 0.89,
      "status": "acceptable_for_review",
      "display_message": "Extraction confidence acceptable for review"
    },
    "anomalies": [
      {
        "type": "area_mismatch",
        "description": "RoR area (1250 sqm) does not match surveyed area (1180 sqm)",
        "severity": "medium",
        "what_compared": "Record of Rights Extent vs Georeferenced PostGIS Cadastral Polygon Area",
        "what_differs": "RoR Area: 1250 sqm | Cadastral Survey: 1180 sqm (Variance: 70 sqm)",
        "why_flagged": "Discrepancy between historical revenue paper records and digitized GIS polygon boundary requiring field verification.",
        "source": "PostGIS Spatial Analysis"
      }
    ],
    "recommended_review_status": "needs_review",
    "disclaimer": "Decision Support Note: Automated checks provide rule-based decision support; authorized officials make final decisions."
  }
  ```

---

## 4. Deterministic Explainable Anomaly Rules

| Rule ID | Anomaly Type | Severity | Trigger Condition | Explainability Output |
| :--- | :--- | :---: | :--- | :--- |
| **R-1** | `low_ocr_confidence` | `medium` | `confidence < 0.60` | Compares optical character recognition score against 60.0% threshold. Highlights handwriting noise or resolution blur requiring manual check. |
| **R-2** | `missing_survey_no` | `medium` | `survey_no` is empty | Flags missing statutory khasra/patta number on scanned deed. |
| **R-3** | `owner_mismatch` | `high` | `ocr.owner != stored.owner` | Compares extracted deed holder against PostGIS titleholder. Flags unrecorded title transfer or clerical dispute. |
| **R-4** | `area_mismatch` | `medium` | `\|ror_area - surveyed_area\| > 0.01` | Compares legacy paper RoR extent against digitized EPSG:4326 PostGIS geometry area. |
| **R-5** | `ocr_area_discrepancy`| `high` | `\|ocr.area - ror_area\| > 0.01` | Compares newly submitted deed declared area against stored revenue ledger. |

---

## 5. Human-in-the-Loop Governance & Citizen Presentation

### Officer Workflow
1. **Document Ingestion**: Officer uploads scanned deed or selects sample test fixture.
2. **Quality Assessment**: If score is below 60%, officer sees *"Manual verification required"* banner; editable fields allow manual correction.
3. **Cross-Data Review**: Comparative matrix presents differences between Document, Database RoR, and GIS Surveyed Polygon.
4. **Statutory Adjudication**: Officer chooses `Approved`, `Rejected`, or `Needs Review` with mandatory statutory notes.
5. **Ledger Commitment**: Submission seals the record with a chained SHA-256 hash.

### Citizen Public Experience
Citizens accessing the portal see simplified, non-technical statuses:
- **`Verified`**: Land records and survey boundaries are clear and synchronized.
- **`Under Review`**: Mutation application is in process.
- **`Needs Verification`**: Ground survey or assessment notice is pending.
- **`Conflict Detected`**: Technical area or boundary reconciliation required by revenue department.

---

## 6. Future Real ML / PaddleOCR Integration Path

The `AiServiceClient` interface (`backend/src/integrations/aiService.ts`) defines three modular methods:
1. `extractDocument(fileBuffer, fileName)`
2. `analyzeDocument(fileBuffer, fileName)`
3. `generateDecisionSupport(ulpid, ocrData)`

When connecting to the live FastAPI microservice in `ai_ml/`:
- `ai_ml.api.server` running PaddleOCR and Isolation Forest is targeted via `AI_ML_SERVICE_URL=http://localhost:8000`.
- The backend forwards multipart requests to `POST /api/v1/inference/document` and maps the extracted schema directly.
- The UI workflow remains 100% identical and resilient to backend fallback.
