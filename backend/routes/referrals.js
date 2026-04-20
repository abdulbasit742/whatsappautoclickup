const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendText } = require('../services/whatsappService');

router.use(auth);

router.get('/leaderboard', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT c.name, c.whatsapp_number, c.referral_code, COUNT(r.id) as referral_count
       FROM clients c LEFT JOIN referrals r ON r.referrer_id=c.id
       GROUP BY c.id ORDER BY referral_count DESC LIMIT 20`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/reward', async (req, res) => {
  try {
    const { message } = req.body;
    const client = (await db.query(`SELECT whatsapp_number FROM clients WHERE id=$1`, [req.params.id])).rows[0];
    await sendText(client.whatsapp_number, message || '🎉 Thank you for referring clients! Here is your reward. We appreciate you! 🙏');
    await db.query(`UPDATE referrals SET reward_sent=true, reward_sent_at=NOW() WHERE referrer_id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
