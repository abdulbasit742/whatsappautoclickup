const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const db      = require('../db');
const os      = require('os');

router.use(auth);

async function getSystemMetrics() {
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;
  const cpus     = os.cpus();
  const loadAvg  = os.loadavg();

  const dbStart  = Date.now();
  let dbLatency  = null;
  let dbHealthy  = false;
  try {
    await db.query('SELECT 1');
    dbLatency = Date.now() - dbStart;
    dbHealthy = true;
  } catch { dbLatency = Date.now() - dbStart; }

  return {
    cpu: {
      count:   cpus.length,
      model:   cpus[0]?.model || 'unknown',
      loadAvg: { '1m': loadAvg[0].toFixed(2), '5m': loadAvg[1].toFixed(2), '15m': loadAvg[2].toFixed(2) },
      percent: Math.round((loadAvg[0] / cpus.length) * 100),
    },
    memory: {
      totalMB:   Math.round(totalMem / 1024 / 1024),
      usedMB:    Math.round(usedMem  / 1024 / 1024),
      freeMB:    Math.round(freeMem  / 1024 / 1024),
      percent:   Math.round((usedMem / totalMem) * 100),
    },
    database: {
      healthy:   dbHealthy,
      latencyMs: dbLatency,
    },
    process: {
      uptime:  Math.round(process.uptime()),
      pid:     process.pid,
      version: process.version,
      rss:     Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  };
}

// GET /api/monitoring/health — detailed health check
router.get('/health', async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    const healthy = metrics.database.healthy;
    res.status(healthy ? 200 : 503).json({
      status:   healthy ? 'healthy' : 'degraded',
      version:  process.env.npm_package_version || '1.0.0',
      ...metrics,
    });
  } catch (err) { res.status(503).json({ status: 'error', error: err.message }); }
});

// GET /api/monitoring/metrics — system metrics snapshot
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    const [msgCount, clientCount, payCount] = await Promise.all([
      db.query(`SELECT COUNT(*) AS c FROM messages WHERE created_at > NOW() - INTERVAL '1 hour'`),
      db.query(`SELECT COUNT(*) AS c FROM clients`),
      db.query(`SELECT COUNT(*) AS c FROM payments WHERE created_at > NOW() - INTERVAL '24 hours'`),
    ]);
    res.json({
      ...metrics,
      app: {
        messagesLastHour:  parseInt(msgCount.rows[0].c),
        totalClients:      parseInt(clientCount.rows[0].c),
        paymentsLast24h:   parseInt(payCount.rows[0].c),
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/monitoring/alert — receive webhook from monitoring tool
router.post('/alert', async (req, res) => {
  try {
    const { source, alertName, severity, message, metadata } = req.body;
    await db.query(
      `INSERT INTO admin_alerts (type, message, severity, metadata, created_at)
       VALUES ('monitoring',$1,$2,$3,NOW())`,
      [`[${source || 'external'}] ${alertName}: ${message}`, severity || 'warning', JSON.stringify(metadata || {})]
    ).catch(() => {});
    console.warn(`[Monitoring Alert] ${severity?.toUpperCase()}: ${alertName} — ${message}`);
    res.json({ received: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/monitoring/status — overall platform status
router.get('/status', async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    const alerts  = await db.query(
      `SELECT * FROM admin_alerts WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC LIMIT 20`
    ).catch(() => ({ rows: [] }));

    const status = metrics.database.healthy &&
                   metrics.cpu.percent < 90 &&
                   metrics.memory.percent < 90
      ? 'operational' : 'degraded';

    res.json({
      status,
      services: {
        api:      'operational',
        database: metrics.database.healthy ? 'operational' : 'degraded',
        websocket: 'operational',
      },
      recentAlerts: alerts.rows,
      metrics,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
