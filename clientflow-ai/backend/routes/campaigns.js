const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { createCampaign, distribute, runABTest, getChannelStats, listCampaigns } = require('../services/multiChannelService');

router.use(auth);

// POST /api/campaigns — create campaign
router.post('/', async (req, res) => {
  try {
    const campaign = await createCampaign(req.body);
    res.status(201).json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/campaigns — list campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await listCampaigns();
    res.json(campaigns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/campaigns/:id/launch — launch campaign
router.post('/:id/launch', async (req, res) => {
  try {
    const result = await distribute(req.params.id);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/campaigns/:id/stats — campaign stats
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await getChannelStats(req.params.id);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/campaigns/:id/ab-test — A/B test
router.post('/:id/ab-test', async (req, res) => {
  try {
    const { variants } = req.body;
    if (!variants?.length) return res.status(400).json({ error: 'variants array required' });
    const result = await runABTest(req.params.id, variants);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
