const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { getProviderHealth } = require('../services/aiService');

router.use(auth);

// GET /api/health — system health overview
router.get('/', async (req, res) => {
  try {
    const [dbCheck, msgCount, queueCount, alertCount] = await Promise.all([
      db.query(`SELECT 1 AS ok`),
      db.query(`SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '1 hour'`),
      db.query(`SELECT COUNT(*) FROM follow_ups WHERE status='pending' AND scheduled_at <= NOW()`),
      db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`),
    ]);

    const aiHealth = getProviderHealth();

    res.json({
      database: { status: 'ok', latency_ms: null },
      api: { status: 'ok', uptime_seconds: Math.floor(process.uptime()) },
      queue: {
        status: parseInt(queueCount.rows[0].count) > 100 ? 'warning' : 'ok',
        pending_followups: parseInt(queueCount.rows[0].count),
      },
      messages_last_hour: parseInt(msgCount.rows[0].count),
      unresolved_alerts: parseInt(alertCount.rows[0].count),
      ai_providers: Object.entries(aiHealth).map(([name, h]) => ({
        name,
        available: h.available,
        last_error: h.lastError,
      })),
      memory: {
        used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      checked_at: new Date(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/health/ai — AI provider details
router.get('/ai', async (req, res) => {
  try {
    const health = getProviderHealth();
    const stats = (await db.query(
      `SELECT provider, COUNT(*) AS calls, COUNT(*) FILTER(WHERE success=false) AS failures,
         AVG(latency_ms)::INT AS avg_latency
       FROM ai_logs WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY provider`
    )).rows;
    res.json({ health, stats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
