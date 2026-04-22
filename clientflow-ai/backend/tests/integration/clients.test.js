/**
 * Integration tests — Clients API
 */

const request = require('supertest');
const app     = require('../../server');

let authToken = '';
let createdClientId = '';

const TEST_CLIENT = {
  whatsapp_number: `+9230${Date.now().toString().slice(-8)}`,
  name:            'Integration Test Client',
  email:           `client_${Date.now()}@example.com`,
  status:          'lead',
};

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: process.env.TEST_EMAIL || 'admin@example.com', password: process.env.TEST_PASSWORD || 'Test@12345' });
  authToken = res.body.token || '';
});

describe('Clients API', () => {
  describe('GET /api/clients', () => {
    it('should return array of clients', async () => {
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/clients?status=lead')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      res.body.forEach(c => expect(c.status).toBe('lead'));
    });

    it('should filter by search query', async () => {
      const res = await request(app)
        .get('/api/clients?search=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Client lifecycle (CRUD)', () => {
    it('should get messages for a client (empty array)', async () => {
      const listRes = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`);

      if (listRes.body.length === 0) return; // no clients yet, skip

      const clientId = listRes.body[0].id;
      const res = await request(app)
        .get(`/api/clients/${clientId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 404 for non-existent client', async () => {
      const res = await request(app)
        .get('/api/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should update a client', async () => {
      const listRes = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`);

      if (listRes.body.length === 0) return;

      const clientId = listRes.body[0].id;
      const res      = await request(app)
        .put(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name', notes: 'Updated notes' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name');
    });
  });

  describe('Pagination & filtering', () => {
    it('should handle empty search results gracefully', async () => {
      const res = await request(app)
        .get('/api/clients?search=zzzzznonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('Authorization', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/clients');
      expect(res.status).toBe(401);
    });
  });
});
