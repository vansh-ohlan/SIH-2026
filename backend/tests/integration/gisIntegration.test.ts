import request from 'supertest';
import { createApp } from '../../src/app/createApp';
import { db } from '../../src/db/pool';
import { postgisParcelRepository } from '../../src/repositories/postgisParcelRepository';
import { gisEngine } from '../../src/gis';
import { SYNTHETIC_SEED_PARCELS } from '../../src/db/seeder';

describe('GIS Integration Test Suite (TEST 1 to TEST 7)', () => {
  const app = createApp();

  afterAll(async () => {
    await db.close();
  });

  describe('TEST 1 — Geometry validation', () => {
    it('should accept valid Polygon geometries from seeded parcels', () => {
      for (const parcel of SYNTHETIC_SEED_PARCELS) {
        const validation = gisEngine.validateGeometry(parcel.geometry);
        expect(validation.isValid).toBe(true);
        expect(validation.error).toBeUndefined();
      }
    });

    it('should reject malformed geometries safely without throwing unhandled exceptions', () => {
      const malformedCases = [
        { type: 'MultiPolygon', coordinates: [] },
        { type: 'Polygon', coordinates: [[ [75.85, 30.90], [75.86, 30.90] ]] },
        { type: 'Polygon', coordinates: [[ [75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.92] ]] }, // unclosed
        null,
        undefined,
        {}
      ];

      for (const malformed of malformedCases) {
        const validation = gisEngine.validateGeometry(malformed);
        expect(validation.isValid).toBe(false);
        expect(typeof validation.error).toBe('string');
      }
    });
  });

  describe('TEST 2 — ULPID lookups and uniqueness', () => {
    it('should successfully look up PB-LDH-0042 from PostGIS repository', async () => {
      const mockRow = {
        ulpid: 'PB-LDH-0042',
        owner_name: 'Ramesh Kumar',
        owner_since: '2011-04-12',
        area_sqm: 1250,
        land_use: 'Residential',
        tax_paid: true,
        tax_last_paid: '2026-03-01',
        tax_dues: 0,
        ror_area_sqm: 1250,
        surveyed_area_sqm: 1180,
        geometry: SYNTHETIC_SEED_PARCELS[0].geometry,
        mutations: [
          {
            date: '2011-04-12',
            type: 'Sale',
            from: 'State',
            to: 'Ramesh Kumar'
          }
        ]
      };

      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const parcel = await postgisParcelRepository.findByUlpid('PB-LDH-0042');
      expect(querySpy).toHaveBeenCalled();
      expect(parcel).not.toBeNull();
      expect(parcel?.ulpid).toBe('PB-LDH-0042');
      expect(parcel?.owner.name).toBe('Ramesh Kumar');

      querySpy.mockRestore();
    });

    it('should successfully look up PB-LDH-0043 from PostGIS repository', async () => {
      const mockRow = {
        ulpid: 'PB-LDH-0043',
        owner_name: 'Suresh Singh',
        owner_since: '2018-09-20',
        area_sqm: 980,
        land_use: 'Commercial',
        tax_paid: true,
        tax_last_paid: '2026-02-15',
        tax_dues: 0,
        ror_area_sqm: 980,
        surveyed_area_sqm: 980,
        geometry: SYNTHETIC_SEED_PARCELS[1].geometry,
        mutations: []
      };

      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const parcel = await postgisParcelRepository.findByUlpid('PB-LDH-0043');
      expect(querySpy).toHaveBeenCalled();
      expect(parcel).not.toBeNull();
      expect(parcel?.ulpid).toBe('PB-LDH-0043');
      expect(parcel?.owner.name).toBe('Suresh Singh');

      querySpy.mockRestore();
    });

    it('should verify all seed parcels have unique ULPIDs', () => {
      const ulpids = SYNTHETIC_SEED_PARCELS.map((p) => p.ulpid);
      const uniqueUlpids = new Set(ulpids);
      expect(uniqueUlpids.size).toBe(ulpids.length);
      expect(uniqueUlpids.has('PB-LDH-0042')).toBe(true);
      expect(uniqueUlpids.has('PB-LDH-0043')).toBe(true);
    });
  });

  describe('TEST 3 — CRS (EPSG:4326)', () => {
    it('should ensure geometries are Polygon type with coordinates in EPSG:4326 longitude/latitude range', () => {
      for (const parcel of SYNTHETIC_SEED_PARCELS) {
        expect(parcel.geometry.type).toBe('Polygon');
        for (const ring of parcel.geometry.coordinates) {
          for (const [lng, lat] of ring) {
            // Punjab / India coordinates check
            expect(lng).toBeGreaterThanOrEqual(68.0); // India min lng
            expect(lng).toBeLessThanOrEqual(97.5); // India max lng
            expect(lat).toBeGreaterThanOrEqual(8.0); // India min lat
            expect(lat).toBeLessThanOrEqual(37.5); // India max lat
          }
        }
      }
    });
  });

  describe('TEST 4 — Area calculation in square metres (Not planar degrees)', () => {
    it('should compute real surface area in square metres avoiding planar degree confusion', () => {
      const parcel42 = SYNTHETIC_SEED_PARCELS[0];
      const geodesicAreaSqm = gisEngine.calculateGeodesicAreaSqm(parcel42.geometry);

      // A 0.01 x 0.01 degree box is ~1.06 km^2 = ~1,060,000 sqm
      // If treated naively as degrees^2 = 0.0001
      expect(geodesicAreaSqm).toBeGreaterThan(1_000_000);
      expect(geodesicAreaSqm).toBeLessThan(1_100_000);
    });

    it('should execute PostGIS ST_Area(geometry::geography) query via getCalculatedAreaSqm', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{ calculated_area_sqm: 1060885.71 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const area = await postgisParcelRepository.getCalculatedAreaSqm('PB-LDH-0042');
      expect(querySpy).toHaveBeenCalled();
      expect(area).toBe(1060885.71);
      querySpy.mockRestore();
    });
  });

  describe('TEST 5 — PB-LDH-0042 area mismatch detection', () => {
    it('should detect area mismatch via repository findConflictsByUlpid', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            ror_area_sqm: 1250,
            surveyed_area_sqm: 1180
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const conflicts = await postgisParcelRepository.findConflictsByUlpid('PB-LDH-0042');
      expect(querySpy).toHaveBeenCalled();
      expect(conflicts).toEqual([
        {
          type: 'area_mismatch',
          description: 'RoR area (1250 sqm) does not match surveyed area (1180 sqm)',
          severity: 'medium'
        }
      ]);
      querySpy.mockRestore();
    });

    it('should return 200 with area mismatch conflict on HTTP GET /api/parcel/PB-LDH-0042/conflicts', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            ror_area_sqm: 1250,
            surveyed_area_sqm: 1180
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .get('/api/parcel/PB-LDH-0042/conflicts')
        .expect(200);

      expect(querySpy).toHaveBeenCalled();
      expect(res.body).toEqual([
        {
          type: 'area_mismatch',
          description: 'RoR area (1250 sqm) does not match surveyed area (1180 sqm)',
          severity: 'medium'
        }
      ]);
      querySpy.mockRestore();
    });
  });

  describe('TEST 6 — PB-LDH-0043 no conflict', () => {
    it('should return empty array when RoR equals surveyed area via repository', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            ror_area_sqm: 980,
            surveyed_area_sqm: 980
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const conflicts = await postgisParcelRepository.findConflictsByUlpid('PB-LDH-0043');
      expect(querySpy).toHaveBeenCalled();
      expect(conflicts).toEqual([]);
      querySpy.mockRestore();
    });

    it('should return 200 with empty array on HTTP GET /api/parcel/PB-LDH-0043/conflicts', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            ror_area_sqm: 980,
            surveyed_area_sqm: 980
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .get('/api/parcel/PB-LDH-0043/conflicts')
        .expect(200);

      expect(querySpy).toHaveBeenCalled();
      expect(res.body).toEqual([]);
      querySpy.mockRestore();
    });
  });

  describe('TEST 7 — Map / GeoJSON API Contract Integration', () => {
    it('should return GeoJSON FeatureCollection with Polygon geometry and ULPID properties', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            ulpid: 'PB-LDH-0042',
            land_use: 'Residential',
            geometry: SYNTHETIC_SEED_PARCELS[0].geometry
          },
          {
            ulpid: 'PB-LDH-0043',
            land_use: 'Commercial',
            geometry: SYNTHETIC_SEED_PARCELS[1].geometry
          }
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .get('/api/map/parcels')
        .expect(200);

      expect(querySpy).toHaveBeenCalled();
      expect(res.body.type).toBe('FeatureCollection');
      expect(Array.isArray(res.body.features)).toBe(true);
      expect(res.body.features.length).toBe(2);

      const f1 = res.body.features[0];
      expect(f1.properties.ulpid).toBe('PB-LDH-0042');
      expect(f1.properties.land_use).toBe('Residential');
      expect(f1.geometry.type).toBe('Polygon');
      expect(gisEngine.validateGeometry(f1.geometry).isValid).toBe(true);

      const f2 = res.body.features[1];
      expect(f2.properties.ulpid).toBe('PB-LDH-0043');
      expect(f2.properties.land_use).toBe('Commercial');
      expect(f2.geometry.type).toBe('Polygon');
      expect(gisEngine.validateGeometry(f2.geometry).isValid).toBe(true);

      querySpy.mockRestore();
    });
  });
});
