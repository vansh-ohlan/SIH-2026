# Bhu-Setu GIS Integration & Engineering Architecture

## 1. GIS Architecture Overview

Bhu-Setu is an integrated GIS-based Digital Public Infrastructure (DPI) for Land Governance. The GIS component is responsible for:
- Cadastral/parcel geometry validation (`Polygon`, `EPSG:4326`)
- Spherical/geodesic surface area calculations in square metres ($m^2$)
- Automated area mismatch detection between registered Record of Rights (RoR) and spatial boundary surveys
- Seamless integration with Backend Stage 2 PostgreSQL + PostGIS persistence
- GeoServer WMS/WFS/GeoJSON publication for cadastral map rendering
- Deterministic conflict generation without making legal title or ownership decisions

```
+-------------------------------------------------------------------------+
|                              BHU-SETU DPI                              |
+-------------------------------------------------------------------------+
|  Citizen Portal / Officer Dashboard (Leaflet / OpenLayers / React)      |
+------------------------------------+------------------------------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v (HTTP JSON)                                 v (WMS / WFS / GeoJSON)
+-------------------------------+             +---------------------------+
|    Backend API Gateway        |             |         GeoServer         |
|  (Express + TypeScript)       |             |  (landgov:parcels layer)  |
+---------------+---------------+             +-------------+-------------+
                |                                           |
                |  ULPID Lookup & Spatial Queries           |  WFS/WMS Vector Feeds
                v                                           v
+-------------------------------------------------------------------------+
|                  PostgreSQL 16 + PostGIS 3.4 (bhusetu_db)               |
|                                                                         |
|  Table: parcels (Source of Truth)                                       |
|  - ulpid (VARCHAR(64) UNIQUE)                                           |
|  - ror_area_sqm (NUMERIC(12, 2))                                        |
|  - surveyed_area_sqm (NUMERIC(12, 2))                                   |
|  - geometry (GEOMETRY(Polygon, 4326), GiST indexed)                     |
+-------------------------------------------------------------------------+
```

---

## 2. PostGIS as the Single Source of Truth

All parcel data, spatial geometries, tax statuses, ownership details, and mutation histories reside exclusively in the Backend PostGIS database (`bhusetu_db`).
- **No Secondary Parcel Database**: GIS processes directly interact with the existing Backend `parcels` table. The legacy `land_parcels.public.parcels` mock database (`PARCEL-001` ... `PARCEL-004` MultiPolygon) is strictly deprecated and must **not** be treated as a source of truth.
- **No Secondary Identifier System**: The Unique Land Parcel Identification Number (**ULPID**) is the universal primary key and integration identifier across Backend, GIS, AI/ML, and Citizen interfaces.

---

## 3. PostGIS `parcels` Table Schema

The authoritative schema is defined in `backend/src/db/migrations/002_create_parcels_table.sql`:

```sql
CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulpid VARCHAR(64) UNIQUE NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_since DATE NOT NULL,
    area_sqm NUMERIC(12, 2) NOT NULL,
    land_use VARCHAR(100) NOT NULL,
    tax_paid BOOLEAN NOT NULL DEFAULT false,
    tax_last_paid DATE,
    tax_dues NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ror_area_sqm NUMERIC(12, 2) NOT NULL,
    surveyed_area_sqm NUMERIC(12, 2) NOT NULL,
    geometry GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for sub-millisecond bounding box and topological queries
CREATE INDEX IF NOT EXISTS idx_parcels_geometry ON parcels USING GIST (geometry);
CREATE UNIQUE INDEX IF NOT EXISTS idx_parcels_ulpid ON parcels (ulpid);
CREATE INDEX IF NOT EXISTS idx_parcels_owner_name ON parcels (owner_name);
```

---

## 4. Common Identifier: ULPID Integration

The ULPID format (e.g. `PB-LDH-0042`) standardizes parcel identity across all domains:
- **Backend**: Queries parcels by `ulpid` via `GET /api/parcel/:ulpid` and checks conflicts via `GET /api/parcel/:ulpid/conflicts`.
- **GIS Engine**: Evaluates spatial validity and area mismatch keyed by `ulpid`.
- **GeoServer**: Exposes `ulpid` as a feature property in WFS GetFeature GeoJSON output.
- **Frontend**: Renders parcel boundaries and correlates map clicks directly to parcel details using `properties.ulpid`.

---

## 5. Geometry Requirements & EPSG:4326

Cadastral parcels must adhere strictly to the following geospatial rules:
1. **Geometry Type**: Must be `Polygon` (single contiguous parcel with optional interior holes). `MultiPolygon`, `LineString`, or `Point` types are not permitted for individual cadastral parcels.
2. **Coordinate Reference System (CRS)**: **EPSG:4326** (WGS 84 geographic coordinates in degrees: `[longitude, latitude]`).
3. **Axis Order**: Standard GeoJSON ordering `[longitude, latitude]` (`[X, Y]`).
4. **Boundary Closure**: Exterior ring and any interior rings must be closed linear rings (the first coordinate position must be identical to the last coordinate position).
5. **Minimum Vertices**: Each ring must contain at least 4 coordinate pairs (a triangle plus the closing duplicate vertex).

---

## 6. GIS Geometry Validation

The GIS Engine provides deterministic validation via `gisEngine.validateGeometry(geometry)`:
- Confirms input is a non-null object with `type === 'Polygon'`.
- Validates coordinate nesting and structure (`number[][][]`).
- Verifies that `coordinates` contains at least one linear ring (the outer boundary).
- Validates that each ring has $\ge 4$ coordinate pairs and that `first[0] === last[0] && first[1] === last[1]`.
- Checks that all longitude values are finite numbers within `[-180, 180]`.
- Checks that all latitude values are finite numbers within `[-90, 90]`.
- Fails safely without throwing unhandled exceptions, returning `{ isValid: boolean; error?: string }`.

---

## 7. Geodesic Area Calculation Method

### The Problem with Naive Planar Calculation on EPSG:4326
Stored coordinates are in spherical degrees (EPSG:4326). If planar Shoelace geometry is applied directly to degrees:
$$\text{Area}_{\text{planar}} = \frac{1}{2} \left| \sum (x_i y_{i+1} - x_{i+1} y_i) \right|$$
The result is in **square degrees**, not square metres.
At latitude $30.90^\circ\text{ N}$ (Ludhiana, Punjab):
- $1^\circ \text{ latitude} \approx 110,870\text{ m}$
- $1^\circ \text{ longitude} \approx 111,320 \times \cos(30.90^\circ) \approx 95,520\text{ m}$
- $1\text{ deg}^2 \approx 110,870 \times 95,520 \approx 10,590,000,000\text{ m}^2$

A $0.01^\circ \times 0.01^\circ$ cadastral grid has a planar area of $0.0001\text{ deg}^2$. Treating this as $0.0001\text{ m}^2$ underestimates the true area by a factor of over **10 billion times**!

### Geospatial Solutions Implemented

1. **In-Memory GIS Engine (Spherical Excess on WGS 84 Authalic Sphere)**:
   In `GisEngine.calculateGeodesicAreaSqm()`, we employ the spherical polygon area formula using the WGS 84 authalic mean earth radius ($R = 6,371,008.8\text{ m}$):
   $$\text{RingArea} = \frac{R^2}{2} \left| \sum_{i=0}^{n-1} (\lambda_{i+1} - \lambda_{i-1}) \sin(\phi_i) \right|$$
   where $\lambda$ is longitude in radians and $\phi$ is latitude in radians. Interior rings (holes) are subtracted:
   $$\text{Total Area} = \text{Exterior Area} - \sum \text{Interior Hole Areas}$$
   This returns true geodesic surface area in square metres ($m^2$).

2. **PostgreSQL/PostGIS Database Query**:
   When querying PostGIS directly, casting geometry to `geography` automatically invokes PostGIS's ellipsoidal geodesic area engine:
   ```sql
   SELECT ST_Area(geometry::geography)::float AS calculated_area_sqm
   FROM parcels
   WHERE ulpid = $1;
   ```
   This executes on the WGS 84 spheroid (EPSG:7030), yielding sub-millimetre precision without coordinate distortion.

---

## 8. Area Mismatch Calculation & Severity Logic

### Mathematical Definition
For any parcel with Record of Rights area ($A_{\text{ror}}$) and surveyed boundary area ($A_{\text{surveyed}}$):
$$\Delta_{\text{abs}} = |A_{\text{ror}} - A_{\text{surveyed}}|$$
$$\Delta_{\%} = \left( \frac{\Delta_{\text{abs}}}{A_{\text{ror}}} \right) \times 100$$

### Floating-Point Tolerance
To prevent IEEE 754 floating-point noise from triggering false alarms, any difference where:
$$\Delta_{\text{abs}} \le 0.01\text{ sqm}$$
is considered a match ($\text{hasMismatch} = \text{false}$, returns `null` conflict).

### Deterministic Severity Classification
The API contract freezes severity values to `low | medium | high`:
| Percentage Difference ($\Delta_{\%}$) | Severity | Justification |
|---|---|---|
| $\Delta_{\%} < 5\%$ | `low` | Minor operational survey discrepancy or seasonal boundary fence shift. |
| $5\% \le \Delta_{\%} < 15\%$ | `medium` | Noticeable boundary deviation requiring cadastral officer cross-verification. |
| $\Delta_{\%} \ge 15\%$ | `high` | Severe boundary encroachment, parcel splitting discrepancy, or major deed mismatch. |

### Generated Conflict Format
```json
{
  "type": "area_mismatch",
  "description": "RoR area (1250 sqm) does not match surveyed area (1180 sqm)",
  "severity": "medium"
}
```

> [!IMPORTANT]
> **Legal Boundary Disclaimer**: Area mismatch detection is an automated anomaly flagging service. It **never** approves ownership, rejects title, or decides mutation validity. Mutation approval remains solely within the jurisdiction of designated revenue officers.

---

## 9. Seed Demo Verification Cases

### Demo Parcel 1: PB-LDH-0042 (Mismatch Detected)
- **ULPID**: `PB-LDH-0042`
- **Owner**: Ramesh Kumar
- **RoR Area**: 1,250 sqm
- **Surveyed Area**: 1,180 sqm
- **Difference**: $|1250 - 1180| = 70\text{ sqm}$
- **Percentage**: $(70 / 1250) \times 100 = 5.6\%$
- **Severity**: `medium` ($5\% \le 5.6\% < 15\%$)
- **API Response**:
  ```json
  [
    {
      "type": "area_mismatch",
      "description": "RoR area (1250 sqm) does not match surveyed area (1180 sqm)",
      "severity": "medium"
    }
  ]
  ```

### Demo Parcel 2: PB-LDH-0043 (No Conflict)
- **ULPID**: `PB-LDH-0043`
- **Owner**: Suresh Singh
- **RoR Area**: 980 sqm
- **Surveyed Area**: 980 sqm
- **Difference**: $0\text{ sqm}$
- **API Response**: `[]` (empty list, no conflict flagged)

---

## 10. Backend ↔ GIS Data Flow

```
1. Citizen/Officer requests conflicts:
   GET /api/parcel/PB-LDH-0042/conflicts
                 |
2. ParcelController receives request and calls:
   parcelService.getParcelConflicts("PB-LDH-0042")
                 |
3. PostgisParcelRepository queries authoritative PostGIS database:
   SELECT ror_area_sqm, surveyed_area_sqm FROM parcels WHERE ulpid = 'PB-LDH-0042'
                 |
4. GIS Engine detects mismatch and assigns severity:
   gisEngine.detectAreaMismatch(1250, 1180)
   => { type: 'area_mismatch', description: '...', severity: 'medium' }
                 |
5. ParcelController returns frozen HTTP response (Status 200):
   [ { "type": "area_mismatch", "description": "...", "severity": "medium" } ]
```

---

## 11. GeoServer Configuration & Endpoints

### Conceptual Configuration
- **Workspace**: `landgov`
- **Namespace URI**: `http://landgov.local`
- **Store Name**: `bhusetu_db` (PostGIS Connection)
  - **Host**: `localhost`
  - **Port**: `5432`
  - **Database**: `bhusetu_db`
  - **Schema**: `public`
- **Published Layer**: `landgov:parcels`
  - **Source Table**: `parcels`
  - **Geometry Column**: `geometry` (Type: `Polygon`, Native CRS: `EPSG:4326`)

### Standard OGC Endpoints
- **WMS (Web Map Service)**:
  `http://localhost:8080/geoserver/landgov/wms`
- **WFS (Web Feature Service)**:
  `http://localhost:8080/geoserver/landgov/wfs`
- **GeoJSON Endpoint (WFS GetFeature)**:
  `http://localhost:8080/geoserver/landgov/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=landgov:parcels&outputFormat=application/json`

*(See `gis/geoserver/README.md` for full step-by-step setup guides).*

---

## 12. Map / GeoJSON API Contract (`/api/map/parcels`)

The backend exposes a live PostGIS GeoJSON endpoint conforming to API contract section 6:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "ulpid": "PB-LDH-0042",
        "land_use": "Residential"
      },
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
      }
    }
  ]
}
```

---

## 13. Assumptions and Limitations

1. **Coordinate System**: All input coordinates must be WGS 84 (`EPSG:4326`). Local state projections (e.g. UTM Zone 43N / EPSG:32643) should be reprojected to EPSG:4326 before ingestion.
2. **Single Contiguous Polygon**: Cadastral parcels are represented as single `Polygon` features with optional inner rings. Disjoint parcel clusters must be given distinct ULPIDs or subdivided.
3. **Mock Authentication**: Auth headers are dummy tokens for local development, preserving test suite isolation.
