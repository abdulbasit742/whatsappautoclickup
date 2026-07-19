const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Global advanced search ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Ensure q and types are always strings, not arrays (type confusion guard)
    const q     = Array.isArray(req.query.q)     ? req.query.q[0]     : req.query.q;
    const types = Array.isArray(req.query.types)  ? req.query.types[0] : req.query.types;
    const limit = parseInt(req.query.limit) || 20;
    if (!q || typeof q !== 'string' || q.length < 2) return res.json({ results: [] });
    const like = `%${q}%`;
    const searchTypes = types ? types.split(',') : ['contacts','conversations','issues'];
    const results = {};

    if (searchTypes.includes('contacts')) {
      const r = await db.query(
        `SELECT id, name, whatsapp_number AS subtitle, 'contact' AS type, last_active_at AS date
         FROM clients WHERE name ILIKE $1 OR whatsapp_number ILIKE $1 OR email ILIKE $1
         LIMIT $2`,
        [like, limit]
      );
      results.contacts = r.rows;
    }
    if (searchTypes.includes('conversations')) {
      const r = await db.query(
        `SELECT m.id, m.content AS name, c.name AS subtitle, 'conversation' AS type, m.created_at AS date
         FROM messages m JOIN clients c ON c.id=m.client_id
         WHERE m.content ILIKE $1 LIMIT $2`,
        [like, limit]
      );
      results.conversations = r.rows;
    }
    if (searchTypes.includes('issues')) {
      const r = await db.query(
        `SELECT id, title AS name, description AS subtitle, 'issue' AS type, created_at AS date
         FROM issues WHERE title ILIKE $1 OR description ILIKE $1 LIMIT $2`,
        [like, limit]
      );
      results.issues = r.rows;
    }
    if (searchTypes.includes('campaigns')) {
      const r = await db.query(
        `SELECT id, name, 'campaign' AS type, created_at AS date
         FROM broadcasts WHERE name ILIKE $1 LIMIT $2`,
        [like, limit]
      ).catch(() => ({ rows: [] }));
      results.campaigns = r.rows;
    }

    res.json({ query: q, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Recent searches (stored in-memory by user; DB version) ──
router.post('/recent', async (req, res) => {
  // Simple stub – store in a session or cookie in real usage
  res.json({ saved: true });
});

module.exports = router;
