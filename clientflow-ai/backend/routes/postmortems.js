const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/postmortems — list all postmortems
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT p.*, i.title AS incident_title FROM postmortems p
       LEFT JOIN status_incidents i ON i.id=p.incident_id
       ORDER BY p.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/postmortems — create postmortem (optionally linked to incident)
router.post('/', async (req, res) => {
  try {
    const { incident_id, summary, impact, root_cause, timeline, fixes, prevention_actions } = req.body;
    const r = await db.query(
      `INSERT INTO postmortems (incident_id, summary, impact, root_cause, timeline, fixes, prevention_actions)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [incident_id, summary, impact, root_cause, timeline, fixes, prevention_actions]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/postmortems/:id — get single postmortem
router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT p.*, i.title AS incident_title, i.severity, i.resolved_at AS incident_resolved_at
       FROM postmortems p LEFT JOIN status_incidents i ON i.id=p.incident_id WHERE p.id=$1`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/postmortems/:id — update
router.put('/:id', async (req, res) => {
  try {
    const { summary, impact, root_cause, timeline, fixes, prevention_actions } = req.body;
    const r = await db.query(
      `UPDATE postmortems SET summary=$1, impact=$2, root_cause=$3, timeline=$4, fixes=$5, prevention_actions=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [summary, impact, root_cause, timeline, fixes, prevention_actions, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/postmortems/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM postmortems WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
