import { PolygonGeometry } from '../models/parcel';

/**
 * GIS Integration Layer & Boundaries — Bhu-Setu
 *
 * OWNER & BOUNDARY:
 * - The GIS teammate owns spatial processing, GeoServer / QGIS workflows,
 *   cadastral map vectorization, and advanced spatial conflict algorithms.
 * - The Backend owns HTTP API endpoints, database persistence (PostgreSQL/PostGIS),
 *   and GeoJSON serialization via `/api/map/parcels` and `/api/parcel/:ulpid`.
 * - ULPID (Unique Land Parcel Identification Number) is the common integration key.
 * - Geometry standard: PostGIS Polygon with SRID 4326 (WGS 84, GeoJSON standard).
 */

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface SpatialConflictResult {
  hasConflict: boolean;
  type?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
  overlapAreaSqm?: number;
}

export interface IGisService {
  calculateBBox(geometry: PolygonGeometry): BoundingBox;
}

export class GisService implements IGisService {
  /**
   * Calculates the bounding box for a set of polygon coordinates.
   * Useful for map zoom extent calculation and viewport queries.
   */
  public calculateBBox(geometry: PolygonGeometry): BoundingBox {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const ring of geometry.coordinates) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
    }

    return { minLng, minLat, maxLng, maxLat };
  }
}

export const gisService = new GisService();
