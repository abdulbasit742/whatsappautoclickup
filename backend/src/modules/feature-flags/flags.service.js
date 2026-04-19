const { query } = require('../../config/database');

async function listFlags(orgId) {
  const result = await query(
    'SELECT * FROM feature_flags WHERE org_id = $1 OR org_id IS NULL ORDER BY flag_key',
    [orgId]
  );
  return result.rows;
}

async function createFlag(orgId, { flag_key, is_enabled, rollout_percentage, metadata }) {
  if (!flag_key) {
    const err = new Error('flag_key is required');
    err.status = 400;
    throw err;
  }
  const result = await query(
    `INSERT INTO feature_flags (org_id, flag_key, is_enabled, rollout_percentage, metadata)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [orgId, flag_key, is_enabled !== undefined ? is_enabled : false,
     rollout_percentage !== undefined ? rollout_percentage : 100,
     JSON.stringify(metadata || {})]
  );
  return result.rows[0];
}

async function updateFlag(orgId, flagKey, updates) {
  const allowed = ['is_enabled', 'rollout_percentage', 'metadata'];
  const fields = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(key === 'metadata' ? JSON.stringify(updates[key]) : updates[key]);
      idx++;
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  fields.push('updated_at = NOW()');
  params.push(flagKey, orgId);

  const result = await query(
    `UPDATE feature_flags SET ${fields.join(', ')} WHERE flag_key = $${idx} AND org_id = $${idx + 1} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Flag not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function deleteFlag(orgId, flagKey) {
  const result = await query(
    'DELETE FROM feature_flags WHERE flag_key = $1 AND org_id = $2 RETURNING id',
    [flagKey, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Flag not found');
    err.status = 404;
    throw err;
  }
}

module.exports = { listFlags, createFlag, updateFlag, deleteFlag };
