const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ─── Middleware to log API usage ──────────────────────────────
function apiUsageLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - start;
    db.query(
      `INSERT INTO api_usage_logs (org_id, route, method, status_code, latency_ms, is_error, is_auth_fail)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        req.owner?.org_id || null,
        req.route?.path || req.path,
        req.method,
        res.statusCode,
        latency,
        res.statusCode >= 500,
        res.statusCode === 401,
      ]
    ).catch(() => {});
  });
  next();
}

const router2 = express.Router();
router2.use(auth);

// ─── API usage stats ──────────────────────────────────────────
router2.get('/stats', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT route, method,
              COUNT(*) AS total_requests,
              ROUND(AVG(latency_ms)) AS avg_latency_ms,
              SUM(CASE WHEN is_error THEN 1 ELSE 0 END) AS error_count,
              SUM(CASE WHEN is_auth_fail THEN 1 ELSE 0 END) AS auth_fail_count,
              MAX(created_at) AS last_seen
       FROM api_usage_logs WHERE org_id=$1 AND created_at > NOW() - INTERVAL '24 hours'
       GROUP BY route, method ORDER BY total_requests DESC LIMIT 50`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Recent errors ────────────────────────────────────────────
router2.get('/errors', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM api_usage_logs WHERE org_id=$1 AND is_error=true
       ORDER BY created_at DESC LIMIT 50`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router2;
module.exports.apiUsageLogger = apiUsageLogger;
