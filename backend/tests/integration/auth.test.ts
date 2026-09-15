import request from 'supertest';
import { createApp } from '../../src/app/createApp';
import { authService } from '../../src/services/authService';

describe('Authentication & RBAC Integration Tests', () => {
  const app = createApp();

  describe('POST /api/auth/dev-token', () => {
    it('should generate a token for citizen role', async () => {
      const res = await request(app)
        .post('/api/auth/dev-token')
        .send({ role: 'citizen' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.role).toBe('citizen');
      expect(res.body.user.userId).toBe('CIT-101');
    });

    it('should generate a token for revenue_officer role with default officer ID', async () => {
      const res = await request(app)
        .post('/api/auth/dev-token')
        .send({ role: 'revenue_officer' })
        .expect(200);

      expect(res.body.user.role).toBe('revenue_officer');
      expect(res.body.user.officerId).toBe('OFF-102');
    });

    it('should generate a token for registrar role', async () => {
      const res = await request(app)
        .post('/api/auth/dev-token')
        .send({ role: 'registrar' })
        .expect(200);

      expect(res.body.user.role).toBe('registrar');
      expect(res.body.user.officerId).toBe('REG-201');
    });

    it('should generate a token for admin role', async () => {
      const res = await request(app)
        .post('/api/auth/dev-token')
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.user.role).toBe('admin');
    });

    it('should reject invalid role with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/auth/dev-token')
        .send({ role: 'superhero' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body.error).toBe('validation_error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body.error).toBe('unauthorized');
      expect(res.body.message).toContain('Authentication token is missing or invalid');
    });

    it('should return 401 when Authorization header is malformed (not Bearer)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Basic 12345')
        .expect(401);

      expect(res.body.error).toBe('unauthorized');
    });

    it('should return 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.payload')
        .expect(401);

      expect(res.body.error).toBe('unauthorized');
    });

    it('should return 200 with user context when valid token is provided', async () => {
      const token = authService.generateToken({
        userId: 'OFF-102',
        role: 'revenue_officer',
        name: 'Officer Sharma',
        officerId: 'OFF-102'
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.userId).toBe('OFF-102');
      expect(res.body.user.role).toBe('revenue_officer');
    });
  });
});
