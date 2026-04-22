const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { identifyChurnedClients, createWinbackCampaign, trackWinbackSuccess, listWinbackCampaigns } = require('../services/winbackService');

router.use(auth);

// GET /api/winback/churned — list churned clients
router.get('/churned', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const clients = await identifyChurnedClients(parseInt(days));
    res.json(clients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/winback/campaign — create winback campaign
router.post('/campaign', async (req, res) => {
  try {
    const { clientIds, offer, name } = req.body;
    if (!clientIds?.length) return res.status(400).json({ error: 'clientIds required' });
    const result = await createWinbackCampaign(clientIds, offer, name);
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/winback/campaigns — list campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await listWinbackCampaigns();
    res.json(campaigns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/winback/stats/:campaignId — campaign performance
router.get('/stats/:campaignId', async (req, res) => {
  try {
    const stats = await trackWinbackSuccess(req.params.campaignId);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
