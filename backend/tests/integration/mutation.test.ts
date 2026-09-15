import request from 'supertest';
import { createApp } from '../../src/app/createApp';
import { db } from '../../src/db/pool';

describe('POST /api/mutation/{ulpid} (PostgreSQL + PostGIS backed)', () => {
  const app = createApp();

  afterAll(async () => {
    await db.close();
  });

  it('should successfully record mutation in database with approved decision and return exact response shape', async () => {
    const payload = {
      decision: 'approved',
      officer_id: 'OFF-102',
      notes: 'Verified against original survey map'
    };

    const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql, params) => {
      const sqlStr = typeof sql === 'string' ? sql : '';
      if (sqlStr.includes('FROM parcels')) {
        return {
          rows: [
            {
              id: 'mock-parcel-uuid',
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
              geometry: { type: 'Polygon', coordinates: [[[75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.91], [75.85, 30.90]]] },
              mutations: []
            }
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        };
      }
      if (sqlStr.includes('SELECT audit_hash FROM mutations')) {
        return {
          rows: [{ audit_hash: 'prevhash1234567890abcdef1234567890abcdef1234567890abcdef12345678' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        };
      }
      if (sqlStr.includes('INSERT INTO mutations')) {
        return {
          rows: [],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
        };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    });

    const res = await request(app)
      .post('/api/mutation/PB-LDH-0042')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(querySpy).toHaveBeenCalled();
    expect(res.body).toHaveProperty('status', 'recorded');
    expect(res.body).toHaveProperty('audit_hash');
    expect(typeof res.body.audit_hash).toBe('string');
    expect(res.body.audit_hash).toHaveLength(64);
    expect(res.body).toHaveProperty('timestamp');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);

    querySpy.mockRestore();
  });

  it('should accept all allowed decision values: rejected and needs_review', async () => {
    for (const decision of ['rejected', 'needs_review'] as const) {
      const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql) => {
        const sqlStr = typeof sql === 'string' ? sql : '';
        if (sqlStr.includes('FROM parcels')) {
          return {
            rows: [
              {
                id: 'mock-parcel-uuid',
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
                geometry: { type: 'Polygon', coordinates: [[[75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.91], [75.85, 30.90]]] },
                mutations: []
              }
            ],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: []
          };
        }
        if (sqlStr.includes('SELECT audit_hash FROM mutations')) {
          return {
            rows: [],
            rowCount: 0,
            command: 'SELECT',
            oid: 0,
            fields: []
          };
        }
        if (sqlStr.includes('INSERT INTO mutations')) {
          return {
            rows: [],
            rowCount: 1,
            command: 'INSERT',
            oid: 0,
            fields: []
          };
        }
        return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
      });

      const res = await request(app)
        .post('/api/mutation/PB-LDH-0042')
        .send({
          decision,
          officer_id: 'OFF-105',
          notes: `Decision recorded as ${decision}`
        })
        .expect(200);

      expect(res.body.status).toBe('recorded');
      expect(res.body.audit_hash).toBeDefined();
      querySpy.mockRestore();
    }
  });

  it('should reject invalid decision values with 400', async () => {
    const res = await request(app)
      .post('/api/mutation/PB-LDH-0042')
      .send({
        decision: 'invalid_decision',
        officer_id: 'OFF-102',
        notes: 'Notes here'
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('Decision must be one of: approved, rejected, needs_review');
  });

  it('should reject missing required fields with 400', async () => {
    const res = await request(app)
      .post('/api/mutation/PB-LDH-0042')
      .send({
        decision: 'approved'
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body.error).toBe('validation_error');
  });

  it('should return 404 when parcel ULPID does not exist in database', async () => {
    const querySpy = jest.spyOn(db, 'query').mockResolvedValue({
      rows: [],
      rowCount: 0,
      command: 'SELECT',
      oid: 0,
      fields: []
    });

    const res = await request(app)
      .post('/api/mutation/NON-EXISTENT-PARCEL')
      .send({
        decision: 'approved',
        officer_id: 'OFF-102',
        notes: 'Checking non-existent parcel'
      })
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
