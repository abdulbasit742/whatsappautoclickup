const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { analyzeMetrics, getAnomalies, resolveAnomaly, getCurrentMetricsSnapshot } = require('../services/anomalyDetectionService');

router.use(auth);

// GET /api/anomalies — list detected anomalies
router.get('/', async (req, res) => {
  try {
    const anomalies = await getAnomalies(req.query);
    res.json(anomalies);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/anomalies/analyze — run analysis on provided metrics
router.post('/analyze', async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!Array.isArray(metrics)) return res.status(400).json({ error: 'metrics array required' });
    const anomalies = await analyzeMetrics(metrics);
    res.json({ anomalies, count: anomalies.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/anomalies/metrics — current metrics snapshot
router.get('/metrics', async (req, res) => {
  try {
    const snapshot = await getCurrentMetricsSnapshot();
    res.json(snapshot);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/anomalies/:id/resolve — mark anomaly resolved
router.put('/:id/resolve', async (req, res) => {
  try {
    const result = await resolveAnomaly(req.params.id);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
