# Bhu-Setu Backend API Gateway

The backend service for **Bhu-Setu** (Smart India Hackathon 2026) — an integrated GIS-based Digital Public Infrastructure for Land Governance.

This service acts as a non-disruptive integration layer connecting legacy state land records (Bhulekh, IGRS, municipal permissions), PostGIS spatial geometry, AI/ML OCR pipelines, and citizen/officer portals.

---

## 🚀 Prerequisites

- **Node.js**: v20.0.0+ (Tested on v25.9.0)
- **npm**: v10.0.0+

---

## 🛠️ Installation & Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | HTTP port for the API server |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin for CORS |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/bhusetu_db` | Connection string for PostgreSQL / PostGIS (Stage 2) |
| `AI_ML_SERVICE_URL` | `http://localhost:8000` | URL of the AI/ML microservice (Stage 3) |
| `GEOSERVER_URL` | `http://localhost:8080/geoserver` | URL of GeoServer instance (Stage 2/3) |

> **macOS Note**: If port 5000 is occupied by macOS AirPlay Receiver (`ControlCenter`), disable AirPlay Receiver under *System Settings > General > AirDrop & AirPlay*, or set `PORT=5001` in `.env`.

---

## 🏃 Running the Application

- **Development mode (with auto-reload):**
  ```bash
  npm run dev
  ```

- **Build for production:**
  ```bash
  npm run build
  ```

- **Run compiled production build:**
  ```bash
  npm start
  ```

- **Linting and formatting:**
  ```bash
  npm run lint
  npm run format
  npm run typecheck
  ```

---

## 🧪 Running Tests

- **Run full test suite:**
  ```bash
  npm test
  ```

- **Run with code coverage:**
  ```bash
  npm run test:coverage
  ```

---

## 📡 API Reference

Base URL: `http://localhost:5000/api`

### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Response 200**:
  ```json
  {
    "status": "ok"
  }
  ```

### 2. Get Parcel Details
- **Endpoint**: `GET /api/parcel/{ulpid}`
- **Example**: `GET /api/parcel/PB-LDH-0042`
- **Response 200**:
  ```json
  {
    "ulpid": "PB-LDH-0042",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [75.85, 30.90],
          [75.86, 30.90],
          [75.86, 30.91],
          [75.85, 30.91],
          [75.85, 30.90]
        ]
      ]
    },
    "owner": { "name": "Ramesh Kumar", "since": "2011-04-12" },
    "area_sqm": 1250,
    "land_use": "Residential",
    "tax_status": { "paid": true, "last_paid": "2026-03-01", "dues": 0 },
    "mutations": [
      { "date": "2011-04-12", "type": "Sale", "from": "State", "to": "Ramesh Kumar" }
    ]
  }
  ```
- **Response 404**:
  ```json
  { "error": "ulpid_not_found", "message": "No parcel found for this ULPID" }
  ```

### 3. Search Parcels
- **Endpoint**: `GET /api/parcel/search?q={query}`
- **Example**: `GET /api/parcel/search?q=Ramesh`
- **Response 200**:
  ```json
  [
    { "ulpid": "PB-LDH-0042", "name": "Ramesh Kumar", "lat": 30.905, "lng": 75.855 }
  ]
  ```

### 4. Get Parcel Conflicts
- **Endpoint**: `GET /api/parcel/{ulpid}/conflicts`
- **Example**: `GET /api/parcel/PB-LDH-0042/conflicts`
- **Response 200**:
  ```json
  [
    {
      "type": "area_mismatch",
      "description": "RoR area (1250 sqm) does not match surveyed area (1180 sqm)",
      "severity": "medium"
    }
  ]
  ```

### 5. Submit Mutation Decision
- **Endpoint**: `POST /api/mutation/{ulpid}`
- **Request Body**:
  ```json
  {
    "decision": "approved",
    "officer_id": "OFF-102",
    "notes": "Verified against original survey map"
  }
  ```
  *(Allowed `decision` values: `approved`, `rejected`, `needs_review`)*
- **Response 200**:
  ```json
  {
    "status": "recorded",
    "audit_hash": "b2f6b8...",
    "timestamp": "2026-09-12T14:18:25.000Z"
  }
  ```

### 6. OCR Document Extraction
- **Endpoint**: `POST /api/ocr/extract`
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (Image/PDF upload)
- **Response 200**:
  ```json
  {
    "owner": "Suresh Singh",
    "area": 980,
    "survey_no": "142/3",
    "confidence": 0.87
  }
  ```
- **Response 422**:
  ```json
  { "error": "unreadable_document", "message": "OCR could not extract required fields" }
  ```

### 7. Get Map Parcels (GeoJSON)
- **Endpoint**: `GET /api/map/parcels`
- **Response 200**:
  ```json
  {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "ulpid": "PB-LDH-0042", "land_use": "Residential" },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.91], [75.85, 30.90]]]
        }
      }
    ]
  }
  ```

---

## 🔒 Error Conventions & Middleware

- All error payloads follow:
  ```json
  {
    "error": "snake_case_code",
    "message": "Human readable explanation"
  }
  ```
- All responses include an `X-Request-Id` correlation header.
- CORS is configured to permit `http://localhost:3000`.

---

## 📊 Mock/Demo Status

- All records currently returned by default are synthetic mock data for the SIH 2026 demo.
- Data access is cleanly decoupled via repository interfaces (`IParcelRepository`, `IMutationRepository`), preparing for seamless PostGIS and PostgreSQL database binding in Stage 2.
