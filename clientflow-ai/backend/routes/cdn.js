const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const https   = require('https');

router.use(auth);

const CDN_NODES = {
  aws:       { url: process.env.AWS_CDN_URL   || 'https://aws.clientflow-ai.example.com',   region: 'us-east-1',      provider: 'CloudFront' },
  gcp:       { url: process.env.GCP_CDN_URL   || 'https://gcp.clientflow-ai.example.com',   region: 'us-central1',    provider: 'Cloud CDN'  },
  azure:     { url: process.env.AZURE_CDN_URL || 'https://azure.clientflow-ai.example.com', region: 'eastus',         provider: 'Azure CDN'  },
  cloudflare: { url: process.env.CF_CDN_URL   || 'https://cdn.clientflow-ai.example.com',    region: 'global',         provider: 'Cloudflare' },
};

function checkNode(name, node) {
  return new Promise((resolve) => {
    const start  = Date.now();
    const client = node.url.startsWith('https') ? https : require('http');
    const req    = client.get(`${node.url}/api/monitoring/health`, { timeout: 5000 }, (res) => {
      res.resume();
      resolve({ name, ...node, healthy: res.statusCode < 400, responseTime: Date.now() - start, statusCode: res.statusCode });
    });
    req.on('error', () => resolve({ name, ...node, healthy: false, responseTime: Date.now() - start, statusCode: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ name, ...node, healthy: false, responseTime: 5000, statusCode: 0 }); });
  });
}

// POST /api/cdn/invalidate — purge CDN cache
router.post('/invalidate', async (req, res) => {
  try {
    const { paths = ['/*'], providers = ['cloudflare', 'cloudfront'] } = req.body;
    // In production, call provider APIs; simulate here
    const results = providers.map(p => ({ provider: p, paths, status: 'queued', queuedAt: new Date().toISOString() }));
    res.json({ message: 'Cache invalidation queued', results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cdn/health — check CDN node status
router.get('/health', async (req, res) => {
  try {
    const checks = await Promise.allSettled(Object.entries(CDN_NODES).map(([name, node]) => checkNode(name, node)));
    const nodes  = checks.map(r => r.status === 'fulfilled' ? r.value : { healthy: false });
    const healthy = nodes.filter(n => n.healthy).length;
    res.json({ nodes, summary: { total: nodes.length, healthy, degraded: nodes.length - healthy }, timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cdn/regions — list active regions
router.get('/regions', async (req, res) => {
  try {
    const regions = Object.entries(CDN_NODES).map(([name, node]) => ({ name, ...node }));
    res.json(regions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
