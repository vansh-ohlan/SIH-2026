-- Migration 004: Create GIS Layers Tables
CREATE TABLE IF NOT EXISTS encroachment_alerts (
    id VARCHAR(64) PRIMARY KEY,
    ulpid VARCHAR(64) NOT NULL REFERENCES parcels(ulpid) ON DELETE CASCADE,
    region_id VARCHAR(50) NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    description TEXT NOT NULL,
    area_sqm NUMERIC(12, 2) NOT NULL,
    detected_date DATE NOT NULL,
    severity VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    geometry GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encroachment_alerts_region ON encroachment_alerts (region_id);
CREATE INDEX IF NOT EXISTS idx_encroachment_alerts_geometry ON encroachment_alerts USING GIST (geometry);

CREATE TABLE IF NOT EXISTS utility_lines (
    id VARCHAR(64) PRIMARY KEY,
    region_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    specification TEXT NOT NULL,
    voltage_or_flow VARCHAR(100),
    safety_buffer_meters NUMERIC(5, 2),
    geometry GEOMETRY(LineString, 4326) NOT NULL,
    buffer_geometry GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utility_lines_region ON utility_lines (region_id);
CREATE INDEX IF NOT EXISTS idx_utility_lines_geometry ON utility_lines USING GIST (geometry);
