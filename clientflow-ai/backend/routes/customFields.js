const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List custom field definitions ───────────────────────────
router.get('/definitions', async (req, res) => {
  try {
    const { entity_type } = req.query;
    let q = `SELECT * FROM custom_field_definitions WHERE org_id=$1`;
    const params = [req.owner.org_id];
    if (entity_type) { params.push(entity_type); q += ` AND entity_type=$${params.length}`; }
    q += ` ORDER BY sort_order, created_at`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create field definition ──────────────────────────────────
router.post('/definitions', async (req, res) => {
  try {
    const { entity_type, field_key, label, field_type, options, is_required, sort_order } = req.body;
    const r = await db.query(
      `INSERT INTO custom_field_definitions (org_id, entity_type, field_key, label, field_type, options, is_required, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.owner.org_id, entity_type, field_key, label, field_type, JSON.stringify(options || []), !!is_required, sort_order || 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete field definition ──────────────────────────────────
router.delete('/definitions/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM custom_field_definitions WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Get field values for entity ─────────────────────────────
router.get('/values/:entityId', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT cfv.*, cfd.label, cfd.field_key, cfd.field_type FROM custom_field_values cfv
       JOIN custom_field_definitions cfd ON cfd.id=cfv.definition_id
       WHERE cfv.entity_id=$1 AND cfd.org_id=$2`,
      [req.params.entityId, req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Set field value ──────────────────────────────────────────
router.post('/values', async (req, res) => {
  try {
    const { definition_id, entity_id, value_text, value_number, value_date, value_bool } = req.body;
    const r = await db.query(
      `INSERT INTO custom_field_values (definition_id, entity_id, value_text, value_number, value_date, value_bool)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (definition_id, entity_id) DO UPDATE SET
         value_text=EXCLUDED.value_text, value_number=EXCLUDED.value_number,
         value_date=EXCLUDED.value_date, value_bool=EXCLUDED.value_bool, updated_at=NOW()
       RETURNING *`,
      [definition_id, entity_id, value_text, value_number, value_date, value_bool]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
