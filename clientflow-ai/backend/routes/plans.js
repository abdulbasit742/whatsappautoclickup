const express = require('express');
const router = express.Router();
const db = require('../db');

// Public — no auth required
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM plans WHERE is_active = TRUE ORDER BY sort_order ASC`
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM plans WHERE id = $1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
