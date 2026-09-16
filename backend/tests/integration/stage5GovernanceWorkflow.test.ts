import request from 'supertest';
import { createApp } from '../../src/app/createApp';
import { db } from '../../src/db/pool';
import { authService } from '../../src/services/authService';

describe('Stage 5: End-to-End Parcel Governance Demo Workflow', () => {
  const app = createApp();

  const officerToken = authService.generateToken({
    userId: 'OFF-102',
    role: 'revenue_officer',
    name: 'Revenue Officer Sharma',
    officerId: 'OFF-102'
  });

  const citizenToken = authService.generateToken({
    userId: 'CIT-101',
    role: 'citizen',
    name: 'Ramesh Kumar'
  });

  const mockParcel42 = {
    id: 'mock-parcel-42',
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

  const mockParcel44 = {
    id: 'mock-parcel-44',
    ulpid: 'PB-LDH-0044',
    owner_name: 'Harpreet Kaur',
    owner_since: '2018-09-20',
    area_sqm: 1180,
    land_use: 'Residential',
    tax_paid: true,
    tax_last_paid: '2026-02-15',
    tax_dues: 0,
    ror_area_sqm: 1180,
    surveyed_area_sqm: 1180,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [75.852, 30.902],
          [75.858, 30.902],
          [75.858, 30.908],
          [75.852, 30.908],
          [75.852, 30.902]
        ]
      ]
    },
    mutations: []
  };

  afterAll(async () => {
    await db.close();
  });

  it('Step 1: Citizen searches and views unified parcel record with PostGIS geometry', async () => {
    const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql) => {
      const sqlStr = typeof sql === 'string' ? sql : '';
      if (sqlStr.includes('FROM parcels')) {
        return {
          rows: [mockParcel42],
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

    expect(res.body).toHaveProperty('ulpid', 'PB-LDH-0042');
    expect(res.body).toHaveProperty('owner');
    expect(res.body.owner.name).toBe('Ramesh Kumar');
    expect(res.body).toHaveProperty('area_sqm', 1250);
    expect(res.body).toHaveProperty('geometry');
    expect(res.body.geometry.type).toBe('Polygon');

    querySpy.mockRestore();
  });

  it('Step 2: Multi-source cross-reconciliation detects 70 sqm variance between RoR and GIS polygon', async () => {
    const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql) => {
      const sqlStr = typeof sql === 'string' ? sql : '';
      if (sqlStr.includes('FROM parcels')) {
        return {
          rows: [mockParcel42],
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
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('ulpid', 'PB-LDH-0042');
    expect(res.body).toHaveProperty('record_status', 'needs_verification');
    expect(res.body.source_records.state_ror.area_sqm).toBe(1250);
    expect(res.body.source_records.cadastral_gis.surveyed_area_sqm).toBe(1180);
    expect(res.body.findings.length).toBeGreaterThan(0);
    expect(res.body.findings[0]).toHaveProperty('category', 'area');
    expect(res.body.findings[0]).toHaveProperty('severity', 'medium');
    expect(res.body.disclaimer).toContain('DEMO / SYNTHETIC DATA');

    querySpy.mockRestore();
  });

  it('Step 3: Confirms conflict flag matches backward-compatible conflict service', async () => {
    const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql) => {
      const sqlStr = typeof sql === 'string' ? sql : '';
      if (sqlStr.includes('FROM parcels')) {
        return {
          rows: [mockParcel42],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    });

    const res = await request(app)
      .get('/api/conflicts/PB-LDH-0042')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('conflict_id');
    expect(res.body[0]).toHaveProperty('severity', 'medium');
    expect(res.body[0].description).toContain('70');

    querySpy.mockRestore();
  });

  it('Step 4: Citizen is rejected with 403 Forbidden when attempting statutory mutation', async () => {
    const res = await request(app)
      .post('/api/mutation/PB-LDH-0042')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        decision: 'approved',
        officer_id: 'CIT-101',
        notes: 'Attempting self-approval'
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(res.body.error).toBe('forbidden');
    expect(res.body.message).toContain('Insufficient permissions');
  });

  it('Step 5: Revenue Officer records statutory adjudication with mandatory note, returning SHA-256 seal', async () => {
    const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql) => {
      const sqlStr = typeof sql === 'string' ? sql : '';
      if (sqlStr.includes('FROM parcels')) {
        return {
          rows: [mockParcel42],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        };
      }
      if (sqlStr.includes('SELECT audit_hash FROM mutations')) {
        return {
          rows: [{ audit_hash: '9f83c605d84736f10e0427b246a4d528b552f8f1122d0071f282420e2478702b' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        };
      }
      if (sqlStr.includes('INSERT INTO mutations')) {
        return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    });

    const res = await request(app)
      .post('/api/mutation/PB-LDH-0042')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        decision: 'needs_review',
        officer_id: 'OFF-102',
        notes: 'Physical ground demarcator dispatched for 70 sqm area variance verification.'
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('status', 'recorded');
    expect(res.body).toHaveProperty('audit_hash');
    expect(typeof res.body.audit_hash).toBe('string');
    expect(res.body.audit_hash).toHaveLength(64);
    expect(res.body).toHaveProperty('timestamp');

    querySpy.mockRestore();
  });

  it('Step 6: Verified parcel PB-LDH-0044 shows perfect cross-pillar reconciliation', async () => {
    const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql) => {
      const sqlStr = typeof sql === 'string' ? sql : '';
      if (sqlStr.includes('FROM parcels')) {
        return {
          rows: [mockParcel44],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    });

    const res = await request(app)
      .get('/api/parcel/PB-LDH-0044/reconciliation')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('ulpid', 'PB-LDH-0044');
    expect(res.body).toHaveProperty('record_status', 'verified');
    expect(res.body.source_records.state_ror.area_sqm).toBe(1180);
    expect(res.body.source_records.cadastral_gis.surveyed_area_sqm).toBe(1180);
    expect(res.body.findings.length).toBe(0);

    querySpy.mockRestore();
  });
});
