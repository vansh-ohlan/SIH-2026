import request from 'supertest';
import { createApp } from '../../src/app/createApp';
import { db } from '../../src/db/pool';

describe('GET /api/parcel/:ulpid/reconciliation (Multi-Source Cross-Reconciliation API)', () => {
  const app = createApp();

  afterAll(async () => {
    await db.close();
  });

  it('should return 200 with structured reconciliation report for PB-LDH-0042', async () => {
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
      mutations: []
    };

    jest.spyOn(db, 'query').mockImplementation(async (sql) => {
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
      .get('/api/parcel/PB-LDH-0042/reconciliation')
      .expect(200);

    expect(res.body).toHaveProperty('parcel_id');
    expect(res.body).toHaveProperty('ulpid', 'PB-LDH-0042');
    expect(res.body).toHaveProperty('record_status');
    expect(res.body).toHaveProperty('findings');
    expect(Array.isArray(res.body.findings)).toBe(true);
    expect(res.body).toHaveProperty('source_records');
    expect(res.body.source_records).toHaveProperty('state_ror');
    expect(res.body.source_records).toHaveProperty('cadastral_gis');
    expect(res.body.source_records).toHaveProperty('registration_ngdrs');
    expect(res.body.source_records).toHaveProperty('municipal_zoning');
    expect(res.body.disclaimer).toContain('DEMO / SYNTHETIC DATA');
  });

  it('should return 404 for non-existent parcel ULPID', async () => {
    jest.spyOn(db, 'query').mockImplementation(async () => {
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    });

    const res = await request(app)
      .get('/api/parcel/NON-EXISTENT-ULPID/reconciliation')
      .expect(404);

    expect(res.body).toHaveProperty('error', 'ulpid_not_found');
  });
});
