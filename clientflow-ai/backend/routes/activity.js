const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { recordActivity, getActivityStream, getEngagementMetrics, aggregatePageViews, addSSEClient } = require('../services/activityService');

router.use(auth);

// POST /api/activity — record activity
router.post('/', async (req, res) => {
  try {
    const userId   = req.owner?.id;
    const { action, metadata = {} } = req.body;
    if (!action) return res.status(400).json({ error: 'action required' });

    metadata.ip        = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
    metadata.userAgent = req.headers['user-agent'];

    const activity = await recordActivity(userId, action, metadata);
    res.status(201).json(activity);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activity — activity stream (paginated)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action } = req.query;
    const activities = await getActivityStream({ page: parseInt(page), limit: parseInt(limit), userId, action });
    res.json(activities);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activity/metrics — aggregated metrics
router.get('/metrics', async (req, res) => {
  try {
    const { userId } = req.query;
    const metrics = await getEngagementMetrics(userId || null);
    const hourly  = await aggregatePageViews();
    res.json({ ...metrics, hourlyPageViews: hourly });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activity/live — SSE endpoint for live activity stream
router.get('/live', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 30000);
  const remove    = addSSEClient(res);

  req.on('close', () => {
    clearInterval(keepAlive);
    remove();
  });
});

module.exports = router;
