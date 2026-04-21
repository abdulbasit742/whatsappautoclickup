const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/roadmap — feature requests list
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let q = `SELECT r.*, COALESCE(v.vote_count,0) AS votes, COALESCE(co.comment_count,0) AS comments
             FROM roadmap_items r
             LEFT JOIN (SELECT item_id, COUNT(*) AS vote_count FROM roadmap_votes GROUP BY item_id) v ON v.item_id=r.id
             LEFT JOIN (SELECT item_id, COUNT(*) AS comment_count FROM roadmap_comments GROUP BY item_id) co ON co.item_id=r.id
             WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND r.status=$${params.length}`; }
    q += ` ORDER BY votes DESC, r.created_at DESC`;
    res.json((await db.query(q, params)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/roadmap — create feature request
router.post('/', async (req, res) => {
  try {
    const { title, description, submitted_by } = req.body;
    const r = await db.query(
      `INSERT INTO roadmap_items (title, description, submitted_by) VALUES ($1,$2,$3) RETURNING *`,
      [title, description, submitted_by]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/roadmap/:id/vote — upvote
router.post('/:id/vote', async (req, res) => {
  try {
    const { voter_id } = req.body;
    await db.query(
      `INSERT INTO roadmap_votes (item_id, voter_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.params.id, voter_id]
    );
    const count = await db.query(`SELECT COUNT(*) FROM roadmap_votes WHERE item_id=$1`, [req.params.id]);
    res.json({ votes: parseInt(count.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/roadmap/:id/comment — add comment
router.post('/:id/comment', async (req, res) => {
  try {
    const { content, author } = req.body;
    const r = await db.query(
      `INSERT INTO roadmap_comments (item_id, content, author) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, content, author]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/roadmap/:id/comments — list comments
router.get('/:id/comments', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM roadmap_comments WHERE item_id=$1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/roadmap/:id/status — admin update status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['submitted', 'planned', 'in_progress', 'shipped', 'rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const r = await db.query(
      `UPDATE roadmap_items SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/roadmap/:id — admin delete (moderation)
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM roadmap_items WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
