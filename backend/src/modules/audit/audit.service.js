const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');

async function listAuditLogs(orgId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const params = [orgId];
  const conditions = ['al.org_id = $1'];

  if (queryParams.user_id) {
    params.push(queryParams.user_id);
    conditions.push(`al.user_id = $${params.length}`);
  }
  if (queryParams.action) {
    params.push(`%${queryParams.action}%`);
    conditions.push(`al.action ILIKE $${params.length}`);
  }
  if (queryParams.resource_type) {
    params.push(queryParams.resource_type);
    conditions.push(`al.resource_type = $${params.length}`);
  }
  if (queryParams.from) {
    params.push(queryParams.from);
    conditions.push(`al.created_at >= $${params.length}`);
  }
  if (queryParams.to) {
    params.push(queryParams.to);
    conditions.push(`al.created_at <= $${params.length}`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const countResult = await query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT al.*, u.name as user_name, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function log(orgId, userId, action, resourceType, resourceId, metadata, ipAddress) {
  try {
    await query(
      `INSERT INTO audit_logs (org_id, user_id, action, resource_type, resource_id, metadata, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [orgId, userId || null, action, resourceType || null, resourceId || null,
       JSON.stringify(metadata || {}), ipAddress || null]
    );
  } catch {
    // Non-critical
  }
}

module.exports = { listAuditLogs, log };
