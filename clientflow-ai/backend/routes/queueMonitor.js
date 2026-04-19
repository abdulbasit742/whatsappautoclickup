const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Queue stats ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    // These are simulated stats; integrate with your actual queue (BullMQ/Redis) for real data
    res.json({
      campaigns:  { active: 2, delayed: 1, failed: 0, retried: 0, dead: 0 },
      followups:  { active: 5, delayed: 3, failed: 1, retried: 2, dead: 0 },
      ai_jobs:    { active: 1, delayed: 0, failed: 0, retried: 0, dead: 0 },
      notifications: { active: 0, delayed: 0, failed: 0, retried: 0, dead: 0 },
      webhooks:   { active: 0, delayed: 0, failed: 2, retried: 1, dead: 0 },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Recent failed jobs ───────────────────────────────────────
router.get('/failed', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM workflow_runs WHERE status='failed' ORDER BY ran_at DESC LIMIT 20`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Failed webhook deliveries ────────────────────────────────
router.get('/webhook-failures', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT wl.*, ow.name AS webhook_name FROM webhook_logs wl
       JOIN outgoing_webhooks ow ON ow.id=wl.webhook_id
       WHERE wl.status='failed' AND ow.org_id=$1 ORDER BY wl.created_at DESC LIMIT 50`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
