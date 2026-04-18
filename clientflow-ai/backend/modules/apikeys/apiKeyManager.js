const db = require('../../db');

// ─── In-memory cache (avoids hitting DB on every AI call) ────────────────────
const cache = {
  data: {},       // { [service]: [ { id, key_value, usage_count, rate_limited_until } ] }
  loadedAt: null,
  TTL: 5 * 60 * 1000, // 5 minutes
};

// ─── Load keys from DB ───────────────────────────────────────────────────────
async function loadKeys() {
  const now = Date.now();
  if (cache.loadedAt && now - cache.loadedAt < cache.TTL) {
    return cache.data;
  }
  try {
    const res = await db.query(
      `SELECT id, service, key_value, usage_count, rate_limited_until
       FROM api_keys
       WHERE is_active = true
       ORDER BY usage_count ASC`
    );
    const grouped = {};
    for (const row of res.rows) {
      if (!grouped[row.service]) grouped[row.service] = [];
      grouped[row.service].push(row);
    }
    cache.data = grouped;
    cache.loadedAt = now;
    return grouped;
  } catch {
    // Return stale data on DB error rather than crashing
    return cache.data;
  }
}

// ─── Env-variable fallback map ───────────────────────────────────────────────
function getEnvKey(service) {
  const envMap = {
    groq:     process.env.GROQ_API_KEY,
    openai:   process.env.OPENAI_API_KEY,
    claude:   process.env.ANTHROPIC_API_KEY,
    gemini:   process.env.GEMINI_API_KEY,
    whatsapp: process.env.WHATSAPP_TOKEN,
  };
  return envMap[service] || null;
}

// ─── Public: Get the best available key for a service ────────────────────────
// Returns { keyValue, keyId, fromDb } or null if no key is available.
async function getKey(service) {
  const keys = await loadKeys();
  const serviceKeys = keys[service] || [];
  const now = new Date();

  const available = serviceKeys.filter(
    (k) => !k.rate_limited_until || new Date(k.rate_limited_until) < now
  );

  if (available.length > 0) {
    const key = available[0]; // sorted by usage_count ASC — pick least-used
    // Increment usage counter asynchronously
    db.query(
      `UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1`,
      [key.id]
    ).catch(() => {});
    return { keyValue: key.key_value, keyId: key.id, fromDb: true };
  }

  // Fall back to environment variable
  const envKey = getEnvKey(service);
  if (envKey) return { keyValue: envKey, keyId: null, fromDb: false };

  return null;
}

// ─── Public: Mark a key as rate-limited ──────────────────────────────────────
async function markRateLimited(keyId, durationMs = 10 * 60 * 1000) {
  if (!keyId) return;
  const until = new Date(Date.now() + durationMs);
  await db.query(
    `UPDATE api_keys SET rate_limited_until = $1 WHERE id = $2`,
    [until, keyId]
  ).catch(() => {});
  cache.loadedAt = null; // Invalidate cache so next call reloads fresh data
}

// ─── Public: List all keys (admin use) ───────────────────────────────────────
async function listKeys(service) {
  const params = service ? [service] : [];
  const where  = service ? 'WHERE service = $1' : '';
  const res = await db.query(
    `SELECT id, service, label, is_active, usage_count, last_used_at,
            rate_limited_until, created_at
     FROM api_keys ${where}
     ORDER BY service, usage_count`,
    params
  );
  return res.rows;
}

// ─── Public: Add a new key ────────────────────────────────────────────────────
async function addKey(service, keyValue, label) {
  const res = await db.query(
    `INSERT INTO api_keys (service, key_value, label)
     VALUES ($1, $2, $3)
     RETURNING id, service, label, is_active, usage_count, created_at`,
    [service, keyValue, label || null]
  );
  cache.loadedAt = null; // Invalidate cache
  return res.rows[0];
}

// ─── Public: Soft-delete (deactivate) a key ──────────────────────────────────
async function deactivateKey(id) {
  const res = await db.query(
    `UPDATE api_keys SET is_active = false WHERE id = $1 RETURNING id`,
    [id]
  );
  if (!res.rows.length) throw new Error('API key not found');
  cache.loadedAt = null;
}

module.exports = { getKey, markRateLimited, listKeys, addKey, deactivateKey };
