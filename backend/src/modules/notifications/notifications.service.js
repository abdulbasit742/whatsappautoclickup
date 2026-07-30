const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');

async function listNotifications(orgId, userId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const params = [orgId, userId];
  const conditions = ['org_id = $1', 'user_id = $2'];

  if (queryParams.is_read !== undefined) {
    params.push(queryParams.is_read === 'true');
    conditions.push(`is_read = $${params.length}`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const countResult = await query(`SELECT COUNT(*) FROM notifications ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const unreadCount = await query(
    'SELECT COUNT(*) FROM notifications WHERE org_id = $1 AND user_id = $2 AND is_read = false',
    [orgId, userId]
  );

  return {
    data: result.rows,
    meta: { ...paginationMeta(total, page, limit), unread_count: parseInt(unreadCount.rows[0].count) },
  };
}

async function markRead(orgId, notificationId, userId) {
  await query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND org_id = $2 AND user_id = $3',
    [notificationId, orgId, userId]
  );
}

async function markAllRead(orgId, userId) {
  await query(
    'UPDATE notifications SET is_read = true WHERE org_id = $1 AND user_id = $2 AND is_read = false',
    [orgId, userId]
  );
}

async function createNotification(orgId, userId, type, title, message, metadata) {
  try {
    const result = await query(
      `INSERT INTO notifications (org_id, user_id, type, title, message, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [orgId, userId, type, title, message || null, JSON.stringify(metadata || {})]
    );
    return result.rows[0];
  } catch {
    return null;
  }
}

module.exports = { listNotifications, markRead, markAllRead, createNotification };
