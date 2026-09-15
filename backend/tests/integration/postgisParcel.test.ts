import { postgisParcelRepository } from '../../src/repositories/postgisParcelRepository';
import { db } from '../../src/db/pool';

describe('PostgisParcelRepository', () => {
  afterAll(async () => {
    await db.close();
  });

  describe('findByUlpid', () => {
    it('should query PostGIS and map parcel data with GeoJSON geometry and mutations', async () => {
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
        geometry: {
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
        },
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
      expect(parcel).toEqual({
        ulpid: 'PB-LDH-0042',
        geometry: mockRow.geometry,
        owner: {
          name: 'Ramesh Kumar',
          since: '2011-04-12'
        },
        area_sqm: 1250,
        land_use: 'Residential',
        tax_status: {
          paid: true,
          last_paid: '2026-03-01',
          dues: 0
        },
        mutations: [
          {
            date: '2011-04-12',
            type: 'Sale',
            from: 'State',
            to: 'Ramesh Kumar'
          }
        ]
      });

      querySpy.mockRestore();
    });

    it('should return null when parcel is not found in database', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const parcel = await postgisParcelRepository.findByUlpid('UNKNOWN-PARCEL');
      expect(parcel).toBeNull();
      querySpy.mockRestore();
    });
  });

  describe('search', () => {
    it('should return parcel centroids for search query', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            ulpid: 'PB-LDH-0042',
            name: 'Ramesh Kumar',
            lat: 30.905,
            lng: 75.855
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const results = await postgisParcelRepository.search('Ramesh');
      expect(results).toEqual([
        {
          ulpid: 'PB-LDH-0042',
          name: 'Ramesh Kumar',
          lat: 30.905,
          lng: 75.855
        }
      ]);
      querySpy.mockRestore();
    });

    it('should return empty array for empty search query without querying database', async () => {
      const querySpy = jest.spyOn(db, 'query');
      const results = await postgisParcelRepository.search('   ');
      expect(results).toEqual([]);
      expect(querySpy).not.toHaveBeenCalled();
      querySpy.mockRestore();
    });
  });

  describe('findConflictsByUlpid', () => {
    it('should flag area mismatch conflict when RoR area differs from surveyed area', async () => {
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
      expect(conflicts).toEqual([
        {
          type: 'area_mismatch',
          description: 'RoR area (1250 sqm) does not match surveyed area (1180 sqm)',
          severity: 'medium'
        }
      ]);
      querySpy.mockRestore();
    });

    it('should return empty array when RoR area equals surveyed area', async () => {
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
      expect(conflicts).toEqual([]);
      querySpy.mockRestore();
    });
  });

  describe('getAllGeoJson', () => {
    it('should query PostGIS geometries and return GeoJSON FeatureCollection', async () => {
      const mockGeometry = {
        type: 'Polygon' as const,
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

      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            ulpid: 'PB-LDH-0042',
            land_use: 'Residential',
            geometry: mockGeometry
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const geojson = await postgisParcelRepository.getAllGeoJson();
      expect(geojson).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              ulpid: 'PB-LDH-0042',
              land_use: 'Residential'
            },
            geometry: mockGeometry
          }
        ]
      });
      querySpy.mockRestore();
    });
  });
});
