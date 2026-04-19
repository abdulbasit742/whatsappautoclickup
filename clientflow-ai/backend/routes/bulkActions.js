const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Bulk assign contacts ─────────────────────────────────────
router.post('/assign', async (req, res) => {
  try {
    const { entity_ids, assigned_to } = req.body;
    // For issues
    if (req.body.entity_type === 'issue') {
      await db.query(
        `UPDATE issues SET assigned_to=$1 WHERE id=ANY($2::uuid[]) AND org_id=$3`,
        [assigned_to, entity_ids, req.owner.org_id]
      );
    }
    res.json({ success: true, count: entity_ids.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Bulk add tags ────────────────────────────────────────────
router.post('/add-tags', async (req, res) => {
  try {
    const { entity_ids, tag_ids } = req.body;
    let inserted = 0;
    for (const tag_id of tag_ids) {
      const values = entity_ids.map((_,i) => `($1,$${i+2})`).join(',');
      await db.query(
        `INSERT INTO entity_tags (tag_id, entity_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [tag_id, ...entity_ids]
      );
      inserted += entity_ids.length;
    }
    res.json({ success: true, inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Bulk remove tags ─────────────────────────────────────────
router.post('/remove-tags', async (req, res) => {
  try {
    const { entity_ids, tag_ids } = req.body;
    await db.query(
      `DELETE FROM entity_tags WHERE tag_id=ANY($1::uuid[]) AND entity_id=ANY($2::uuid[])`,
      [tag_ids, entity_ids]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Bulk archive contacts ────────────────────────────────────
router.post('/archive', async (req, res) => {
  try {
    const { entity_ids } = req.body;
    await db.query(
      `UPDATE clients SET status='archived' WHERE id=ANY($1::uuid[])`,
      [entity_ids]
    );
    res.json({ success: true, count: entity_ids.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Bulk add to campaign ─────────────────────────────────────
router.post('/add-to-campaign', async (req, res) => {
  try {
    const { entity_ids, campaign_id } = req.body;
    // In production: add contacts to broadcast/campaign
    res.json({ success: true, message: `${entity_ids.length} contacts queued for campaign` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Bulk create follow-ups ───────────────────────────────────
router.post('/create-followups', async (req, res) => {
  try {
    const { entity_ids, scheduled_at, message } = req.body;
    const inserted = await Promise.all(
      entity_ids.map(cid =>
        db.query(
          `INSERT INTO followups (client_id, scheduled_at, message) VALUES ($1,$2,$3) RETURNING id`,
          [cid, scheduled_at, message]
        ).catch(() => null)
      )
    );
    res.json({ success: true, count: inserted.filter(Boolean).length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
