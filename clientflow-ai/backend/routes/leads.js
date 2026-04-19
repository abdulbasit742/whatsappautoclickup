const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { stage, search, assigned_to } = req.query;
    let q = `
      SELECT l.*, c.name AS client_name, c.whatsapp_number, c.email,
             u.name AS assigned_name
      FROM leads l
      LEFT JOIN clients c ON c.id = l.client_id
      LEFT JOIN users u ON u.id = l.assigned_to
      WHERE 1=1
    `;
    const params = [];
    if (stage) { params.push(stage); q += ` AND l.stage=$${params.length}`; }
    if (assigned_to) { params.push(assigned_to); q += ` AND l.assigned_to=$${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      q += ` AND (c.name ILIKE $${params.length} OR l.title ILIKE $${params.length})`;
    }
    q += ` ORDER BY l.created_at DESC`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT l.*, c.name AS client_name, c.whatsapp_number, u.name AS assigned_name
       FROM leads l
       LEFT JOIN clients c ON c.id = l.client_id
       LEFT JOIN users u ON u.id = l.assigned_to
       WHERE l.id=$1`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, title, source, stage, value_pkr, assigned_to, notes } = req.body;
    const r = await db.query(
      `INSERT INTO leads (client_id, title, source, stage, value_pkr, assigned_to, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [client_id, title, source, stage || 'new', value_pkr, assigned_to, notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, source, stage, value_pkr, lead_score, assigned_to, follow_up_status, payment_status, issue_status, notes } = req.body;
    const r = await db.query(
      `UPDATE leads SET title=$1, source=$2, stage=$3, value_pkr=$4, lead_score=$5,
       assigned_to=$6, follow_up_status=$7, payment_status=$8, issue_status=$9, notes=$10,
       closed_at = CASE WHEN $3 IN ('won','lost') THEN NOW() ELSE closed_at END
       WHERE id=$11 RETURNING *`,
      [title, source, stage, value_pkr, lead_score, assigned_to, follow_up_status, payment_status, issue_status, notes, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM leads WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lead stats
router.get('/stats/summary', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT stage, COUNT(*) as count, SUM(value_pkr) as total_value, AVG(lead_score) as avg_score
      FROM leads GROUP BY stage
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
