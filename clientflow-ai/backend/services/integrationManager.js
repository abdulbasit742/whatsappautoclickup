const db = require('../db');
const { encrypt, decrypt, mask } = require('./encryption');
const metaProvider = require('./providers/meta');
const instagramProvider = require('./providers/instagram');

const PROVIDERS = {
  meta: metaProvider,
  instagram: instagramProvider,
};

// ─── Integration Record ──────────────────────────────────────────────────────────

async function getIntegration(providerName) {
  const r = await db.query(
    'SELECT * FROM integrations WHERE provider_name = $1',
    [providerName]
  );
  return r.rows[0] || null;
}

async function upsertIntegration(providerName, data) {
  await db.query(
    `INSERT INTO integrations (provider_name, status, connected_at, last_sync_at, last_error, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (provider_name) DO UPDATE SET
       status=$2, connected_at=$3, last_sync_at=$4, last_error=$5, updated_at=NOW()`,
    [providerName, data.status, data.connected_at || null, data.last_sync_at || null, data.last_error || null]
  );
}

// ─── API Key Management ──────────────────────────────────────────────────────────

async function saveKey(providerName, keyName, value, { expiresAt = null, createdBy = null } = {}) {
  const encryptedValue = encrypt(value);
  // Sanitize createdBy to prevent injection — keep only printable ASCII, max 150 chars
  const safeCreatedBy = createdBy
    ? String(createdBy).replace(/[^\x20-\x7E]/g, '').slice(0, 150)
    : null;
  await db.query(
    `INSERT INTO api_keys (provider_name, key_name, encrypted_value, expires_at, created_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (provider_name, key_name) DO UPDATE SET
       encrypted_value=$3, expires_at=$4, created_by=$5, updated_at=NOW()`,
    [providerName, keyName, encryptedValue, expiresAt, safeCreatedBy]
  );
}

/**
 * Return masked keys for frontend display — never exposes full secret values.
 */
async function getMaskedKeys(providerName) {
  const r = await db.query(
    'SELECT key_name, encrypted_value, last_used_at, expires_at FROM api_keys WHERE provider_name = $1',
    [providerName]
  );
  return r.rows.map(row => ({
    key_name: row.key_name,
    masked_value: mask(decrypt(row.encrypted_value)),
    last_used_at: row.last_used_at,
    expires_at: row.expires_at,
  }));
}

/**
 * Return decrypted keys — for internal use only (test connection, token refresh etc.).
 */
async function getDecryptedKeys(providerName) {
  const r = await db.query(
    'SELECT key_name, encrypted_value FROM api_keys WHERE provider_name = $1',
    [providerName]
  );
  const result = {};
  for (const row of r.rows) {
    result[row.key_name] = decrypt(row.encrypted_value);
  }
  return result;
}

async function markKeyUsed(providerName, keyName) {
  await db.query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE provider_name = $1 AND key_name = $2',
    [providerName, keyName]
  );
}

// ─── Logging ─────────────────────────────────────────────────────────────────────

async function logEvent(providerName, eventType, status, message) {
  await db.query(
    `INSERT INTO integration_logs (provider_name, event_type, status, message, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [providerName, eventType, status, message]
  );
}

async function getLogs(providerName, limit = 50) {
  const r = await db.query(
    'SELECT * FROM integration_logs WHERE provider_name = $1 ORDER BY created_at DESC LIMIT $2',
    [providerName, limit]
  );
  return r.rows;
}

// ─── Provider Actions ────────────────────────────────────────────────────────────

async function testConnection(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) throw new Error(`Unknown provider: ${providerName}`);

  const keys = await getDecryptedKeys(providerName);
  const result = await provider.testConnection(keys);

  await db.query(
    'UPDATE integrations SET last_sync_at = NOW(), last_error = NULL, updated_at = NOW() WHERE provider_name = $1',
    [providerName]
  );
  await logEvent(providerName, 'test_connection', 'success', JSON.stringify(result.data));

  return result;
}

async function connectProvider(providerName) {
  const result = await testConnection(providerName);

  await upsertIntegration(providerName, {
    status: 'connected',
    connected_at: new Date(),
    last_sync_at: new Date(),
    last_error: null,
  });
  await logEvent(providerName, 'connect', 'success', 'Connected successfully');

  return result;
}

async function disconnectProvider(providerName) {
  await db.query(
    `UPDATE integrations SET status = 'disconnected', last_error = NULL, updated_at = NOW()
     WHERE provider_name = $1`,
    [providerName]
  );
  await logEvent(providerName, 'disconnect', 'success', 'Integration disconnected');
}

/**
 * Exchange Instagram short-lived token → long-lived token and persist it.
 */
async function exchangeInstagramToken(createdBy) {
  const keys = await getDecryptedKeys('instagram');
  const result = await instagramProvider.exchangeForLongLivedToken(keys);

  // Persist the new long-lived token with expiry
  const expiresAt = result.expires_in
    ? new Date(Date.now() + result.expires_in * 1000)
    : null;

  await saveKey('instagram', 'INSTAGRAM_ACCESS_TOKEN', result.access_token, { expiresAt, createdBy });
  await logEvent('instagram', 'token_exchange', 'success', 'Short-lived token exchanged for long-lived token');

  return result;
}

/**
 * Refresh an existing Instagram long-lived token to extend its validity.
 */
async function refreshInstagramToken(createdBy) {
  const keys = await getDecryptedKeys('instagram');
  const longLivedToken = keys['INSTAGRAM_ACCESS_TOKEN'];

  const result = await instagramProvider.refreshLongLivedToken(longLivedToken);

  const expiresAt = result.expires_in
    ? new Date(Date.now() + result.expires_in * 1000)
    : null;

  await saveKey('instagram', 'INSTAGRAM_ACCESS_TOKEN', result.access_token, { expiresAt, createdBy });
  await logEvent('instagram', 'token_refresh', 'success', 'Long-lived token refreshed');

  return result;
}

// ─── OAuth Session Helpers ───────────────────────────────────────────────────────

async function createOAuthSession(providerName, state, redirectUri) {
  await db.query(
    `INSERT INTO oauth_sessions (provider_name, state, redirect_uri)
     VALUES ($1, $2, $3)`,
    [providerName, state, redirectUri]
  );
}

async function getOAuthSession(state) {
  const r = await db.query(
    `SELECT * FROM oauth_sessions WHERE state = $1 AND expires_at > NOW()`,
    [state]
  );
  return r.rows[0] || null;
}

async function deleteOAuthSession(state) {
  await db.query('DELETE FROM oauth_sessions WHERE state = $1', [state]);
}

module.exports = {
  getIntegration,
  upsertIntegration,
  saveKey,
  getMaskedKeys,
  getDecryptedKeys,
  markKeyUsed,
  logEvent,
  getLogs,
  testConnection,
  connectProvider,
  disconnectProvider,
  exchangeInstagramToken,
  refreshInstagramToken,
  createOAuthSession,
  getOAuthSession,
  deleteOAuthSession,
};
