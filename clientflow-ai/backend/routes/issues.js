const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List issues ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, priority, assigned_to } = req.query;
    let q = `SELECT i.*, c.name AS client_name, tm.name AS assignee_name FROM issues i
             LEFT JOIN clients c ON c.id=i.client_id
             LEFT JOIN team_members tm ON tm.id=i.assigned_to
             WHERE i.org_id=$1`;
    const params = [req.owner.org_id];
    if (status)      { params.push(status);      q += ` AND i.status=$${params.length}`; }
    if (priority)    { params.push(priority);    q += ` AND i.priority=$${params.length}`; }
    if (assigned_to) { params.push(assigned_to); q += ` AND i.assigned_to=$${params.length}`; }
    q += ` ORDER BY i.created_at DESC`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create issue ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { client_id, title, description, priority, assigned_to, sla_hours } = req.body;
    const sla_deadline = new Date(Date.now() + (sla_hours || 24) * 3600000).toISOString();
    const r = await db.query(
      `INSERT INTO issues (org_id, client_id, title, description, priority, assigned_to, sla_hours, sla_deadline, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.owner.org_id, client_id, title, description, priority || 'medium', assigned_to, sla_hours || 24, sla_deadline, req.owner.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Update issue ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to } = req.body;
    const resolved_at = status === 'resolved' ? 'NOW()' : 'NULL';
    const r = await db.query(
      `UPDATE issues SET title=$1, description=$2, status=$3, priority=$4,
       assigned_to=$5, resolved_at=${resolved_at}, updated_at=NOW()
       WHERE id=$6 AND org_id=$7 RETURNING *`,
      [title, description, status, priority, assigned_to, req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SLA dashboard stats ──────────────────────────────────────
router.get('/sla/stats', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='open') AS open_count,
         COUNT(*) FILTER (WHERE breached=true) AS breached_count,
         COUNT(*) FILTER (WHERE status='open' AND sla_deadline < NOW()) AS approaching_breach,
         COUNT(*) FILTER (WHERE status='resolved') AS resolved_count
       FROM issues WHERE org_id=$1`,
      [req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Escalation rules ─────────────────────────────────────────
router.get('/escalation-rules', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM escalation_rules WHERE org_id=$1`, [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/escalation-rules', async (req, res) => {
  try {
    const { priority, escalate_after_hours, notify_role } = req.body;
    const r = await db.query(
      `INSERT INTO escalation_rules (org_id, priority, escalate_after_hours, notify_role)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.owner.org_id, priority, escalate_after_hours, notify_role || 'manager']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
