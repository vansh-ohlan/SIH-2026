import request from 'supertest';
import { createApp } from '../../src/app/createApp';

describe('Parcel API Endpoints', () => {
  const app = createApp();

  describe('GET /api/parcel/{ulpid}', () => {
    it('should return exact 200 response shape for existing parcel PB-LDH-0042', async () => {
      const res = await request(app)
        .get('/api/parcel/PB-LDH-0042')
        .expect('Content-Type', /json/)
        .expect(200);

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
    });

    it('should return exact 404 error shape when parcel is not found', async () => {
      const res = await request(app)
        .get('/api/parcel/UNKNOWN-ULPID-999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(res.body).toEqual({
        error: 'ulpid_not_found',
        message: 'No parcel found for this ULPID'
      });
    });
  });

  describe('GET /api/parcel/search?q={query}', () => {
    it('should return parcel search matches for query "Ramesh"', async () => {
      const res = await request(app)
        .get('/api/parcel/search?q=Ramesh')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([
        {
          ulpid: 'PB-LDH-0042',
          name: 'Ramesh Kumar',
          lat: 30.905,
          lng: 75.855
        }
      ]);
    });

    it('should return empty array [] when no matches are found', async () => {
      const res = await request(app)
        .get('/api/parcel/search?q=NonExistentPersonName')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return empty array [] when query is empty', async () => {
      const res = await request(app)
        .get('/api/parcel/search')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/parcel/{ulpid}/conflicts', () => {
    it('should return flagged conflicts with valid severity for PB-LDH-0042', async () => {
      const res = await request(app)
        .get('/api/parcel/PB-LDH-0042/conflicts')
        .expect('Content-Type', /json/)
        .expect(200);

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
    });

    it('should return empty array [] when parcel has no conflicts', async () => {
      const res = await request(app)
        .get('/api/parcel/PB-LDH-0043/conflicts')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });
});
