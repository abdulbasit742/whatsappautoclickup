const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getKey, markRateLimited, listKeys, addKey, deactivateKey } = require('../modules/apikeys/apiKeyManager');

router.use(auth);

// GET /api/apikeys?service=groq — list all keys (values masked)
router.get('/', async (req, res, next) => {
  try {
    const keys = await listKeys(req.query.service || null);
    // Mask the actual key values in the response
    const masked = keys.map((k) => ({
      ...k,
      key_value: `${k.key_value.slice(0, 6)}${'*'.repeat(Math.max(0, k.key_value.length - 10))}${k.key_value.slice(-4)}`,
    }));
    res.json(masked);
  } catch (err) { next(err); }
});

// POST /api/apikeys — add a new key
// Body: { service, key_value, label? }
router.post('/', async (req, res, next) => {
  try {
    const { service, key_value, label } = req.body;
    if (!service || !key_value) {
      return res.status(400).json({ error: '"service" and "key_value" are required' });
    }
    const VALID_SERVICES = ['groq', 'openai', 'claude', 'gemini', 'whatsapp'];
    if (!VALID_SERVICES.includes(service)) {
      return res.status(400).json({ error: `service must be one of: ${VALID_SERVICES.join(', ')}` });
    }
    const key = await addKey(service, key_value, label);
    res.status(201).json(key);
  } catch (err) { next(err); }
});

// DELETE /api/apikeys/:id — deactivate a key
router.delete('/:id', async (req, res, next) => {
  try {
    await deactivateKey(req.params.id);
    res.json({ message: 'API key deactivated' });
  } catch (err) {
    if (err.message === 'API key not found') return res.status(404).json({ error: err.message });
    next(err);
  }
});

// GET /api/apikeys/health — check which providers have a valid key configured
router.get('/health', async (req, res, next) => {
  try {
    const services = ['groq', 'openai', 'claude', 'gemini'];
    const results = {};
    for (const s of services) {
      const k = await getKey(s);
      results[s] = k ? 'configured' : 'missing';
    }
    res.json(results);
  } catch (err) { next(err); }
});

// POST /api/apikeys/:id/reset-limit — clear rate limit on a key
router.post('/:id/reset-limit', async (req, res, next) => {
  try {
    const db = require('../db');
    await db.query(
      `UPDATE api_keys SET rate_limited_until = NULL WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Rate limit cleared' });
  } catch (err) { next(err); }
});

module.exports = router;
