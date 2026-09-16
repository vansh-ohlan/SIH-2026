-- Migration 002: Create Parcels Table with PostGIS Geometry
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

-- Indexes for spatial querying, unique identifier lookup, and owner search
CREATE INDEX IF NOT EXISTS idx_parcels_geometry ON parcels USING GIST (geometry);
CREATE UNIQUE INDEX IF NOT EXISTS idx_parcels_ulpid ON parcels (ulpid);
CREATE INDEX IF NOT EXISTS idx_parcels_owner_name ON parcels (owner_name);
