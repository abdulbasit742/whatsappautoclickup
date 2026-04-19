const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { sendText } = require('../services/whatsappService');

router.use(auth);
router.use(apiLimiter);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT f.*, c.name, c.whatsapp_number FROM follow_ups f
       JOIN clients c ON c.id=f.client_id
       WHERE f.status='pending' ORDER BY f.scheduled_at ASC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/trigger/:id', async (req, res) => {
  try {
    const f = (await db.query(
      `SELECT f.*,c.whatsapp_number FROM follow_ups f JOIN clients c ON c.id=f.client_id WHERE f.id=$1`,
      [req.params.id]
    )).rows[0];
    if (!f) return res.status(404).json({ error: 'Not found' });
    await sendText(f.whatsapp_number, req.body.message || 'Hello! Just checking in. 😊');
    await db.query(`UPDATE follow_ups SET status='sent', sent_at=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
