const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// Get all issues
router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    let q = `SELECT i.*, c.name as client_name, c.whatsapp_number FROM issues i
             LEFT JOIN clients c ON c.id = i.client_id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND i.status=$${params.length}`; }
    if (type) { params.push(type); q += ` AND i.type=$${params.length}`; }
    q += ` ORDER BY i.created_at DESC`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get issue stats
router.get('/stats', async (req, res) => {
  try {
    const [open, inProgress, resolved, byType] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM issues WHERE status='open'`),
      db.query(`SELECT COUNT(*) FROM issues WHERE status='in_progress'`),
      db.query(`SELECT COUNT(*) FROM issues WHERE status='resolved'`),
      db.query(`SELECT type, COUNT(*) as count FROM issues GROUP BY type`),
    ]);
    res.json({
      open: parseInt(open.rows[0].count),
      inProgress: parseInt(inProgress.rows[0].count),
      resolved: parseInt(resolved.rows[0].count),
      byType: byType.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update issue status
router.put('/:id', async (req, res) => {
  try {
    const { status, assigned_to } = req.body;
    const r = await db.query(
      `UPDATE issues SET status=$1, assigned_to=$2, resolved_at=CASE WHEN $1='resolved' THEN NOW() ELSE NULL END WHERE id=$3 RETURNING *`,
      [status, assigned_to || null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create issue manually
router.post('/', async (req, res) => {
  try {
    const { client_id, type, message, keyword } = req.body;
    const r = await db.query(
      `INSERT INTO issues (client_id, type, message, keyword) VALUES ($1,$2,$3,$4) RETURNING *`,
      [client_id, type, message, keyword]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
