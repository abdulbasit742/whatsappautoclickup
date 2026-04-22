const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');
const { triggerEngagement, scheduleEngagementCampaign, getEngagementScore } = require('../services/engagementService');

router.use(auth);

// GET /api/engagement/score/:clientId
router.get('/score/:clientId', async (req, res) => {
  try {
    const result = await getEngagementScore(req.params.clientId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/engagement/trigger
router.post('/trigger', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });
    const result = await triggerEngagement(clientId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/engagement/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM engagement_campaigns ORDER BY created_at DESC LIMIT 50`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/engagement/campaigns
router.post('/campaigns', async (req, res) => {
  try {
    const { segment, name } = req.body;
    const result = await scheduleEngagementCampaign(segment, name);
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/engagement/triggers — recent trigger history
router.get('/triggers', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT et.*, c.name, c.whatsapp_number
       FROM engagement_triggers et
       JOIN clients c ON c.id = et.client_id
       ORDER BY et.fired_at DESC LIMIT 100`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
