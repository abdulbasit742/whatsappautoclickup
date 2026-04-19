const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// List issues
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT i.*, c.name as client_name, c.whatsapp_number
      FROM issues i
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY
        CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        i.created_at DESC
    `;
    const params = [];
    if (status) {
      query = `
        SELECT i.*, c.name as client_name, c.whatsapp_number
        FROM issues i
        LEFT JOIN clients c ON i.client_id = c.id
        WHERE i.status=$1
        ORDER BY i.created_at DESC
      `;
      params.push(status);
    }
    const r = await db.query(query, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create issue
router.post('/', async (req, res) => {
  try {
    const { title, description, severity = 'medium', client_id, status = 'open' } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const r = await db.query(
      `INSERT INTO issues (title, description, severity, client_id, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, description || null, severity, client_id || null, status]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update issue
router.put('/:id', async (req, res) => {
  try {
    const { title, description, severity, status, resolution_notes } = req.body;
    const resolvedAt = status === 'resolved' ? 'NOW()' : 'resolved_at';
    const r = await db.query(
      `UPDATE issues
       SET title=COALESCE($1,title),
           description=COALESCE($2,description),
           severity=COALESCE($3,severity),
           status=COALESCE($4,status),
           resolution_notes=COALESCE($5,resolution_notes),
           resolved_at=CASE WHEN $4='resolved' THEN NOW() ELSE resolved_at END
       WHERE id=$6 RETURNING *`,
      [title, description, severity, status, resolution_notes, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete issue
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM issues WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
