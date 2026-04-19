const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT a.*, c.name, c.whatsapp_number FROM alerts a
       LEFT JOIN clients c ON c.id=a.client_id
       WHERE a.is_resolved=false ORDER BY a.created_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try {
    const r = await db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`);
    res.json({ count: parseInt(r.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/resolve', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE alerts SET is_resolved=true, resolved_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
