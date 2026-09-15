import { PolygonGeometry, ConflictItem, ConflictSeverity } from '../models/parcel';

/**
 * GIS Integration Layer & Core GIS Engine — Bhu-Setu
 *
 * OWNER & BOUNDARY:
 * - GIS owns spatial processing, geometry validation, geodesic area computation,
 *   area mismatch conflict detection, GeoServer workflows, and cadastral spatial logic.
 * - Backend owns HTTP endpoints, PostgreSQL/PostGIS persistence, and GeoJSON responses.
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
  severity?: ConflictSeverity;
  overlapAreaSqm?: number;
}

export interface GeometryValidationResult {
  isValid: boolean;
  error?: string;
}

export interface AreaMismatchDetails {
  hasMismatch: boolean;
  absoluteDiffSqm: number;
  percentageDiff: number;
  conflict: ConflictItem | null;
}

export interface IGisEngine {
  calculateBBox(geometry: PolygonGeometry | number[][][]): BoundingBox;
  validateGeometry(geometry: unknown): GeometryValidationResult;
  calculateGeodesicAreaSqm(geometry: PolygonGeometry | number[][][]): number;
  detectAreaMismatch(rorAreaSqm: number, surveyedAreaSqm: number): ConflictItem | null;
  calculateAreaMismatchDetails(rorAreaSqm: number, surveyedAreaSqm: number): AreaMismatchDetails;
  checkOverlap(
    poly1: PolygonGeometry | number[][][],
    poly2: PolygonGeometry | number[][][]
  ): boolean;
}

export class GisEngine implements IGisEngine {
  /**
   * Earth authalic mean radius in metres (WGS 84 sphere approximation).
   * Used for geodesic area calculations in EPSG:4326.
   */
  public static readonly WGS84_AUTHALIC_RADIUS_METRES = 6371008.8;

  /**
   * Floating-point noise tolerance in square metres for area comparison.
   * Discrepancies <= 0.01 sqm are considered identical to prevent IEEE 754 precision artifacts.
   */
  public static readonly AREA_TOLERANCE_SQM = 0.01;

  /**
   * Calculates the bounding box for a set of polygon coordinates.
   * Useful for map zoom extent calculation and viewport queries.
   */
  public calculateBBox(geometry: PolygonGeometry | number[][][]): BoundingBox {
    const coordinates = Array.isArray(geometry) ? geometry : geometry?.coordinates;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
      return { minLng: 0, minLat: 0, maxLng: 0, maxLat: 0 };
    }

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const ring of coordinates) {
      if (!Array.isArray(ring)) continue;
      for (const pt of ring) {
        if (!Array.isArray(pt) || pt.length < 2) continue;
        const [lng, lat] = pt;
        if (typeof lng !== 'number' || typeof lat !== 'number') continue;
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
    }

    if (minLng === Infinity) {
      return { minLng: 0, minLat: 0, maxLng: 0, maxLat: 0 };
    }

    return { minLng, minLat, maxLng, maxLat };
  }

  /**
   * Validates parcel polygon geometry against EPSG:4326 GeoJSON specifications.
   *
   * Rules:
   * 1. Geometry must be an object with type === 'Polygon'.
   * 2. Coordinates must be a 3D array (rings of [longitude, latitude]).
   * 3. At least one outer ring must exist.
   * 4. Each linear ring must contain at least 4 coordinate pairs (triangle + closure).
   * 5. Linear rings must be closed: first coordinate pair equals last coordinate pair.
   * 6. Coordinates must be finite numbers within valid geographic ranges:
   *    longitude in [-180, 180], latitude in [-90, 90].
   */
  public validateGeometry(geometry: unknown): GeometryValidationResult {
    if (!geometry || typeof geometry !== 'object') {
      return { isValid: false, error: 'Geometry must be a valid non-null object' };
    }

    const geom = geometry as Record<string, unknown>;

    if (geom.type !== 'Polygon') {
      return {
        isValid: false,
        error: `Invalid geometry type "${String(geom.type)}". Expected "Polygon"`
      };
    }

    if (!Array.isArray(geom.coordinates)) {
      return { isValid: false, error: 'Polygon coordinates must be an array of linear rings' };
    }

    if (geom.coordinates.length === 0) {
      return { isValid: false, error: 'Polygon must contain at least one ring (outer boundary)' };
    }

    for (let r = 0; r < geom.coordinates.length; r++) {
      const ring = geom.coordinates[r];
      if (!Array.isArray(ring)) {
        return { isValid: false, error: `Linear ring ${r} must be an array of coordinates` };
      }

      if (ring.length < 4) {
        return {
          isValid: false,
          error: `Linear ring ${r} must contain at least 4 positions (got ${ring.length})`
        };
      }

      for (let p = 0; p < ring.length; p++) {
        const pt = ring[p];
        if (!Array.isArray(pt) || pt.length < 2) {
          return {
            isValid: false,
            error: `Position ${p} in ring ${r} must be a [longitude, latitude] pair`
          };
        }

        const [lng, lat] = pt;
        if (typeof lng !== 'number' || isNaN(lng) || !isFinite(lng)) {
          return {
            isValid: false,
            error: `Invalid longitude at ring ${r}, position ${p}: expected finite number`
          };
        }

        if (typeof lat !== 'number' || isNaN(lat) || !isFinite(lat)) {
          return {
            isValid: false,
            error: `Invalid latitude at ring ${r}, position ${p}: expected finite number`
          };
        }

        if (lng < -180 || lng > 180) {
          return {
            isValid: false,
            error: `Longitude ${lng} at ring ${r}, position ${p} exceeds range [-180, 180]`
          };
        }

        if (lat < -90 || lat > 90) {
          return {
            isValid: false,
            error: `Latitude ${lat} at ring ${r}, position ${p} exceeds range [-90, 90]`
          };
        }
      }

      // Ring closure check
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return {
          isValid: false,
          error: `Linear ring ${r} is not closed: first [${first[0]}, ${first[1]}] != last [${last[0]}, ${last[1]}]`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Calculates geodesic surface area in square metres for EPSG:4326 polygons.
   *
   * CRITICAL GEOSPATIAL METHOD:
   * Stored coordinates are spherical longitude/latitude in degrees.
   * Direct 2D planar Shoelace formula treats degrees as metres, which undercalculates area
   * by a factor of ~10^10 at temperate latitudes (where 1 deg lat ~ 111 km, 1 deg lng ~ 95 km).
   *
   * This method uses spherical excess on the WGS 84 authalic sphere (R = 6,371,008.8 m):
   * Area = (R^2 / 2) * |sum_{i=0}^{n-1} (lambda_{i+1} - lambda_{i-1}) * sin(phi_i)|
   * Interior rings (holes) are subtracted from the exterior ring area.
   */
  public calculateGeodesicAreaSqm(geometry: PolygonGeometry | number[][][]): number {
    const coordinates = Array.isArray(geometry) ? geometry : geometry?.coordinates;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
      return 0;
    }

    const toRad = (deg: number): number => (deg * Math.PI) / 180;
    const R = GisEngine.WGS84_AUTHALIC_RADIUS_METRES;

    const computeRingArea = (ring: number[][]): number => {
      if (!Array.isArray(ring) || ring.length < 4) return 0;
      const n = ring.length - 1; // Unique vertices excluding closing duplicate
      let sum = 0;

      for (let i = 0; i < n; i++) {
        const prevIdx = (i - 1 + n) % n;
        const nextIdx = (i + 1) % n;

        const prevLngRad = toRad(ring[prevIdx][0]);
        const nextLngRad = toRad(ring[nextIdx][0]);
        const latRad = toRad(ring[i][1]);

        sum += (nextLngRad - prevLngRad) * Math.sin(latRad);
      }

      return Math.abs((sum * R * R) / 2);
    };

    // Exterior ring area
    let totalArea = computeRingArea(coordinates[0]);

    // Subtract interior rings (holes)
    for (let r = 1; r < coordinates.length; r++) {
      totalArea -= computeRingArea(coordinates[r]);
    }

    return Math.max(0, Math.round(totalArea * 100) / 100);
  }

  /**
   * Computes area mismatch details between Record of Rights (RoR) registered area
   * and surveyed boundary area.
   *
   * Severity logic:
   * - difference <= 0.01 sqm: No mismatch (noise tolerance)
   * - percentage difference < 5%: 'low'
   * - 5% <= percentage difference < 15%: 'medium'
   * - percentage difference >= 15%: 'high'
   */
  public calculateAreaMismatchDetails(
    rorAreaSqm: number,
    surveyedAreaSqm: number
  ): AreaMismatchDetails {
    const absoluteDiffSqm = Math.abs(rorAreaSqm - surveyedAreaSqm);

    if (absoluteDiffSqm <= GisEngine.AREA_TOLERANCE_SQM) {
      return {
        hasMismatch: false,
        absoluteDiffSqm: 0,
        percentageDiff: 0,
        conflict: null
      };
    }

    const baseArea = rorAreaSqm > 0 ? rorAreaSqm : surveyedAreaSqm;
    const percentageDiff = baseArea > 0 ? (absoluteDiffSqm / baseArea) * 100 : 0;

    let severity: ConflictSeverity;
    if (percentageDiff < 5) {
      severity = 'low';
    } else if (percentageDiff < 15) {
      severity = 'medium';
    } else {
      severity = 'high';
    }

    const conflict: ConflictItem = {
      type: 'area_mismatch',
      description: `RoR area (${Math.round(rorAreaSqm)} sqm) does not match surveyed area (${Math.round(surveyedAreaSqm)} sqm)`,
      severity
    };

    return {
      hasMismatch: true,
      absoluteDiffSqm: Math.round(absoluteDiffSqm * 100) / 100,
      percentageDiff: Math.round(percentageDiff * 100) / 100,
      conflict
    };
  }

  /**
   * Detects whether an area mismatch conflict exists and returns a standard ConflictItem.
   * Returns null if areas match within tolerance.
   */
  public detectAreaMismatch(rorAreaSqm: number, surveyedAreaSqm: number): ConflictItem | null {
    return this.calculateAreaMismatchDetails(rorAreaSqm, surveyedAreaSqm).conflict;
  }

  /**
   * Checks whether two polygon geometries overlap spatially.
   * First performs a fast bounding box disjoint check.
   * In Stage 2, provides safe pre-filtering; PostGIS ST_Intersects / ST_Overlaps
   * handles deep topological intersection in the database layer.
   */
  public checkOverlap(
    poly1: PolygonGeometry | number[][][],
    poly2: PolygonGeometry | number[][][]
  ): boolean {
    const bbox1 = this.calculateBBox(poly1);
    const bbox2 = this.calculateBBox(poly2);

    const bboxDisjoint =
      bbox1.maxLng < bbox2.minLng ||
      bbox1.minLng > bbox2.maxLng ||
      bbox1.maxLat < bbox2.minLat ||
      bbox1.minLat > bbox2.maxLat;

    if (bboxDisjoint) {
      return false;
    }

    // Stub return for Stage 2 as specified in Section 4
    return false;
  }
}

export const gisEngine = new GisEngine();

// Backward compatibility exports for existing Backend modules and tests
export class GisService extends GisEngine {}
export const gisService: GisService = gisEngine;
export type IGisService = IGisEngine;

