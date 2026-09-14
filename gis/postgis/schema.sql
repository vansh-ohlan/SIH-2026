-- Bhu-Setu GIS: PostGIS parcel schema

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.parcels (
    id INTEGER PRIMARY KEY,
    ulpid VARCHAR(100) NOT NULL UNIQUE,
    geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS parcels_geom_idx
ON public.parcels
USING GIST (geom);
