import request from 'supertest';
import { createApp } from '../../src/app/createApp';

describe('GET /api/health', () => {
  const app = createApp();

  it('should return status 200 with ok status object', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toEqual({
      status: 'ok'
    });
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
