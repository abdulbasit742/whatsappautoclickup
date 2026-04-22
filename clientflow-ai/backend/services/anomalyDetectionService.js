/**
 * Anomaly Detection Service
 * Statistical anomaly detection using Z-score and IQR methods
 */

const db = require('../db');

function computeZScore(values, value) {
  if (values.length < 2) return 0;
  const mean   = values.reduce((s, v) => s + v, 0) / values.length;
  const stddev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  if (stddev === 0) return 0;
  return Math.abs((value - mean) / stddev);
}

function computeIQR(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1     = sorted[Math.floor(sorted.length * 0.25)];
  const q3     = sorted[Math.floor(sorted.length * 0.75)];
  const iqr    = q3 - q1;
  return { q1, q3, iqr, lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
}

const anomalyStore = [];

async function analyzeMetrics(metrics) {
  const anomalies = [];

  for (const metric of metrics) {
    const { name, value, history = [], threshold } = metric;
    if (history.length < 3) continue;

    const zScore = computeZScore(history, value);
    const iqr    = computeIQR(history);
    const isZScoreAnomaly = zScore > 2.5;
    const isIQRAnomaly    = value < iqr.lower || value > iqr.upper;
    const isThresholdAnomaly = threshold != null && value > threshold;

    if (isZScoreAnomaly || isIQRAnomaly || isThresholdAnomaly) {
      const severity = zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium';
      const anomaly  = {
        id:          `anom_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        metric:      name,
        value,
        zScore:      Math.round(zScore * 100) / 100,
        severity,
        detectedAt:  new Date().toISOString(),
        resolved:    false,
        method:      isZScoreAnomaly ? 'zscore' : isIQRAnomaly ? 'iqr' : 'threshold',
        message:     `${name} value ${value} is anomalous (Z-score: ${zScore.toFixed(2)})`,
      };
      anomalies.push(anomaly);
      anomalyStore.unshift(anomaly);
      if (anomalyStore.length > 500) anomalyStore.pop();

      await db.query(
        `INSERT INTO anomalies (id, metric_name, value, z_score, severity, method, message, detected_at, resolved)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),false)
         ON CONFLICT DO NOTHING`,
        [anomaly.id, name, value, anomaly.zScore, severity, anomaly.method, anomaly.message]
      ).catch(() => {}); // ignore if table doesn't exist yet
    }
  }

  return anomalies;
}

async function detectTrafficSpike(data) {
  const { current, history = [] } = data;
  return analyzeMetrics([{ name: 'traffic_requests_per_min', value: current, history, threshold: 1000 }]);
}

async function detectPerformanceIssue(data) {
  const { latencyMs, errorRate, cpuPercent, memPercent, latencyHistory = [], errorHistory = [] } = data;
  const metrics = [];

  if (latencyMs != null)  metrics.push({ name: 'api_latency_ms',    value: latencyMs,   history: latencyHistory, threshold: 2000 });
  if (errorRate != null)  metrics.push({ name: 'error_rate_percent', value: errorRate,   history: errorHistory,   threshold: 5 });
  if (cpuPercent != null) metrics.push({ name: 'cpu_percent',        value: cpuPercent,  history: [],             threshold: 85 });
  if (memPercent != null) metrics.push({ name: 'memory_percent',     value: memPercent,  history: [],             threshold: 90 });

  return analyzeMetrics(metrics);
}

async function alertAdmins(anomaly) {
  // In production: send email/Slack/PagerDuty alert
  console.warn(`[Anomaly Alert] ${anomaly.severity.toUpperCase()}: ${anomaly.message}`);
  await db.query(
    `INSERT INTO admin_alerts (type, message, severity, metadata, created_at)
     VALUES ('anomaly',$1,$2,$3,NOW())`,
    [anomaly.message, anomaly.severity, JSON.stringify(anomaly)]
  ).catch(() => {});
}

async function getAnomalies(filter = {}) {
  const { resolved, severity, limit = 100 } = filter;
  let q = `SELECT * FROM anomalies WHERE 1=1`;
  const params = [];
  if (resolved != null) { params.push(resolved === 'true'); q += ` AND resolved=$${params.length}`; }
  if (severity)         { params.push(severity);            q += ` AND severity=$${params.length}`; }
  params.push(parseInt(limit)); q += ` ORDER BY detected_at DESC LIMIT $${params.length}`;

  try {
    const r = await db.query(q, params);
    return r.rows;
  } catch {
    // Fallback to in-memory store if table doesn't exist
    return anomalyStore.slice(0, parseInt(limit));
  }
}

async function resolveAnomaly(id) {
  await db.query(`UPDATE anomalies SET resolved=true, resolved_at=NOW() WHERE id=$1`, [id]).catch(() => {});
  const idx = anomalyStore.findIndex(a => a.id === id);
  if (idx !== -1) anomalyStore[idx].resolved = true;
  return { id, resolved: true };
}

async function getCurrentMetricsSnapshot() {
  const [msgRes, payRes, clientRes] = await Promise.all([
    db.query(`SELECT COUNT(*) AS count FROM messages WHERE created_at > NOW() - INTERVAL '1 hour'`),
    db.query(`SELECT COUNT(*) AS count FROM payments WHERE created_at > NOW() - INTERVAL '24 hours'`),
    db.query(`SELECT COUNT(*) AS count FROM clients WHERE created_at > NOW() - INTERVAL '24 hours'`),
  ]);

  return {
    messagesLastHour:      parseInt(msgRes.rows[0].count),
    paymentsLast24h:       parseInt(payRes.rows[0].count),
    newClientsLast24h:     parseInt(clientRes.rows[0].count),
    timestamp:             new Date().toISOString(),
  };
}

module.exports = { analyzeMetrics, detectTrafficSpike, detectPerformanceIssue, alertAdmins, getAnomalies, resolveAnomaly, getCurrentMetricsSnapshot };
