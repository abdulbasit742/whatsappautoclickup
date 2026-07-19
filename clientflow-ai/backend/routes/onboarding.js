const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const STEPS = [
  'create_org',
  'choose_plan',
  'connect_ai',
  'import_contacts',
  'invite_team',
  'create_campaign',
  'open_inbox',
];

// ─── Get onboarding progress ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT step, completed, completed_at FROM onboarding_progress WHERE org_id=$1`,
      [req.owner.org_id]
    );
    const completed = Object.fromEntries(r.rows.map(x => [x.step, x]));
    const progress = STEPS.map((step, idx) => ({
      step,
      index: idx + 1,
      completed: !!completed[step]?.completed,
      completed_at: completed[step]?.completed_at || null,
    }));
    const done = progress.filter(x => x.completed).length;
    res.json({ steps: progress, total: STEPS.length, completed: done, percent: Math.round(done / STEPS.length * 100) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Mark step complete ───────────────────────────────────────
router.post('/complete', async (req, res) => {
  try {
    const { step } = req.body;
    if (!STEPS.includes(step)) return res.status(400).json({ error: 'Invalid step' });
    await db.query(
      `INSERT INTO onboarding_progress (org_id, step, completed, completed_at)
       VALUES ($1,$2,true,NOW())
       ON CONFLICT (org_id, step) DO UPDATE SET completed=true, completed_at=NOW()`,
      [req.owner.org_id, step]
    );
    res.json({ success: true, step });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Skip step ────────────────────────────────────────────────
router.post('/skip', async (req, res) => {
  try {
    const { step } = req.body;
    if (!STEPS.includes(step)) return res.status(400).json({ error: 'Invalid step' });
    await db.query(
      `INSERT INTO onboarding_progress (org_id, step, completed, completed_at)
       VALUES ($1,$2,true,NOW())
       ON CONFLICT (org_id, step) DO UPDATE SET completed=true`,
      [req.owner.org_id, step]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
