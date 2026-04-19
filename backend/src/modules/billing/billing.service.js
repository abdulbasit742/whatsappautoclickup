const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');

async function listPlans() {
  const result = await query('SELECT * FROM plans WHERE is_active = true ORDER BY price_monthly ASC');
  return result.rows;
}

async function getSubscription(orgId) {
  const result = await query(
    `SELECT s.*, p.name as plan_name, p.price_monthly, p.price_yearly, p.features, p.limits
     FROM subscriptions s JOIN plans p ON p.id = s.plan_id
     WHERE s.org_id = $1`,
    [orgId]
  );
  return result.rows[0] || null;
}

async function subscribe(orgId, planId) {
  const planResult = await query('SELECT * FROM plans WHERE id = $1 AND is_active = true', [planId]);
  if (!planResult.rows.length) {
    const err = new Error('Plan not found');
    err.status = 404;
    throw err;
  }

  const existing = await query('SELECT id FROM subscriptions WHERE org_id = $1', [orgId]);

  let result;
  if (existing.rows.length) {
    result = await query(
      `UPDATE subscriptions SET plan_id = $1, status = 'active', current_period_start = NOW(),
       current_period_end = NOW() + INTERVAL '30 days'
       WHERE org_id = $2 RETURNING *`,
      [planId, orgId]
    );
  } else {
    result = await query(
      `INSERT INTO subscriptions (org_id, plan_id, status, current_period_start, current_period_end)
       VALUES ($1,$2,'active',NOW(),NOW() + INTERVAL '30 days') RETURNING *`,
      [orgId, planId]
    );
  }

  const plan = planResult.rows[0];
  await query('UPDATE organizations SET plan = $1 WHERE id = $2', [plan.name, orgId]);

  if (plan.price_monthly > 0) {
    await query(
      `INSERT INTO invoices (org_id, subscription_id, amount, currency, status, due_at)
       VALUES ($1,$2,$3,'USD','pending',NOW() + INTERVAL '7 days')`,
      [orgId, result.rows[0].id, plan.price_monthly]
    );
  }

  return result.rows[0];
}

async function upgrade(orgId, planId) {
  return await subscribe(orgId, planId);
}

async function listInvoices(orgId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const countResult = await query('SELECT COUNT(*) FROM invoices WHERE org_id = $1', [orgId]);
  const total = parseInt(countResult.rows[0].count);
  const result = await query(
    'SELECT * FROM invoices WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [orgId, limit, offset]
  );
  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function getUsage(orgId) {
  const [contacts, campaigns, aiRequests] = await Promise.all([
    query('SELECT COUNT(*) FROM contacts WHERE org_id = $1 AND is_deleted = false', [orgId]),
    query('SELECT COUNT(*) FROM campaigns WHERE org_id = $1', [orgId]),
    query(`SELECT SUM(request_count) as total FROM ai_usage_daily WHERE org_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`, [orgId]),
  ]);

  return {
    contacts: parseInt(contacts.rows[0].count),
    campaigns: parseInt(campaigns.rows[0].count),
    ai_requests_30d: parseInt(aiRequests.rows[0].total) || 0,
  };
}

module.exports = { listPlans, getSubscription, subscribe, upgrade, listInvoices, getUsage };
