/**
 * PROMPT 103 — Caching System (Redis)
 * Caches dashboard stats, contact lists, AI responses, and analytics.
 * Features: TTL, cache invalidation, fallback to DB on cache miss.
 */

const { createClient } = require('redis');
const logger = require('./loggerService');

let client = null;
let connected = false;

async function connect() {
  if (connected) return;
  try {
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (err) => logger.error('Redis error', { error: err.message }));
    client.on('connect', () => { connected = true; logger.info('Redis connected'); });
    client.on('end', () => { connected = false; });
    await client.connect();
  } catch (err) {
    logger.warn('Redis unavailable — cache disabled', { error: err.message });
    client = null;
  }
}

// TTL constants (seconds)
const TTL = {
  DASHBOARD_STATS:   60,        // 1 minute  — fast-changing
  CONTACT_LIST:      120,       // 2 minutes
  ANALYTICS:         300,       // 5 minutes
  AI_RESPONSE:       3600,      // 1 hour    — semantic cache
  PLAN_CONFIG:       86400,     // 1 day
  WHITELABEL:        86400,     // 1 day
};

/**
 * Build a namespaced cache key.
 * Pattern: clientflow:{orgId}:{namespace}:{suffix}
 */
function key(orgId, namespace, suffix = '') {
  return `clientflow:${orgId}:${namespace}${suffix ? ':' + suffix : ''}`;
}

/**
 * Get a value from cache.
 * Returns parsed JSON or null on miss / Redis unavailable.
 */
async function get(cacheKey) {
  if (!client) return null;
  try {
    const raw = await client.get(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    logger.warn('Cache get error', { key: cacheKey, error: err.message });
    return null;
  }
}

/**
 * Set a value in cache with TTL.
 */
async function set(cacheKey, value, ttlSeconds) {
  if (!client) return;
  try {
    await client.setEx(cacheKey, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn('Cache set error', { key: cacheKey, error: err.message });
  }
}

/**
 * Delete one or more cache keys.
 */
async function del(...keys) {
  if (!client) return;
  try {
    await client.del(keys);
  } catch (err) {
    logger.warn('Cache del error', { keys, error: err.message });
  }
}

/**
 * Invalidate all cache keys for a given org + namespace pattern.
 */
async function invalidateOrg(orgId, namespace) {
  if (!client) return;
  try {
    const pattern = `clientflow:${orgId}:${namespace}*`;
    const keys = await client.keys(pattern);
    if (keys.length) await client.del(keys);
  } catch (err) {
    logger.warn('Cache invalidate error', { orgId, namespace, error: err.message });
  }
}

/**
 * Cache-aside helper.
 * Attempts cache get; on miss, executes fetchFn and caches result.
 * @param {string} cacheKey
 * @param {number} ttlSeconds
 * @param {Function} fetchFn  async function that returns fresh data
 */
async function getOrFetch(cacheKey, ttlSeconds, fetchFn) {
  const cached = await get(cacheKey);
  if (cached !== null) return cached;
  const fresh = await fetchFn();
  if (fresh !== undefined && fresh !== null) {
    await set(cacheKey, fresh, ttlSeconds);
  }
  return fresh;
}

/** Increment a counter in Redis (for rate limiting, usage tracking) */
async function incr(cacheKey, ttlSeconds) {
  if (!client) return null;
  try {
    const count = await client.incr(cacheKey);
    if (count === 1) await client.expire(cacheKey, ttlSeconds);
    return count;
  } catch (err) {
    logger.warn('Cache incr error', { key: cacheKey, error: err.message });
    return null;
  }
}

/** Check if Redis is alive */
function isConnected() {
  return connected && client !== null;
}

module.exports = { connect, get, set, del, invalidateOrg, getOrFetch, incr, key, TTL, isConnected };
