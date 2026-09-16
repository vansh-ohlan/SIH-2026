# Bhu-Setu Backend API Gateway

The backend service for **Bhu-Setu** (Smart India Hackathon 2026) — an integrated GIS-based Digital Public Infrastructure for Land Governance.

This service acts as a non-disruptive integration layer connecting legacy state land records (Bhulekh, IGRS, municipal permissions), PostGIS spatial geometry, AI/ML OCR pipelines, and citizen/officer portals.

---

## 🚀 Prerequisites

- **Node.js**: v20.0.0+ (Tested on v25.9.0)
- **npm**: v10.0.0+
- **PostgreSQL & PostGIS**:
  - Option A: **Docker / Docker Compose** (Recommended)
  - Option B: **Native PostgreSQL with PostGIS extension** (Homebrew / apt)

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

## 🗄️ PostgreSQL + PostGIS Setup

### Option A: Using Docker Compose (Recommended)

Start the official PostgreSQL + PostGIS container in detached mode:
```bash
docker compose up -d
```

Verify container health:
```bash
docker compose ps
```

Stop the database container when finished:
```bash
docker compose down
```

### Option B: Using Native / Homebrew PostgreSQL

1. Install PostGIS:
   - **macOS (Homebrew)**: `brew install postgis`
   - **Ubuntu/Debian**: `sudo apt-get install -y postgresql-16-postgis-3`

2. Create the database and user:
   ```bash
   createdb bhusetu_db
   ```

3. Configure `.env` to match your local connection string:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bhusetu_db
   ```

---

## 📦 Database Migrations & Seeding

The backend includes a migration engine that tracks schema versions in `schema_migrations`.

1. **Run Migrations (creates PostGIS extension, parcels, mutations, and indexes):**
   ```bash
   npm run db:migrate
   ```

2. **Seed Synthetic Demo Data:**
   ```bash
   npm run db:seed
   ```

3. **Reset and Re-seed (Fresh State):**
   ```bash
   npm run db:reset
   ```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | HTTP port for the API server |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin for CORS |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/bhusetu_db` | Connection string for PostgreSQL / PostGIS |
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

- **Run full test suite (14 test suites / 56 unit & integration tests):**
  ```bash
  npm test
  ```

- **Run with code coverage report:**
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

### 5. Submit Mutation Decision (Protected)
- **Endpoint**: `POST /api/mutation/{ulpid}`
- **Authentication**: `Authorization: Bearer <token>` *(Requires `revenue_officer`, `registrar`, or `admin` role)*
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
    "timestamp": "2026-09-15T10:15:00.000Z"
  }
  ```
- **Response 401**:
  ```json
  { "error": "unauthorized", "message": "Authentication token is missing or invalid" }
  ```
- **Response 403**:
  ```json
  { "error": "forbidden", "message": "Insufficient permissions. Required role(s): revenue_officer, registrar, admin" }
  ```

### 6. Generate Development Token (Mock Auth)
- **Endpoint**: `POST /api/auth/dev-token`
- **Request Body**:
  ```json
  {
    "role": "revenue_officer",
    "userId": "OFF-102",
    "name": "Officer Sharma",
    "officerId": "OFF-102"
  }
  ```
  *(Allowed `role` values: `citizen`, `revenue_officer`, `registrar`, `admin`)*
- **Response 200**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "expiresIn": "1h",
    "user": {
      "role": "revenue_officer",
      "userId": "OFF-102",
      "name": "Officer Sharma",
      "officerId": "OFF-102"
    }
  }
  ```

### 7. Get Authenticated User Context
- **Endpoint**: `GET /api/auth/me`
- **Authentication**: `Authorization: Bearer <token>`
- **Response 200**:
  ```json
  {
    "user": {
      "userId": "OFF-102",
      "role": "revenue_officer",
      "name": "Officer Sharma",
      "officerId": "OFF-102"
    }
  }
  ```

### 8. OCR Document Extraction
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

### 9. Get Map Parcels (GeoJSON)
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

## 🔐 Authentication & Role-Based Access Control (RBAC)

The Bhu-Setu API Gateway employs lightweight, standard JWT Bearer authentication (`Authorization: Bearer <token>`) designed for SIH hackathon demonstration and role switching without requiring live Aadhaar, DigiLocker, OTP, or external identity providers.

### Supported Roles & Permissions Matrix

| Role | View Parcels & Map | View Conflicts | Submit Mutation Decision | Administrative Actions |
| :--- | :---: | :---: | :---: | :---: |
| `citizen` | ✅ | ✅ | ❌ *(403 Forbidden)* | ❌ |
| `revenue_officer` | ✅ | ✅ | ✅ *(Recorded + Chained)* | ❌ |
| `registrar` | ✅ | ✅ | ✅ *(Recorded + Chained)* | ❌ |
| `admin` | ✅ | ✅ | ✅ *(Full Override)* | ✅ |

### Key Security & Architectural Principles
1. **Bearer Token Authentication**: Reusable `authenticate` middleware parses and cryptographically validates tokens using `JWT_SECRET`.
2. **Declarative RBAC**: `requireRole('revenue_officer', 'registrar', 'admin')` protects officer-only mutations and governance workflows.
3. **Protected Mutation Workflow**:
   - `POST /api/mutation/:ulpid` is protected by RBAC; client-provided `officer_id` is validated alongside authenticated user context.
   - Unauthorized attempts return standard `401 Unauthorized` or `403 Forbidden`.
4. **Tamper-Evident SHA-256 Hash Chain**: Mutation decisions compute and chain cryptographic audit hashes (`audit_hash`) to the previous mutation record in PostgreSQL, providing a traceable, tamper-evident audit record without blockchain overhead.
5. **Development & Demo Utility**: Use `POST /api/auth/dev-token` with `{ "role": "<role_name>" }` to instantaneously generate JWT tokens for demonstrating different stakeholder viewpoints.
6. **Production Outlook**: In full production deployment, the mock JWT generator would be backed by National Single Sign-On (MeriPehchaan) and departmental SSO providers. Aadhaar/DigiLocker integrations are explicitly avoided in this SIH prototype.

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

## 🏛️ PostGIS Spatial Design & SRID

- **Spatial Reference System**: **EPSG:4326 (WGS 84)** is used for all geometry columns (`geometry(Polygon, 4326)`).
- **Indexing**: Spatial GiST index `idx_parcels_geometry` is applied for sub-millisecond bounding box and intersection queries.
- **Centroid Queries**: Centroids for parcel searches are computed in PostGIS using `ROUND(ST_Y(ST_Centroid(geometry))::numeric, 4)` and `ROUND(ST_X(ST_Centroid(geometry))::numeric, 4)`.
- **Tamper-Evident Audit Trail**: Mutation decisions calculate a SHA-256 hash chained to the previous mutation record for that parcel, providing a tamper-evident audit record without blockchain overhead.

---

## 🗺️ GIS Integration & Boundaries

| Responsibility Area | Owner | Details |
| :--- | :--- | :--- |
| **API & Persistence** | Backend | Exposes `/api/map/parcels`, `/api/parcel/:ulpid`, PostGIS table storage, GeoJSON serialization, RoR-vs-survey area mismatch checks, SHA-256 audit logs. |
| **Spatial Processing** | GIS Teammate | Vectorization, QGIS workflows, GeoServer layer publishing, advanced spatial overlap / boundary encroachment analysis, cadastral shapefile ingestion. |

### Integration Standards
1. **Common Integration Key**: `ulpid` (Unique Land Parcel Identification Number) serves as the primary identifier across Backend, GIS layers, and Land Records.
2. **Geometry Standard**: PostGIS `GEOMETRY(Polygon, 4326)` (WGS 84, standard GeoJSON `[longitude, latitude]` coordinate order).
3. **GeoJSON Exposure**: `GET /api/map/parcels` returns standard GeoJSON `FeatureCollection` with `properties: { ulpid, land_use }` for direct frontend/GIS client consumption.
4. **Backend Abstraction**: `GisService` in `src/gis/` provides clean bounding box (`calculateBBox`) utilities and integration types (`SpatialConflictResult`) without duplicating GIS spatial processing algorithms.


