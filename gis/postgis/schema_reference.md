# PostGIS Authoritative Schema Reference & Geospatial Guidelines

## 1. Authoritative Parcels Schema

The canonical PostGIS schema for Bhu-Setu land governance is defined in `backend/src/db/migrations/002_create_parcels_table.sql`.

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

-- Spatial GiST Index for bounding box acceleration and spatial join operations
CREATE INDEX IF NOT EXISTS idx_parcels_geometry ON parcels USING GIST (geometry);
CREATE UNIQUE INDEX IF NOT EXISTS idx_parcels_ulpid ON parcels (ulpid);
CREATE INDEX IF NOT EXISTS idx_parcels_owner_name ON parcels (owner_name);
```

---

## 2. Key Geospatial Attributes

| Column | Type | Constraint | Description |
|---|---|---|---|
| `ulpid` | `VARCHAR(64)` | `UNIQUE NOT NULL` | Universal Land Parcel Identification Number (e.g. `PB-LDH-0042`) |
| `geometry` | `GEOMETRY(Polygon, 4326)` | `NOT NULL` | PostGIS Polygon geometry in EPSG:4326 (WGS 84 geographic 2D) |
| `ror_area_sqm` | `NUMERIC(12, 2)` | `NOT NULL` | Registered land area extracted from the Jamabandi / Record of Rights |
| `surveyed_area_sqm` | `NUMERIC(12, 2)` | `NOT NULL` | Cadastral spatial survey boundary area in square metres |
| `area_sqm` | `NUMERIC(12, 2)` | `NOT NULL` | Canonical operational parcel area |

---

## 3. PostGIS Query Patterns

### 1. Retrieve GeoJSON for Frontend Rendering
```sql
SELECT 
  ulpid,
  land_use,
  ST_AsGeoJSON(geometry)::json AS geometry
FROM parcels
ORDER BY ulpid ASC;
```

### 2. PostGIS Centroid Extraction (Search / Label Placement)
```sql
SELECT 
  ulpid,
  owner_name AS name,
  ROUND(ST_Y(ST_Centroid(geometry))::numeric, 4)::float AS lat,
  ROUND(ST_X(ST_Centroid(geometry))::numeric, 4)::float AS lng
FROM parcels
WHERE LOWER(owner_name) LIKE LOWER('%Ramesh%') 
   OR LOWER(ulpid) LIKE LOWER('%PB-LDH%');
```

### 3. True Geodesic Surface Area Query (Ellipsoidal m²)
```sql
SELECT 
  ulpid,
  ST_Area(geometry::geography)::float AS calculated_geodesic_area_sqm,
  ror_area_sqm,
  surveyed_area_sqm
FROM parcels
WHERE ulpid = 'PB-LDH-0042';
```
> [!NOTE]
> Casting `geometry::geography` instructs PostGIS to calculate geodesic area on the WGS 84 ellipsoid (EPSG:7030) directly in square metres, preventing any distortion from planar coordinate assumptions.

### 4. Bounding Box & Spatial Intersect Queries
```sql
-- Fast bounding box intersection using GiST index
SELECT ulpid, owner_name 
FROM parcels 
WHERE geometry && ST_MakeEnvelope(75.80, 30.85, 75.90, 30.95, 4326);
```

---

## 4. Architectural Rules
1. **Never create secondary parcel tables**: Do not create `land_parcels`, `gis_parcels`, or separate geometry tracking tables.
2. **Never change geometry column SRID**: Geometry is strictly `4326`.
3. **No MultiPolygon**: If a parcel consists of multiple disjoint components, each part must have its own cadastral ULPID or be normalized in the cadastral register.
