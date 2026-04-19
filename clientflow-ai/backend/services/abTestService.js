/**
 * PROMPT 108 — A/B Testing Engine
 * Splits traffic between variants, tracks results, and compares metrics.
 * Use for: campaigns, AI responses, UI experiments.
 */

const db = require('../db/index');
const logger = require('./loggerService');
const cache = require('./cacheService');

/**
 * Assign a client to an experiment variant (deterministic, sticky).
 * Uses modulo hashing so the same client always gets the same variant.
 *
 * @param {string} experimentId
 * @param {string} clientId
 * @param {string} orgId
 * @returns {Promise<'A'|'B'|null>}  null if experiment not running
 */
async function assignVariant(experimentId, clientId, orgId) {
  // Check cache first
  const cacheKey = `ab:${experimentId}:${clientId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached.variant;

  // Check existing DB assignment
  const existing = await db.query(
    `SELECT variant FROM ab_assignments WHERE experiment_id = $1 AND client_id = $2`,
    [experimentId, clientId]
  );
  if (existing.rows.length) {
    await cache.set(cacheKey, { variant: existing.rows[0].variant }, 3600);
    return existing.rows[0].variant;
  }

  // Load experiment
  const expResult = await db.query(
    `SELECT id, status, traffic_split FROM ab_experiments
     WHERE id = $1 AND org_id = $2 AND status = 'running'`,
    [experimentId, orgId]
  );
  if (!expResult.rows.length) return null;

  const experiment = expResult.rows[0];

  // Deterministic hash: use last 4 chars of clientId as hex -> int
  const hash = parseInt(clientId.replace(/-/g, '').slice(-4), 16);
  const variant = (hash % 100) < experiment.traffic_split ? 'A' : 'B';

  // Persist assignment
  try {
    await db.query(
      `INSERT INTO ab_assignments (experiment_id, client_id, org_id, variant)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (experiment_id, client_id) DO NOTHING`,
      [experimentId, clientId, orgId, variant]
    );
  } catch (err) {
    logger.warn('A/B assignment insert failed', { experimentId, clientId, error: err.message });
  }

  await cache.set(cacheKey, { variant }, 3600);
  return variant;
}

/**
 * Record a conversion for a given experiment + client.
 */
async function recordConversion(experimentId, clientId) {
  await db.query(
    `UPDATE ab_assignments
     SET converted = TRUE, converted_at = NOW()
     WHERE experiment_id = $1 AND client_id = $2 AND converted = FALSE`,
    [experimentId, clientId]
  );
}

/**
 * Get experiment results: impressions, conversions, conversion rate per variant.
 */
async function getResults(experimentId, orgId) {
  const { rows } = await db.query(
    `SELECT
       variant,
       COUNT(*)                                              AS impressions,
       COUNT(*) FILTER (WHERE converted = TRUE)             AS conversions,
       ROUND(
         COUNT(*) FILTER (WHERE converted = TRUE)::NUMERIC /
         NULLIF(COUNT(*), 0) * 100, 2
       )                                                     AS conversion_rate
     FROM ab_assignments
     WHERE experiment_id = $1
     GROUP BY variant
     ORDER BY variant`,
    [experimentId]
  );
  return rows;
}

/**
 * Declare a winner and complete the experiment.
 */
async function setWinner(experimentId, orgId, winner) {
  await db.query(
    `UPDATE ab_experiments
     SET status = 'completed', winner = $1, ended_at = NOW()
     WHERE id = $2 AND org_id = $3`,
    [winner, experimentId, orgId]
  );
}

/**
 * List all experiments for an org.
 */
async function listExperiments(orgId) {
  const { rows } = await db.query(
    `SELECT * FROM ab_experiments WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
  return rows;
}

module.exports = { assignVariant, recordConversion, getResults, setWinner, listExperiments };
