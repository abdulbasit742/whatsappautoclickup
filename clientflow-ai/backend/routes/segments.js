const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List segments ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT s.*, tm.name AS creator_name FROM saved_segments s
       LEFT JOIN team_members tm ON tm.id=s.created_by
       WHERE s.org_id=$1 ORDER BY s.created_at DESC`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create segment ───────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, description, entity_type, filters, is_shared } = req.body;
    const r = await db.query(
      `INSERT INTO saved_segments (org_id, name, description, entity_type, filters, is_shared, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.owner.org_id, name, description, entity_type || 'contact', JSON.stringify(filters || {}), !!is_shared, req.owner.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Update segment ───────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, description, filters, is_shared } = req.body;
    const r = await db.query(
      `UPDATE saved_segments SET name=$1, description=$2, filters=$3, is_shared=$4, updated_at=NOW()
       WHERE id=$5 AND org_id=$6 RETURNING *`,
      [name, description, JSON.stringify(filters || {}), !!is_shared, req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete segment ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM saved_segments WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Apply segment (resolve contacts matching filters) ────────
router.post('/:id/apply', async (req, res) => {
  try {
    const seg = (await db.query(
      `SELECT * FROM saved_segments WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]
    )).rows[0];
    if (!seg) return res.status(404).json({ error: 'Segment not found' });

    // Build dynamic query from filters
    const filters = seg.filters || {};
    let q = `SELECT id, name, whatsapp_number, email, status, lead_score, lead_tier FROM clients WHERE 1=1`;
    const params = [];
    if (filters.status) { params.push(filters.status); q += ` AND status=$${params.length}`; }
    if (filters.lead_tier) { params.push(filters.lead_tier); q += ` AND lead_tier=$${params.length}`; }
    if (filters.min_score) { params.push(filters.min_score); q += ` AND lead_score>=$${params.length}`; }
    if (filters.tag) { params.push(filters.tag); q += ` AND id IN (SELECT et.entity_id FROM entity_tags et JOIN tags t ON t.id=et.tag_id WHERE t.name=$${params.length} AND t.entity_type='contact')`; }
    q += ` LIMIT 500`;
    const r = await db.query(q, params);
    res.json({ segment: seg, count: r.rows.length, contacts: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
