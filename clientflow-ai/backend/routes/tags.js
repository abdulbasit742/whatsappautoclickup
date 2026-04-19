const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/tags — all tags
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM tags ORDER BY name`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tags
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    const r = await db.query(
      `INSERT INTO tags (name, color) VALUES ($1,$2) ON CONFLICT(name) DO UPDATE SET color=$2 RETURNING *`,
      [name, color || '#10b981']
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tags/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM tags WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tags/client/:clientId — tags for a client
router.get('/client/:clientId', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT t.*, ct.source FROM client_tags ct JOIN tags t ON t.id=ct.tag_id WHERE ct.client_id=$1`,
      [req.params.clientId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tags/client/:clientId — assign tag to client
router.post('/client/:clientId', async (req, res) => {
  try {
    const { tag_id, source } = req.body;
    const r = await db.query(
      `INSERT INTO client_tags (client_id, tag_id, source) VALUES ($1,$2,$3)
       ON CONFLICT(client_id, tag_id) DO NOTHING RETURNING *`,
      [req.params.clientId, tag_id, source || 'manual']
    );
    res.json(r.rows[0] || { message: 'already tagged' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tags/client/:clientId/:tagId
router.delete('/client/:clientId/:tagId', async (req, res) => {
  try {
    await db.query(`DELETE FROM client_tags WHERE client_id=$1 AND tag_id=$2`, [req.params.clientId, req.params.tagId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tags/rules — tagging rules
router.get('/rules', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT tr.*, t.name AS tag_name, t.color FROM tagging_rules tr LEFT JOIN tags t ON t.id=tr.tag_id ORDER BY tr.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tags/rules
router.post('/rules', async (req, res) => {
  try {
    const { name, tag_id, conditions } = req.body;
    const r = await db.query(
      `INSERT INTO tagging_rules (name, tag_id, conditions) VALUES ($1,$2,$3) RETURNING *`,
      [name, tag_id, JSON.stringify(conditions || {})]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tags/auto-apply/:clientId — run auto-tagging for a client
router.post('/auto-apply/:clientId', async (req, res) => {
  try {
    const { message } = req.body;
    const rules = (await db.query(`SELECT tr.*, t.name AS tag_name FROM tagging_rules tr JOIN tags t ON t.id=tr.tag_id WHERE tr.is_active=true`)).rows;
    const applied = [];
    for (const rule of rules) {
      const cond = rule.conditions || {};
      if (cond.keyword && message && message.toLowerCase().includes(cond.keyword.toLowerCase())) {
        await db.query(
          `INSERT INTO client_tags (client_id, tag_id, source) VALUES ($1,$2,'auto') ON CONFLICT DO NOTHING`,
          [req.params.clientId, rule.tag_id]
        );
        applied.push(rule.tag_name);
      }
    }
    res.json({ applied });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
