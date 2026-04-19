const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// Get all tags
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT t.*, COUNT(ct.client_id) AS usage FROM tags t LEFT JOIN client_tags ct ON ct.tag_id = t.id GROUP BY t.id ORDER BY t.name`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create tag
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    const r = await db.query(`INSERT INTO tags (name, color) VALUES ($1,$2) RETURNING *`, [name, color || '#10b981']);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Tag already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Update tag
router.put('/:id', async (req, res) => {
  try {
    const { name, color } = req.body;
    const r = await db.query(`UPDATE tags SET name=$1, color=$2 WHERE id=$3 RETURNING *`, [name, color, req.params.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete tag
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM tags WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get tags for a client
router.get('/client/:clientId', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT t.* FROM tags t JOIN client_tags ct ON ct.tag_id = t.id WHERE ct.client_id=$1`,
      [req.params.clientId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add tag to client
router.post('/client/:clientId', async (req, res) => {
  try {
    const { tag_id } = req.body;
    await db.query(`INSERT INTO client_tags (client_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.params.clientId, tag_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Remove tag from client
router.delete('/client/:clientId/:tagId', async (req, res) => {
  try {
    await db.query(`DELETE FROM client_tags WHERE client_id=$1 AND tag_id=$2`, [req.params.clientId, req.params.tagId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
