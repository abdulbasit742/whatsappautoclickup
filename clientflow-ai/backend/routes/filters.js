const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/filters — saved filters
router.get('/', async (req, res) => {
  try {
    const { entity_type } = req.query;
    let q = `SELECT * FROM saved_filters WHERE 1=1`;
    const params = [];
    if (entity_type) { params.push(entity_type); q += ` AND entity_type=$${params.length}`; }
    q += ` ORDER BY created_at DESC`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/filters — save a filter
router.post('/', async (req, res) => {
  try {
    const { name, entity_type, filter_json, is_shared } = req.body;
    const r = await db.query(
      `INSERT INTO saved_filters (name, entity_type, filter_json, is_shared)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, entity_type, JSON.stringify(filter_json), is_shared || false]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/filters/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM saved_filters WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/filters/apply — apply a filter and return matching clients
router.post('/apply', async (req, res) => {
  try {
    const { filter_json } = req.body;
    const conditions = filter_json?.conditions || [];
    const operator = filter_json?.operator || 'AND';

    if (!conditions.length) {
      const r = await db.query(`SELECT * FROM clients ORDER BY last_active_at DESC LIMIT 50`);
      return res.json(r.rows);
    }

    const clauses = [];
    const params = [];

    conditions.forEach(cond => {
      const { field, op, value } = cond;
      const allowedFields = ['name','status','email','total_spent_pkr','created_at','last_active_at'];
      if (!allowedFields.includes(field)) return;

      if (op === 'equals') { params.push(value); clauses.push(`${field}=$${params.length}`); }
      else if (op === 'contains') { params.push(`%${value}%`); clauses.push(`${field} ILIKE $${params.length}`); }
      else if (op === 'gt') { params.push(value); clauses.push(`${field}>$${params.length}`); }
      else if (op === 'lt') { params.push(value); clauses.push(`${field}<$${params.length}`); }
      else if (op === 'is_null') { clauses.push(`${field} IS NULL`); }
      else if (op === 'is_not_null') { clauses.push(`${field} IS NOT NULL`); }
    });

    const where = clauses.length ? `WHERE ${clauses.join(` ${operator} `)}` : '';
    const r = await db.query(`SELECT * FROM clients ${where} ORDER BY last_active_at DESC LIMIT 100`, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
