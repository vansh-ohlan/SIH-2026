import request from 'supertest';
import { createApp } from '../../src/app/createApp';

describe('CORS and Error Middleware', () => {
  const app = createApp();

  it('should include CORS headers for http://localhost:3000', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('should return 404 with standard error format for undefined routes', async () => {
    const res = await request(app)
      .get('/api/unknown/route/path')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(res.body).toEqual({
      error: 'route_not_found',
      message: 'Endpoint GET /api/unknown/route/path not found'
    });
  });

  it('should return 400 for malformed JSON request bodies', async () => {
    const res = await request(app)
      .post('/api/mutation/PB-LDH-0042')
      .set('Content-Type', 'application/json')
      .send('{"decision": "approved", broken json')
      .expect(400);

    expect(res.body).toEqual({
      error: 'invalid_json',
      message: 'Malformed JSON payload provided'
    });
  });
});
