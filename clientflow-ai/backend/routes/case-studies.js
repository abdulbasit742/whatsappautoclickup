const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/case-studies — list all case studies
router.get('/', async (req, res) => {
  try {
    const { published } = req.query;
    let q = `SELECT * FROM case_studies WHERE 1=1`;
    const params = [];
    if (published !== undefined) { params.push(published === 'true'); q += ` AND is_published=$${params.length}`; }
    q += ` ORDER BY created_at DESC`;
    res.json((await db.query(q, params)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/case-studies — create case study
router.post('/', async (req, res) => {
  try {
    const { title, customer_name, logo_url, problem, solution, results, tags } = req.body;
    const r = await db.query(
      `INSERT INTO case_studies (title, customer_name, logo_url, problem, solution, results, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, customer_name, logo_url, problem, solution, results, tags]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/case-studies/:id — single case study
router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM case_studies WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/case-studies/:id — update
router.put('/:id', async (req, res) => {
  try {
    const { title, customer_name, logo_url, problem, solution, results, tags } = req.body;
    const r = await db.query(
      `UPDATE case_studies SET title=$1, customer_name=$2, logo_url=$3, problem=$4, solution=$5, results=$6, tags=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [title, customer_name, logo_url, problem, solution, results, tags, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/case-studies/:id/publish — toggle publish
router.put('/:id/publish', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE case_studies SET is_published=true, published_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/case-studies/:id/unpublish
router.put('/:id/unpublish', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE case_studies SET is_published=false WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/case-studies/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM case_studies WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
