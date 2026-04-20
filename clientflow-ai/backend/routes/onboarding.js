const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const ITEMS = ['complete_profile','connect_ai','import_contacts','invite_team','create_campaign','open_inbox'];

// ── Get progress ─────────────────────────────────────────────────────────────
router.get('/:orgId/:userId', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT item, completed_at FROM onboarding_progress
       WHERE org_id=$1 AND user_id=$2`,
      [req.params.orgId, req.params.userId]
    );
    const completed = new Set(rows.map(r => r.item));
    const progress = ITEMS.map(item => ({
      item,
      completed: completed.has(item),
      completed_at: rows.find(r => r.item === item)?.completed_at || null,
    }));
    const percent = Math.round((completed.size / ITEMS.length) * 100);
    res.json({ progress, percent, total: ITEMS.length, done: completed.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mark item complete ───────────────────────────────────────────────────────
router.post('/:orgId/:userId/complete', auth, async (req, res) => {
  const { item } = req.body;
  if (!ITEMS.includes(item)) return res.status(400).json({ error: 'Invalid checklist item' });
  try {
    await db.query(
      `INSERT INTO onboarding_progress (org_id, user_id, item, completed_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (org_id, user_id, item) DO UPDATE SET completed_at=NOW()`,
      [req.params.orgId, req.params.userId, item]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reset (for demo) ─────────────────────────────────────────────────────────
router.delete('/:orgId/:userId', auth, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM onboarding_progress WHERE org_id=$1 AND user_id=$2`,
      [req.params.orgId, req.params.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
