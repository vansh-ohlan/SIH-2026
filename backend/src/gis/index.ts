/**
 * GIS Core Engine Abstraction
 *
 * Prepares the backend for GeoServer and PostGIS integrations in subsequent stages.
 * Provides spatial utilities, projection helpers, and conflict geometry calculations.
 */

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export class GisEngine {
  /**
   * Calculates the bounding box for a set of polygon coordinates.
   */
  public calculateBBox(coordinates: number[][][]): BoundingBox {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const ring of coordinates) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
    }

    return { minLng, minLat, maxLng, maxLat };
  }

  /**
   * Stub method for spatial overlap detection between two parcels.
   */
  public checkOverlap(_poly1: number[][][], _poly2: number[][][]): boolean {
    // In Stage 2/3, this will execute ST_Intersects / ST_Overlaps queries via PostGIS.
    return false;
  }
}

export const gisEngine = new GisEngine();
