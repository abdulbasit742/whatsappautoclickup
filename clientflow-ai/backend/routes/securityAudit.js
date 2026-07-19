const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Get audit events ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { event_type, from, to, limit = 100 } = req.query;
    let q = `SELECT sal.*, tm.name AS user_name, tm.email AS user_email FROM security_audit_log sal
             LEFT JOIN team_members tm ON tm.id=sal.user_id
             WHERE sal.org_id=$1`;
    const params = [req.owner.org_id];
    if (event_type) { params.push(event_type); q += ` AND sal.event_type=$${params.length}`; }
    if (from) { params.push(from); q += ` AND sal.created_at >= $${params.length}`; }
    if (to)   { params.push(to);   q += ` AND sal.created_at <= $${params.length}`; }
    q += ` ORDER BY sal.created_at DESC LIMIT $${params.length+1}`;
    params.push(limit);
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Dashboard summary ────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT event_type, COUNT(*) AS count FROM security_audit_log
       WHERE org_id=$1 AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY event_type`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Log an audit event (internal) ───────────────────────────
router.post('/', async (req, res) => {
  try {
    const { user_id, event_type, ip_address, user_agent, metadata } = req.body;
    const r = await db.query(
      `INSERT INTO security_audit_log (org_id, user_id, event_type, ip_address, user_agent, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.owner.org_id, user_id, event_type, ip_address, user_agent, JSON.stringify(metadata || {})]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
