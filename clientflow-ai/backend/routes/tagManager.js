const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List tags ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { entity_type } = req.query;
    let q = `SELECT * FROM tags WHERE org_id=$1`;
    const params = [req.owner.org_id];
    if (entity_type) { params.push(entity_type); q += ` AND entity_type=$${params.length}`; }
    q += ` ORDER BY name`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create tag ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, color, entity_type } = req.body;
    const r = await db.query(
      `INSERT INTO tags (org_id, name, color, entity_type) VALUES ($1,$2,$3,$4)
       ON CONFLICT (org_id, name, entity_type) DO NOTHING RETURNING *`,
      [req.owner.org_id, name, color || '#6366f1', entity_type || 'contact']
    );
    res.status(201).json(r.rows[0] || { message: 'Already exists' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete tag ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM tags WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Get tags for entity ──────────────────────────────────────
router.get('/entity/:entityId', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT t.* FROM tags t JOIN entity_tags et ON et.tag_id=t.id
       WHERE et.entity_id=$1 AND t.org_id=$2`,
      [req.params.entityId, req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Add tag to entity ────────────────────────────────────────
router.post('/entity', async (req, res) => {
  try {
    const { tag_id, entity_id } = req.body;
    await db.query(
      `INSERT INTO entity_tags (tag_id, entity_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [tag_id, entity_id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Remove tag from entity ───────────────────────────────────
router.delete('/entity', async (req, res) => {
  try {
    const { tag_id, entity_id } = req.body;
    await db.query(`DELETE FROM entity_tags WHERE tag_id=$1 AND entity_id=$2`, [tag_id, entity_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Bulk tag multiple entities ───────────────────────────────
router.post('/bulk', async (req, res) => {
  try {
    const { tag_id, entity_ids } = req.body;
    const values = entity_ids.map((_,i) => `($1,$${i+2})`).join(',');
    await db.query(
      `INSERT INTO entity_tags (tag_id, entity_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [tag_id, ...entity_ids]
    );
    res.json({ success: true, count: entity_ids.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
