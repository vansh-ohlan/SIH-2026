import { gisEngine, GisEngine, gisService } from '../../src/gis';
import { PolygonGeometry } from '../../src/models/parcel';

describe('GisEngine Unit Tests', () => {
  const validGeometry: PolygonGeometry = {
    type: 'Polygon',
    coordinates: [
      [
        [75.85, 30.90],
        [75.86, 30.90],
        [75.86, 30.91],
        [75.85, 30.91],
        [75.85, 30.90]
      ]
    ]
  };

  describe('GisEngine Architecture & Singleton', () => {
    it('should export both gisEngine and backward-compatible gisService', () => {
      expect(gisEngine).toBeInstanceOf(GisEngine);
      expect(gisService).toBe(gisEngine);
    });
  });

  describe('TEST 1: Geometry Validation', () => {
    it('should accept valid Polygon geometry with closed ring and coordinates in range', () => {
      const res = gisEngine.validateGeometry(validGeometry);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should accept valid Polygon with outer boundary and inner hole', () => {
      const polygonWithHole: PolygonGeometry = {
        type: 'Polygon',
        coordinates: [
          [
            [75.85, 30.90],
            [75.88, 30.90],
            [75.88, 30.93],
            [75.85, 30.93],
            [75.85, 30.90]
          ],
          [
            [75.86, 30.91],
            [75.87, 30.91],
            [75.87, 30.92],
            [75.86, 30.92],
            [75.86, 30.91]
          ]
        ]
      };

      const res = gisEngine.validateGeometry(polygonWithHole);
      expect(res.isValid).toBe(true);
    });

    it('should reject non-object or null/undefined inputs safely', () => {
      expect(gisEngine.validateGeometry(null).isValid).toBe(false);
      expect(gisEngine.validateGeometry(undefined).isValid).toBe(false);
      expect(gisEngine.validateGeometry('invalid').isValid).toBe(false);
      expect(gisEngine.validateGeometry(123).isValid).toBe(false);
    });

    it('should reject non-Polygon geometries', () => {
      const point = { type: 'Point', coordinates: [75.85, 30.90] };
      const multiPolygon = {
        type: 'MultiPolygon',
        coordinates: [[[[75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.90]]]]
      };

      expect(gisEngine.validateGeometry(point).isValid).toBe(false);
      expect(gisEngine.validateGeometry(point).error).toContain('Expected "Polygon"');
      expect(gisEngine.validateGeometry(multiPolygon).isValid).toBe(false);
    });

    it('should reject empty coordinates array', () => {
      const emptyPolygon = { type: 'Polygon', coordinates: [] };
      const res = gisEngine.validateGeometry(emptyPolygon);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('at least one ring');
    });

    it('should reject rings with fewer than 4 positions', () => {
      const invalidRing = {
        type: 'Polygon',
        coordinates: [
          [
            [75.85, 30.90],
            [75.86, 30.90],
            [75.85, 30.90]
          ]
        ]
      };
      const res = gisEngine.validateGeometry(invalidRing);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('at least 4 positions');
    });

    it('should reject unclosed rings where first and last vertices differ', () => {
      const unclosedRing = {
        type: 'Polygon',
        coordinates: [
          [
            [75.85, 30.90],
            [75.86, 30.90],
            [75.86, 30.91],
            [75.85, 30.91] // Missing closing vertex [75.85, 30.90]
          ]
        ]
      };
      const res = gisEngine.validateGeometry(unclosedRing);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('not closed');
    });

    it('should reject coordinates with invalid longitude values outside [-180, 180]', () => {
      const invalidLng = {
        type: 'Polygon',
        coordinates: [
          [
            [195.0, 30.90],
            [75.86, 30.90],
            [75.86, 30.91],
            [195.0, 30.90]
          ]
        ]
      };
      const res = gisEngine.validateGeometry(invalidLng);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('exceeds range [-180, 180]');
    });

    it('should reject coordinates with invalid latitude values outside [-90, 90]', () => {
      const invalidLat = {
        type: 'Polygon',
        coordinates: [
          [
            [75.85, 95.0],
            [75.86, 95.0],
            [75.86, 30.91],
            [75.85, 95.0]
          ]
        ]
      };
      const res = gisEngine.validateGeometry(invalidLat);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('exceeds range [-90, 90]');
    });

    it('should reject non-numeric coordinates safely', () => {
      const nanCoords = {
        type: 'Polygon',
        coordinates: [
          [
            ['invalid' as unknown as number, 30.90],
            [75.86, 30.90],
            [75.86, 30.91],
            ['invalid' as unknown as number, 30.90]
          ]
        ]
      };
      const res = gisEngine.validateGeometry(nanCoords);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('expected finite number');
    });
  });

  describe('TEST 4: Area Calculation in Square Metres (EPSG:4326 Geodesic)', () => {
    it('should calculate geodesic area in square metres and NOT treat degrees as metres', () => {
      // 0.01 deg x 0.01 deg cell in Ludhiana, Punjab (~30.9° N, 75.85° E)
      // Planar area in degrees^2 = 0.01 * 0.01 = 0.0001 (if treated naively as metres, would be 0.0001 sqm)
      // Real geodesic surface area on WGS 84 ellipsoid/sphere ~ 1,060,000 sqm (~1.06 km^2)
      const calculatedAreaSqm = gisEngine.calculateGeodesicAreaSqm(validGeometry);

      // Verify area is returned in real square metres (> 1,000,000 sqm, NOT 0.0001)
      expect(calculatedAreaSqm).toBeGreaterThan(1_000_000);
      expect(calculatedAreaSqm).toBeLessThan(1_100_000);
      expect(Math.round(calculatedAreaSqm)).toBe(1060886);
    });

    it('should subtract interior hole area when computing geodesic area', () => {
      const outerBox: PolygonGeometry = {
        type: 'Polygon',
        coordinates: [
          [
            [75.85, 30.90],
            [75.87, 30.90],
            [75.87, 30.92],
            [75.85, 30.92],
            [75.85, 30.90]
          ]
        ]
      };

      const outerAndHole: PolygonGeometry = {
        type: 'Polygon',
        coordinates: [
          [
            [75.85, 30.90],
            [75.87, 30.90],
            [75.87, 30.92],
            [75.85, 30.92],
            [75.85, 30.90]
          ],
          [
            [75.855, 30.905],
            [75.865, 30.905],
            [75.865, 30.915],
            [75.855, 30.915],
            [75.855, 30.905]
          ]
        ]
      };

      const fullArea = gisEngine.calculateGeodesicAreaSqm(outerBox);
      const areaWithHole = gisEngine.calculateGeodesicAreaSqm(outerAndHole);

      expect(areaWithHole).toBeLessThan(fullArea);
      expect(areaWithHole).toBeGreaterThan(0);
    });

    it('should return 0 for empty or invalid geometry', () => {
      expect(gisEngine.calculateGeodesicAreaSqm([] as unknown as PolygonGeometry)).toBe(0);
      expect(gisEngine.calculateGeodesicAreaSqm(null as unknown as PolygonGeometry)).toBe(0);
    });
  });

  describe('TEST 5 & 6: Area Mismatch Detection & Severity Logic', () => {
    it('TEST 5: should detect area mismatch for PB-LDH-0042 demo case (1250 vs 1180 sqm)', () => {
      const rorAreaSqm = 1250;
      const surveyedAreaSqm = 1180;
      const diff = Math.abs(rorAreaSqm - surveyedAreaSqm);
      expect(diff).toBe(70);

      const conflict = gisEngine.detectAreaMismatch(rorAreaSqm, surveyedAreaSqm);
      expect(conflict).not.toBeNull();
      expect(conflict).toEqual({
        type: 'area_mismatch',
        description: 'RoR area (1250 sqm) does not match surveyed area (1180 sqm)',
        severity: 'medium'
      });

      const details = gisEngine.calculateAreaMismatchDetails(rorAreaSqm, surveyedAreaSqm);
      expect(details.hasMismatch).toBe(true);
      expect(details.absoluteDiffSqm).toBe(70);
      expect(details.percentageDiff).toBeCloseTo(5.6, 1);
    });

    it('TEST 6: should produce no conflict for PB-LDH-0043 demo case (980 vs 980 sqm)', () => {
      const rorAreaSqm = 980;
      const surveyedAreaSqm = 980;

      const conflict = gisEngine.detectAreaMismatch(rorAreaSqm, surveyedAreaSqm);
      expect(conflict).toBeNull();

      const details = gisEngine.calculateAreaMismatchDetails(rorAreaSqm, surveyedAreaSqm);
      expect(details.hasMismatch).toBe(false);
      expect(details.absoluteDiffSqm).toBe(0);
      expect(details.percentageDiff).toBe(0);
      expect(details.conflict).toBeNull();
    });

    it('should ignore floating-point noise below tolerance threshold (<= 0.01 sqm)', () => {
      const conflict = gisEngine.detectAreaMismatch(1000.005, 1000.000);
      expect(conflict).toBeNull();
    });

    it('should assign "low" severity for differences under 5%', () => {
      // 1000 sqm vs 1030 sqm -> 3% diff
      const conflict = gisEngine.detectAreaMismatch(1000, 1030);
      expect(conflict).not.toBeNull();
      expect(conflict?.severity).toBe('low');
    });

    it('should assign "medium" severity for differences between 5% and 15%', () => {
      // 1000 sqm vs 1100 sqm -> 10% diff
      const conflict = gisEngine.detectAreaMismatch(1000, 1100);
      expect(conflict).not.toBeNull();
      expect(conflict?.severity).toBe('medium');
    });

    it('should assign "high" severity for differences >= 15%', () => {
      // 1000 sqm vs 1250 sqm -> 25% diff
      const conflict = gisEngine.detectAreaMismatch(1000, 1250);
      expect(conflict).not.toBeNull();
      expect(conflict?.severity).toBe('high');
    });
  });

  describe('Spatial Helpers: Bounding Box & Overlap', () => {
    it('should calculate accurate bounding box', () => {
      const bbox = gisEngine.calculateBBox(validGeometry);
      expect(bbox).toEqual({
        minLng: 75.85,
        minLat: 30.90,
        maxLng: 75.86,
        maxLat: 30.91
      });
    });

    it('should return false for completely disjoint bounding boxes in checkOverlap', () => {
      const poly1 = validGeometry;
      const poly2: PolygonGeometry = {
        type: 'Polygon',
        coordinates: [
          [
            [76.00, 31.00],
            [76.01, 31.00],
            [76.01, 31.01],
            [76.00, 31.01],
            [76.00, 31.00]
          ]
        ]
      };

      expect(gisEngine.checkOverlap(poly1, poly2)).toBe(false);
    });
  });
});
