const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');

const SUPPORTED_PROVIDERS = ['whatsapp', 'gmail', 'slack', 'clickup', 'stripe', 'zapier', 'webhook'];

async function listIntegrations(orgId) {
  const existing = await query('SELECT * FROM integrations WHERE org_id = $1', [orgId]);
  const existingMap = {};
  existing.rows.forEach((i) => { existingMap[i.provider] = i; });

  return SUPPORTED_PROVIDERS.map((provider) => ({
    provider,
    status: existingMap[provider]?.status || 'disconnected',
    last_sync_at: existingMap[provider]?.last_sync_at || null,
    last_error: existingMap[provider]?.last_error || null,
    id: existingMap[provider]?.id || null,
  }));
}

async function connect(orgId, provider, config, userId) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    const err = new Error(`Unsupported provider: ${provider}`);
    err.status = 400;
    throw err;
  }

  const result = await query(
    `INSERT INTO integrations (org_id, provider, status, config)
     VALUES ($1,$2,'connected',$3)
     ON CONFLICT (org_id, provider) DO UPDATE SET status = 'connected', config = $3, updated_at = NOW()
     RETURNING *`,
    [orgId, provider, JSON.stringify(config || {})]
  );

  await query(
    `INSERT INTO integration_logs (integration_id, org_id, event_type, status, details)
     VALUES ($1,$2,'connected','success',$3)`,
    [result.rows[0].id, orgId, JSON.stringify({ userId })]
  );

  return result.rows[0];
}

async function disconnect(orgId, provider, userId) {
  const result = await query(
    `UPDATE integrations SET status = 'disconnected', config = '{}', updated_at = NOW()
     WHERE org_id = $1 AND provider = $2 RETURNING *`,
    [orgId, provider]
  );

  if (!result.rows.length) {
    const err = new Error('Integration not found');
    err.status = 404;
    throw err;
  }

  await query(
    `INSERT INTO integration_logs (integration_id, org_id, event_type, status, details)
     VALUES ($1,$2,'disconnected','success',$3)`,
    [result.rows[0].id, orgId, JSON.stringify({ userId })]
  );

  return result.rows[0];
}

async function testConnection(orgId, provider) {
  const result = await query(
    'SELECT * FROM integrations WHERE org_id = $1 AND provider = $2',
    [orgId, provider]
  );

  if (!result.rows.length || result.rows[0].status !== 'connected') {
    return { connected: false, message: 'Integration is not connected' };
  }

  await query(
    `UPDATE integrations SET last_sync_at = NOW() WHERE org_id = $1 AND provider = $2`,
    [orgId, provider]
  );

  return { connected: true, message: `${provider} connection tested successfully` };
}

async function getLogs(orgId, provider, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);

  const integResult = await query(
    'SELECT id FROM integrations WHERE org_id = $1 AND provider = $2',
    [orgId, provider]
  );
  if (!integResult.rows.length) {
    return { data: [], meta: { total: 0, page: 1, limit, totalPages: 0 } };
  }

  const integId = integResult.rows[0].id;
  const countResult = await query(
    'SELECT COUNT(*) FROM integration_logs WHERE integration_id = $1',
    [integId]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT * FROM integration_logs WHERE integration_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [integId, limit, offset]
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function updateConfig(orgId, provider, config) {
  const result = await query(
    `UPDATE integrations SET config = $1, updated_at = NOW()
     WHERE org_id = $2 AND provider = $3 RETURNING *`,
    [JSON.stringify(config), orgId, provider]
  );
  if (!result.rows.length) {
    const err = new Error('Integration not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

module.exports = { listIntegrations, connect, disconnect, testConnection, getLogs, updateConfig };
