const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');

async function getOrg(orgId) {
  const result = await query(
    'SELECT id, name, slug, plan, settings, created_at FROM organizations WHERE id = $1 AND deleted_at IS NULL',
    [orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Organization not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function updateOrg(orgId, updates) {
  const allowed = ['name', 'settings'];
  const fields = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(key === 'settings' ? JSON.stringify(updates[key]) : updates[key]);
      idx++;
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  fields.push('updated_at = NOW()');
  params.push(orgId);

  const result = await query(
    `UPDATE organizations SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL
     RETURNING id, name, slug, plan, settings, created_at`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Organization not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function listOrgs(queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const countResult = await query('SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL');
  const total = parseInt(countResult.rows[0].count);
  const result = await query(
    'SELECT id, name, slug, plan, created_at FROM organizations WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function assignPlan(orgId, plan) {
  const validPlans = ['free', 'starter', 'pro', 'enterprise'];
  if (!validPlans.includes(plan)) {
    const err = new Error(`Invalid plan. Must be one of: ${validPlans.join(', ')}`);
    err.status = 400;
    throw err;
  }
  const result = await query(
    `UPDATE organizations SET plan = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL
     RETURNING id, name, slug, plan`,
    [plan, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Organization not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

module.exports = { getOrg, updateOrg, listOrgs, assignPlan };
