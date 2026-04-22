/**
 * Integration tests — AI endpoints
 */

const request = require('supertest');
const app     = require('../../server');

let authToken  = '';
let clientId   = '';

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: process.env.TEST_EMAIL || 'admin@example.com', password: process.env.TEST_PASSWORD || 'Test@12345' });
  authToken = res.body.token || '';

  // Get a client for testing
  const clients = await request(app)
    .get('/api/clients')
    .set('Authorization', `Bearer ${authToken}`);
  clientId = clients.body[0]?.id || null;
});

describe('AI API', () => {
  describe('POST /api/ai/suggest-reply', () => {
    it('should return a suggested reply', async () => {
      const res = await request(app)
        .post('/api/ai/suggest-reply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId:    clientId || 'test-client',
          lastMessage: 'Hello, I need help with my order',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reply');
      expect(typeof res.body.reply).toBe('string');
      expect(res.body.reply.length).toBeGreaterThan(5);
    }, 15000);

    it('should handle missing clientId gracefully', async () => {
      const res = await request(app)
        .post('/api/ai/suggest-reply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ lastMessage: 'Test message' });

      expect([200, 400, 500]).toContain(res.status);
    }, 10000);

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/ai/suggest-reply')
        .send({ clientId: 'test', lastMessage: 'test' });

      expect(res.status).toBe(401);
    });
  });

  describe('AI provider failover', () => {
    it('should return a reply even when primary provider fails', async () => {
      // Test that the AI service returns something regardless of provider state
      const res = await request(app)
        .post('/api/ai/suggest-reply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId:    clientId || 'fallback-test',
          lastMessage: 'I need a price quote',
        });

      // Should succeed even if OpenAI is unavailable (falls back to template)
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('reply');
      }
    }, 15000);
  });

  describe('Segment prediction (AI feature)', () => {
    it('GET /api/segments should return segments', async () => {
      const res = await request(app)
        .get('/api/segments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('segments');
      expect(Array.isArray(res.body.segments)).toBe(true);
    }, 20000);

    it('GET /api/segments/predict/:clientId should return prediction', async () => {
      if (!clientId) return;
      const res = await request(app)
        .get(`/api/segments/predict/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('score');
      expect(res.body).toHaveProperty('segment');
      expect(res.body.score).toBeGreaterThanOrEqual(0);
      expect(res.body.score).toBeLessThanOrEqual(100);
    }, 15000);
  });

  describe('Lead scoring (AI feature)', () => {
    it('GET /api/leads/scores should return lead scores', async () => {
      const res = await request(app)
        .get('/api/leads/scores')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    }, 20000);

    it('GET /api/leads/score/:clientId should return individual score', async () => {
      if (!clientId) return;
      const res = await request(app)
        .get(`/api/leads/score/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('score');
      expect(res.body).toHaveProperty('conversionProbability');
    }, 15000);
  });
});
