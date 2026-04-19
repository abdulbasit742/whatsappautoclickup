const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List workflows ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT w.*, tm.name AS creator_name,
              (SELECT COUNT(*) FROM workflow_runs wr WHERE wr.workflow_id=w.id) AS total_runs
       FROM workflows w LEFT JOIN team_members tm ON tm.id=w.created_by
       WHERE w.org_id=$1 ORDER BY w.created_at DESC`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create workflow ──────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, trigger, conditions, actions } = req.body;
    const r = await db.query(
      `INSERT INTO workflows (org_id, name, trigger, conditions, actions, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.owner.org_id, name, JSON.stringify(trigger), JSON.stringify(conditions || []), JSON.stringify(actions || []), req.owner.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Update workflow ──────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, trigger, conditions, actions, is_active } = req.body;
    const r = await db.query(
      `UPDATE workflows SET name=$1, trigger=$2, conditions=$3, actions=$4, is_active=$5, updated_at=NOW()
       WHERE id=$6 AND org_id=$7 RETURNING *`,
      [name, JSON.stringify(trigger), JSON.stringify(conditions || []), JSON.stringify(actions || []), is_active !== false, req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Toggle active ────────────────────────────────────────────
router.put('/:id/toggle', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE workflows SET is_active = NOT is_active WHERE id=$1 AND org_id=$2 RETURNING *`,
      [req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete workflow ──────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM workflows WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Workflow run history ─────────────────────────────────────
router.get('/:id/runs', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM workflow_runs WHERE workflow_id=$1 ORDER BY ran_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
