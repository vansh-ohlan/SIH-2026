import request from 'supertest';
import { createApp } from '../../src/app/createApp';
import { db } from '../../src/db/pool';

describe('Parcel API Endpoints (PostgreSQL + PostGIS backed)', () => {
  const app = createApp();

  afterAll(async () => {
    await db.close();
  });

  describe('GET /api/parcel/{ulpid}', () => {
    it('should return exact 200 response shape for existing parcel PB-LDH-0042 from database', async () => {
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

      const querySpy = jest.spyOn(db, 'query').mockImplementationOnce(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM parcels')) {
          return {
            rows: [mockRow],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: []
          };
        }
        return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
      });

      const res = await request(app)
        .get('/api/parcel/PB-LDH-0042')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(querySpy).toHaveBeenCalled();
      expect(res.body).toEqual({
        ulpid: 'PB-LDH-0042',
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

    it('should return exact 404 error shape when parcel is not found in database', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .get('/api/parcel/UNKNOWN-ULPID-999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(querySpy).toHaveBeenCalled();
      expect(res.body).toEqual({
        error: 'ulpid_not_found',
        message: 'No parcel found for this ULPID'
      });

      querySpy.mockRestore();
    });
  });

  describe('GET /api/parcel/search?q={query}', () => {
    it('should return parcel search matches from database for query "Ramesh"', async () => {
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

      const res = await request(app)
        .get('/api/parcel/search?q=Ramesh')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(querySpy).toHaveBeenCalled();
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([
        {
          ulpid: 'PB-LDH-0042',
          name: 'Ramesh Kumar',
          lat: 30.905,
          lng: 75.855
        }
      ]);

      querySpy.mockRestore();
    });

    it('should return empty array [] when no matches are found in database', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .get('/api/parcel/search?q=NonExistentPersonName')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual([]);
      querySpy.mockRestore();
    });

    it('should return empty array [] when query is empty without querying database', async () => {
      const querySpy = jest.spyOn(db, 'query');
      const res = await request(app)
        .get('/api/parcel/search')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual([]);
      expect(querySpy).not.toHaveBeenCalled();
      querySpy.mockRestore();
    });
  });

  describe('GET /api/parcel/{ulpid}/conflicts', () => {
    it('should return flagged area mismatch conflict for PB-LDH-0042 based on database records', async () => {
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
        .expect('Content-Type', /json/)
        .expect(200);

      expect(querySpy).toHaveBeenCalled();
      expect(res.body).toEqual([
        {
          type: 'area_mismatch',
          description: 'RoR area (1250 sqm) does not match surveyed area (1180 sqm)',
          severity: 'medium'
        }
      ]);

      const allowedSeverities = ['low', 'medium', 'high'];
      for (const conflict of res.body) {
        expect(allowedSeverities).toContain(conflict.severity);
      }

      querySpy.mockRestore();
    });

    it('should return empty array [] when parcel has no area mismatch in database', async () => {
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
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual([]);
      querySpy.mockRestore();
    });
  });
});
