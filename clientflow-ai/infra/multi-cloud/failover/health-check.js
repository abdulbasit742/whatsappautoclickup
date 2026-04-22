/**
 * Multi-cloud health check + auto-failover logic.
 * Periodically checks all 3 cloud endpoints and routes traffic to the healthy one.
 */

const https = require('https');
const http  = require('http');

const CLOUD_ENDPOINTS = {
  aws:   process.env.AWS_HEALTH_URL   || 'http://aws-alb.clientflow-ai.example.com/api/monitoring/health',
  gcp:   process.env.GCP_HEALTH_URL   || 'https://clientflow-ai-backend-xyz.run.app/api/monitoring/health',
  azure: process.env.AZURE_HEALTH_URL || 'https://clientflow-ai-backend.azurewebsites.net/api/monitoring/health',
};

const CHECK_INTERVAL_MS = 30_000; // 30 seconds
const REQUEST_TIMEOUT_MS = 5_000;

let cloudStatus = {
  aws:   { healthy: true,  lastChecked: null, responseTime: null, consecutiveFailures: 0 },
  gcp:   { healthy: true,  lastChecked: null, responseTime: null, consecutiveFailures: 0 },
  azure: { healthy: true,  lastChecked: null, responseTime: null, consecutiveFailures: 0 },
};

const PRIORITY_ORDER = ['aws', 'gcp', 'azure'];
const FAILURE_THRESHOLD = 3;

function checkEndpoint(cloud, url) {
  return new Promise((resolve) => {
    const start  = Date.now();
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
      const responseTime = Date.now() - start;
      const healthy = res.statusCode >= 200 && res.statusCode < 400;
      res.resume();
      resolve({ cloud, healthy, responseTime, statusCode: res.statusCode });
    });

    req.on('error', () => resolve({ cloud, healthy: false, responseTime: Date.now() - start, statusCode: 0 }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ cloud, healthy: false, responseTime: REQUEST_TIMEOUT_MS, statusCode: 0 });
    });
  });
}

async function runHealthChecks() {
  const checks = await Promise.allSettled(
    Object.entries(CLOUD_ENDPOINTS).map(([cloud, url]) => checkEndpoint(cloud, url))
  );

  for (const result of checks) {
    if (result.status !== 'fulfilled') continue;
    const { cloud, healthy, responseTime, statusCode } = result.value;
    const prev = cloudStatus[cloud];

    if (!healthy) {
      cloudStatus[cloud].consecutiveFailures = (prev.consecutiveFailures || 0) + 1;
    } else {
      cloudStatus[cloud].consecutiveFailures = 0;
    }

    const degraded = cloudStatus[cloud].consecutiveFailures >= FAILURE_THRESHOLD;
    cloudStatus[cloud] = {
      healthy:             !degraded,
      lastChecked:         new Date().toISOString(),
      responseTime,
      statusCode,
      consecutiveFailures: cloudStatus[cloud].consecutiveFailures,
    };

    if (degraded && prev.healthy) {
      console.warn(`[Failover] Cloud ${cloud.toUpperCase()} marked UNHEALTHY after ${FAILURE_THRESHOLD} failures`);
      triggerFailover(cloud);
    } else if (!degraded && !prev.healthy) {
      console.info(`[Failover] Cloud ${cloud.toUpperCase()} recovered — marking HEALTHY`);
    }
  }
}

function triggerFailover(failedCloud) {
  const next = getActiveCloud();
  console.info(`[Failover] Switching traffic from ${failedCloud} → ${next || 'NO HEALTHY CLOUD AVAILABLE'}`);
  // Emit event for external routing layer (DNS, proxy, etc.)
  if (process.env.FAILOVER_WEBHOOK_URL) {
    const payload = JSON.stringify({ failedCloud, activeCloud: next, timestamp: new Date().toISOString() });
    const url = new URL(process.env.FAILOVER_WEBHOOK_URL);
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    });
    req.write(payload);
    req.end();
  }
}

function getActiveCloud() {
  return PRIORITY_ORDER.find(cloud => cloudStatus[cloud]?.healthy) || null;
}

function getCloudStatus() {
  return {
    status:      cloudStatus,
    activeCloud: getActiveCloud(),
    timestamp:   new Date().toISOString(),
  };
}

function startHealthCheckLoop() {
  console.info('[HealthCheck] Starting multi-cloud health monitor');
  runHealthChecks();
  return setInterval(runHealthChecks, CHECK_INTERVAL_MS);
}

module.exports = { startHealthCheckLoop, getCloudStatus, getActiveCloud, runHealthChecks };
