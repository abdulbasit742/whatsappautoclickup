const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/incidents — list incidents
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM status_incidents ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/incidents — create incident
router.post('/', async (req, res) => {
  try {
    const { title, severity, description, affected_components } = req.body;
    const allowed = ['low', 'medium', 'high', 'critical'];
    if (!allowed.includes(severity)) return res.status(400).json({ error: 'Invalid severity' });
    const r = await db.query(
      `INSERT INTO status_incidents (title, severity, description, affected_components, status)
       VALUES ($1,$2,$3,$4,'investigating') RETURNING *`,
      [title, severity, description, affected_components]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/incidents/:id — incident detail with timeline
router.get('/:id', async (req, res) => {
  try {
    const [incident, timeline] = await Promise.all([
      db.query(`SELECT * FROM status_incidents WHERE id=$1`, [req.params.id]),
      db.query(`SELECT * FROM incident_updates WHERE incident_id=$1 ORDER BY created_at ASC`, [req.params.id]),
    ]);
    if (!incident.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ...incident.rows[0], timeline: timeline.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/incidents/:id/update — add timeline update
router.post('/:id/update', async (req, res) => {
  try {
    const { message, status } = req.body;
    const allowed = ['investigating', 'identified', 'monitoring', 'resolved'];
    if (status && !allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const r = await db.query(
      `INSERT INTO incident_updates (incident_id, message, status) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, message, status]
    );
    if (status) {
      await db.query(`UPDATE status_incidents SET status=$1, updated_at=NOW() WHERE id=$2`, [status, req.params.id]);
    }
    if (status === 'resolved') {
      await db.query(`UPDATE status_incidents SET resolved_at=NOW() WHERE id=$1`, [req.params.id]);
    }
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/incidents/:id/resolve — resolve incident
router.put('/:id/resolve', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE status_incidents SET status='resolved', resolved_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/incidents/:id — update incident fields
router.put('/:id', async (req, res) => {
  try {
    const { title, severity, description, affected_components } = req.body;
    const r = await db.query(
      `UPDATE status_incidents SET title=$1, severity=$2, description=$3, affected_components=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [title, severity, description, affected_components, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
