import request from 'supertest';
import { createApp } from '../../src/app/createApp';
import { authService } from '../../src/services/authService';
import { db } from '../../src/db/pool';

describe('Authentication & RBAC Integration Tests', () => {
  const app = createApp();

  afterAll(async () => {
    await db.close();
  });

  describe('POST /api/auth/register (Citizen Self-Registration)', () => {
    it('1. should successfully register a new citizen account with 201 Created', async () => {
      const uniqueSuffix = Date.now().toString().slice(-4);
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sunita Devi',
          email: `sunita.${uniqueSuffix}@example.com`,
          username: `sunita_${uniqueSuffix}`,
          password: 'Password@2026'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Citizen account registered successfully');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.name).toBe('Sunita Devi');
      expect(res.body.user.email).toBe(`sunita.${uniqueSuffix}@example.com`);
      expect(res.body.user.username).toBe(`sunita_${uniqueSuffix}`);
      expect(res.body.user.role).toBe('citizen');
      // Verify no password or hash is returned
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('2. should reject registration with duplicate email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Citizen',
          email: 'citizen@bhusetu.demo', // Already exists as demo persona
          username: 'new_unique_username',
          password: 'Password@2026'
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(res.body.error).toBe('duplicate_user');
      expect(res.body.message).toContain('email already exists');
    });

    it('3. should reject registration with duplicate username with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Username',
          email: 'unique_new_email@example.com',
          username: 'citizen', // Already exists as demo persona
          password: 'Password@2026'
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(res.body.error).toBe('duplicate_user');
      expect(res.body.message).toContain('username already exists');
    });

    it('4. should reject invalid email format with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'not-an-email',
          username: 'valid_user',
          password: 'Password@2026'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body.error).toBe('validation_error');
      expect(res.body.message).toContain('Invalid email');
    });

    it('5. should reject weak/short password (< 8 chars) with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass User',
          email: 'shortpass@example.com',
          username: 'shortpass_user',
          password: '123'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body.error).toBe('validation_error');
      expect(res.body.message).toContain('at least 8 characters');
    });

    it('6. should strictly enforce citizen role even if client passes privileged role in body', async () => {
      const uniqueSuffix = Date.now().toString().slice(-4) + 'a';
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Attempted Admin',
          email: `admin.attempt.${uniqueSuffix}@example.com`,
          username: `admin_attempt_${uniqueSuffix}`,
          password: 'Password@2026',
          role: 'admin' // Attempted privilege escalation
        })
        .expect(201);

      expect(res.body.user.role).toBe('citizen'); // Forced to citizen
    });

    it('7. should store password securely as PBKDF2 hash, not plaintext', async () => {
      const uniqueSuffix = Date.now().toString().slice(-4) + 'b';
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hash Check User',
          email: `hashcheck.${uniqueSuffix}@example.com`,
          username: `hashcheck_${uniqueSuffix}`,
          password: 'SecretPassword@123'
        })
        .expect(201);

      const userId = res.body.user.userId;
      const stored = authService.findUserById(userId);
      expect(stored).toBeDefined();
      expect(stored?.passwordHash).not.toBe('SecretPassword@123');
      expect(stored?.passwordHash).toContain(':');
    });
  });

  describe('POST /api/auth/login (Standard Login)', () => {
    it('8. should never return password or passwordHash on login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'citizen',
          password: 'BhuSetu@2026'
        })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('9. should allow a newly registered citizen to log in successfully', async () => {
      const uniqueSuffix = Date.now().toString().slice(-4) + 'c';
      const email = `newcitizen.${uniqueSuffix}@example.com`;
      const username = `newcitizen_${uniqueSuffix}`;
      const password = 'CustomPassword@2026';

      // Register
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Registered Citizen',
          email,
          username,
          password
        })
        .expect(201);

      // Login with username
      const loginResUsername = await request(app)
        .post('/api/auth/login')
        .send({ username, password })
        .expect(200);

      expect(loginResUsername.body.user.username).toBe(username);
      expect(loginResUsername.body.user.role).toBe('citizen');
      expect(loginResUsername.body).toHaveProperty('token');

      // Login with email
      const loginResEmail = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(loginResEmail.body.user.email).toBe(email);
      expect(loginResEmail.body.user.role).toBe('citizen');
    });

    it('10. should reject invalid login credentials with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'citizen',
          password: 'WrongPassword123'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body.error).toBe('invalid_credentials');
      expect(res.body.message).toContain('Invalid username or password');
    });

    it('11. should allow all 4 demo personas to log in with BhuSetu@2026', async () => {
      const personas = [
        { identifier: 'citizen@bhusetu.demo', role: 'citizen' },
        { identifier: 'officer@bhusetu.demo', role: 'revenue_officer' },
        { identifier: 'registrar@bhusetu.demo', role: 'registrar' },
        { identifier: 'admin@bhusetu.demo', role: 'admin' }
      ];

      for (const p of personas) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            identifier: p.identifier,
            password: 'BhuSetu@2026'
          })
          .expect(200);

        expect(res.body.user.role).toBe(p.role);
        expect(res.body).toHaveProperty('token');
      }
    });
  });

  describe('RBAC & Protected Endpoints', () => {
    it('12. should allow revenue_officer to submit mutation decision and forbid citizen (403)', async () => {
      // Mock db query for mutation recording
      const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql) => {
        const sqlStr = typeof sql === 'string' ? sql : '';
        if (sqlStr.includes('FROM parcels')) {
          return {
            rows: [{ id: 'mock-parcel-uuid' }],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: []
          };
        }
        if (sqlStr.includes('SELECT audit_hash FROM mutations')) {
          return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
        }
        if (sqlStr.includes('INSERT INTO mutations')) {
          return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
        }
        return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
      });

      // Officer Token
      const officerLogin = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'officer@bhusetu.demo', password: 'BhuSetu@2026' })
        .expect(200);

      const officerToken = officerLogin.body.token;

      // Citizen Token
      const citizenLogin = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'citizen@bhusetu.demo', password: 'BhuSetu@2026' })
        .expect(200);

      const citizenToken = citizenLogin.body.token;

      // Citizen attempt on mutation route -> 403 Forbidden
      const citizenAttempt = await request(app)
        .post('/api/mutation/PB-LDH-0042')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          decision: 'approved',
          officer_id: 'CIT-101',
          notes: 'Citizen attempting unauthorized approval'
        })
        .expect(403);

      expect(citizenAttempt.body.error).toBe('forbidden');

      // Officer attempt on mutation route -> 200 OK (authorized)
      const officerAttempt = await request(app)
        .post('/api/mutation/PB-LDH-0042')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          decision: 'approved',
          officer_id: 'OFF-102',
          notes: 'Authorized revenue officer approval'
        })
        .expect(200);

      expect(officerAttempt.body.status).toBe('recorded');
      querySpy.mockRestore();
    });

    it('13. should reject unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body.error).toBe('unauthorized');
    });
  });

  describe('POST /api/auth/dev-token (Development Demo Access)', () => {
    it('should generate a token for citizen role', async () => {
      const res = await request(app)
        .post('/api/auth/dev-token')
        .send({ role: 'citizen' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('citizen');
    });

    it('should generate a token for revenue_officer role with default officer ID', async () => {
      const res = await request(app)
        .post('/api/auth/dev-token')
        .send({ role: 'revenue_officer' })
        .expect(200);

      expect(res.body.user.role).toBe('revenue_officer');
      expect(res.body.user.officerId).toBe('OFF-102');
    });

    it('should reject invalid role with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/auth/dev-token')
        .send({ role: 'superhero' })
        .expect(400);

      expect(res.body.error).toBe('validation_error');
    });
  });
});
