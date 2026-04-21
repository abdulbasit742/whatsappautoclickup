const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/status/components — all service components with status
router.get('/components', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM status_components ORDER BY sort_order ASC, name ASC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/status/components/:id — update component status
router.put('/components/:id', async (req, res) => {
  try {
    const { status, message } = req.body;
    const allowed = ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const r = await db.query(
      `UPDATE status_components SET status=$1, message=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [status, message, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/status/components — create component
router.post('/components', async (req, res) => {
  try {
    const { name, category, sort_order } = req.body;
    const r = await db.query(
      `INSERT INTO status_components (name, category, sort_order) VALUES ($1,$2,$3) RETURNING *`,
      [name, category, sort_order || 0]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/status/incidents — active incidents
router.get('/incidents', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM status_incidents WHERE resolved_at IS NULL ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/status/maintenance — upcoming maintenance windows
router.get('/maintenance', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM maintenance_windows WHERE scheduled_end > NOW() ORDER BY scheduled_start ASC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/status/maintenance — schedule maintenance
router.post('/maintenance', async (req, res) => {
  try {
    const { title, description, scheduled_start, scheduled_end, affected_components } = req.body;
    const r = await db.query(
      `INSERT INTO maintenance_windows (title, description, scheduled_start, scheduled_end, affected_components)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, description, scheduled_start, scheduled_end, affected_components]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/status/public — public status page data (no auth needed, but still grouped here)
router.get('/public', async (req, res) => {
  try {
    const [components, incidents, maintenance] = await Promise.all([
      db.query(`SELECT name, category, status, message, updated_at FROM status_components ORDER BY sort_order ASC`),
      db.query(`SELECT id, title, severity, status, created_at, resolved_at FROM status_incidents ORDER BY created_at DESC LIMIT 10`),
      db.query(`SELECT title, description, scheduled_start, scheduled_end FROM maintenance_windows WHERE scheduled_end > NOW() ORDER BY scheduled_start ASC LIMIT 5`),
    ]);
    const overallStatus = components.rows.some(c => c.status === 'major_outage') ? 'major_outage'
      : components.rows.some(c => c.status === 'partial_outage') ? 'partial_outage'
      : components.rows.some(c => c.status === 'degraded') ? 'degraded'
      : 'operational';
    res.json({ overall: overallStatus, components: components.rows, incidents: incidents.rows, maintenance: maintenance.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
