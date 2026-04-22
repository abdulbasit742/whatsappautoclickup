/**
 * Integration tests — Auth API
 * Requires: running backend + PostgreSQL
 */

const request = require('supertest');
const app     = require('../../server');

const TEST_EMAIL    = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test@12345';
let authToken = '';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', TEST_EMAIL);
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Duplicate' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'missing@example.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      authToken = res.body.token;
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: 'wrongpassword' });

      expect([400, 401]).toContain(res.status);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'pass' });

      expect([400, 401, 404]).toContain(res.status);
    });
  });

  describe('Token validation', () => {
    it('should allow access to protected route with valid token', async () => {
      if (!authToken) return;
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/clients');
      expect(res.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
    });

    it('should reject malformed authorization header', async () => {
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', 'NotBearer token');

      expect(res.status).toBe(401);
    });
  });
});
