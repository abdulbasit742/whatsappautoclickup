const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { priority, type } = req.query;
    let q = `SELECT a.*, c.name, c.whatsapp_number FROM alerts a
             LEFT JOIN clients c ON c.id=a.client_id
             WHERE a.is_resolved=false`;
    const params = [];
    if (priority) { params.push(priority); q += ` AND a.priority=$${params.length}`; }
    if (type) { params.push(type); q += ` AND a.type=$${params.length}`; }
    q += ` ORDER BY
      CASE a.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
      a.created_at DESC LIMIT 100`;
    res.json((await db.query(q, params)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try {
    const r = await db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`);
    const high = await db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false AND priority='high'`);
    res.json({
      count: parseInt(r.rows[0].count),
      high: parseInt(high.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/resolve', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE alerts SET is_resolved=true, resolved_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Alert not found' });

    // Push real-time update to all dashboard clients
    req.app.get('io')?.emit('alert_resolved', { alertId: req.params.id });

    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/resolve-all', async (req, res) => {
  try {
    const { type } = req.body;
    let q = `UPDATE alerts SET is_resolved=true, resolved_at=NOW() WHERE is_resolved=false`;
    const params = [];
    if (type) { params.push(type); q += ` AND type=$${params.length}`; }
    q += ` RETURNING id`;
    const r = await db.query(q, params);
    req.app.get('io')?.emit('alerts_bulk_resolved', { count: r.rows.length });
    res.json({ resolved: r.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auto-resolution: resolve old low-priority alerts (>7 days)
router.post('/auto-resolve', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE alerts SET is_resolved=true, resolved_at=NOW()
       WHERE is_resolved=false AND priority='low' AND created_at < NOW() - INTERVAL '7 days'
       RETURNING id`
    );
    res.json({ resolved: r.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
