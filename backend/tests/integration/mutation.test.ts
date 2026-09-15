import request from 'supertest';
import { createApp } from '../../src/app/createApp';

describe('POST /api/mutation/{ulpid}', () => {
  const app = createApp();

  it('should successfully record mutation with approved decision and return exact response shape', async () => {
    const payload = {
      decision: 'approved',
      officer_id: 'OFF-102',
      notes: 'Verified against original survey map'
    };

    const res = await request(app)
      .post('/api/mutation/PB-LDH-0042')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('status', 'recorded');
    expect(res.body).toHaveProperty('audit_hash');
    expect(typeof res.body.audit_hash).toBe('string');
    expect(res.body.audit_hash).toHaveLength(64);
    expect(res.body).toHaveProperty('timestamp');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('should accept all allowed decision values: rejected and needs_review', async () => {
    for (const decision of ['rejected', 'needs_review'] as const) {
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

  it('should return 404 when parcel ULPID does not exist', async () => {
    const res = await request(app)
      .post('/api/mutation/NON-EXISTENT-PARCEL')
      .send({
        decision: 'approved',
        officer_id: 'OFF-102',
        notes: 'Checking non-existent parcel'
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(res.body).toEqual({
      error: 'ulpid_not_found',
      message: 'No parcel found for this ULPID'
    });
  });
});
