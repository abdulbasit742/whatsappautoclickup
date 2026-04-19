const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(auth);
router.use(apiLimiter);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT key, value FROM settings ORDER BY key`);
    const obj = {};
    for (const row of r.rows) obj[row.key] = row.value;
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.query(
        `INSERT INTO settings (key,value,updated_at) VALUES ($1,$2,NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, value]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
