const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { recordTouchpoint, getJourneyMap, identifyStage, getEngagementOpportunities, getAllOpportunities } = require('../services/journeyService');

router.use(auth);

// GET /api/journey/:clientId — full journey map
router.get('/:clientId', async (req, res) => {
  try {
    const journey = await getJourneyMap(req.params.clientId);
    res.json(journey);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/journey/touchpoint — record a touchpoint
router.post('/touchpoint', async (req, res) => {
  try {
    const { clientId, type, description, metadata } = req.body;
    if (!clientId || !type) return res.status(400).json({ error: 'clientId and type required' });
    const tp = await recordTouchpoint(clientId, { type, description, metadata });
    res.status(201).json(tp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/journey/stage/:clientId — current stage
router.get('/stage/:clientId', async (req, res) => {
  try {
    const stage = await identifyStage(req.params.clientId);
    res.json(stage);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/journey/opportunities — all opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const opps = await getAllOpportunities();
    res.json(opps);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/journey/client/:clientId/opportunities — for a specific client
router.get('/client/:clientId/opportunities', async (req, res) => {
  try {
    const opps = await getEngagementOpportunities(req.params.clientId);
    res.json(opps);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
