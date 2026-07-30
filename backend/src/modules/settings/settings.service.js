const { query } = require('../../config/database');
const { encrypt, decrypt } = require('../../shared/utils/crypto');
const registry = require('../ai/providers/index');

async function getSettings(orgId) {
  const result = await query(
    'SELECT settings FROM organizations WHERE id = $1',
    [orgId]
  );
  return result.rows[0]?.settings || {};
}

async function updateSettings(orgId, settings) {
  const result = await query(
    `UPDATE organizations SET settings = $1, updated_at = NOW() WHERE id = $2 RETURNING settings`,
    [JSON.stringify(settings), orgId]
  );
  return result.rows[0]?.settings || {};
}

async function listApiKeys(orgId) {
  const result = await query(
    `SELECT id, org_id, provider, is_active, last_used_at, created_at FROM api_keys WHERE org_id = $1`,
    [orgId]
  );
  return result.rows.map((key) => ({
    ...key,
    encrypted_key: '****' + key.id.slice(-4),
  }));
}

async function saveApiKey(orgId, { provider, apiKey }, userId) {
  if (!provider || !apiKey) {
    const err = new Error('provider and apiKey are required');
    err.status = 400;
    throw err;
  }

  const encryptedKey = encrypt(apiKey);

  const result = await query(
    `INSERT INTO api_keys (org_id, provider, encrypted_key, is_active)
     VALUES ($1,$2,$3,true)
     ON CONFLICT (org_id, provider) DO UPDATE SET encrypted_key = $3, is_active = true
     RETURNING id, org_id, provider, is_active, created_at`,
    [orgId, provider, encryptedKey]
  );

  const aiProviders = ['groq', 'openai', 'claude', 'gemini'];
  if (aiProviders.includes(provider)) {
    registry.reinitialize(provider, apiKey);
  }

  return result.rows[0];
}

async function deleteApiKey(orgId, keyId) {
  const result = await query(
    'DELETE FROM api_keys WHERE id = $1 AND org_id = $2 RETURNING id',
    [keyId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('API key not found');
    err.status = 404;
    throw err;
  }
}

async function testApiKey(orgId, keyId) {
  const result = await query(
    'SELECT provider, encrypted_key FROM api_keys WHERE id = $1 AND org_id = $2',
    [keyId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('API key not found');
    err.status = 404;
    throw err;
  }

  const { provider, encrypted_key } = result.rows[0];
  let decrypted;
  try {
    decrypted = decrypt(encrypted_key);
  } catch {
    return { success: false, message: 'Could not decrypt key' };
  }

  const aiProviders = ['groq', 'openai', 'claude', 'gemini'];
  if (aiProviders.includes(provider)) {
    try {
      registry.reinitialize(provider, decrypted);
      const p = registry.getProvider(provider);
      await p.complete('Say "ok" in one word', { maxTokens: 5 });
      await query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyId]);
      return { success: true, message: `${provider} API key is valid` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  return { success: true, message: `${provider} key saved (test not available for this provider)` };
}

module.exports = { getSettings, updateSettings, listApiKeys, saveApiKey, deleteApiKey, testApiKey };
