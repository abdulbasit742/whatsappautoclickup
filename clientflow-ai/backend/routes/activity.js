const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/activity — paginated feed with optional filters
router.get('/', async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    let q = `SELECT * FROM activity_feed WHERE 1=1`;
    const params = [];
    if (type) { params.push(type); q += ` AND type=$${params.length}`; }
    params.push(parseInt(limit));
    params.push(parseInt(offset));
    q += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/activity — emit an event (internal use)
router.post('/', async (req, res) => {
  try {
    const { type, actor_name, entity_type, entity_id, title, detail, metadata } = req.body;
    const r = await db.query(
      `INSERT INTO activity_feed (type, actor_name, entity_type, entity_id, title, detail, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [type, actor_name, entity_type, entity_id, title, detail || null, JSON.stringify(metadata || {})]
    );
    // Emit via socket.io if available
    const io = req.app.get('io');
    if (io) io.emit('activity', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activity/types — unique types for filter dropdown
router.get('/types', async (req, res) => {
  try {
    const r = await db.query(`SELECT DISTINCT type FROM activity_feed ORDER BY type`);
    res.json(r.rows.map(r => r.type));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
