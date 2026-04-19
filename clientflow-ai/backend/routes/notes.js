const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { client_id, lead_id } = req.query;
    let q = `SELECT n.*, u.name AS author_name FROM notes n LEFT JOIN users u ON u.id = n.author_id WHERE 1=1`;
    const params = [];
    if (client_id) { params.push(client_id); q += ` AND n.client_id=$${params.length}`; }
    if (lead_id) { params.push(lead_id); q += ` AND n.lead_id=$${params.length}`; }
    q += ` ORDER BY n.created_at DESC`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, lead_id, content, type } = req.body;
    const author_id = req.owner?.id || null;
    const r = await db.query(
      `INSERT INTO notes (client_id, lead_id, author_id, content, type) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [client_id, lead_id, author_id, content, type || 'general']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { content, type } = req.body;
    const r = await db.query(
      `UPDATE notes SET content=$1, type=$2 WHERE id=$3 RETURNING *`,
      [content, type, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM notes WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
