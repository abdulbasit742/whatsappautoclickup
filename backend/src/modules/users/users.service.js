const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');

async function listUsers(orgId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const search = queryParams.search ? `%${queryParams.search}%` : null;

  let whereClause = 'WHERE org_id = $1';
  const params = [orgId];

  if (search) {
    params.push(search);
    whereClause += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
  }

  const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT id, org_id, email, name, avatar_url, role, is_active, last_login_at, created_at
     FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function inviteUser(orgId, { email, name, role = 'agent', password }, invitedBy) {
  if (!email || !name) {
    const err = new Error('email and name are required');
    err.status = 400;
    throw err;
  }

  const existing = await query('SELECT id FROM users WHERE org_id = $1 AND email = $2', [orgId, email]);
  if (existing.rows.length) {
    const err = new Error('Email already exists in this organization');
    err.status = 409;
    throw err;
  }

  const tempPassword = password || crypto.randomBytes(10).toString('hex') + 'A1!';
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const result = await query(
    `INSERT INTO users (org_id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, org_id, email, name, role, is_active, created_at`,
    [orgId, email, passwordHash, name, role]
  );

  return result.rows[0];
}

async function getUser(orgId, userId) {
  const result = await query(
    `SELECT id, org_id, email, name, avatar_url, role, is_active, last_login_at, created_at
     FROM users WHERE id = $1 AND org_id = $2`,
    [userId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function updateUser(orgId, userId, updates, requestingUser) {
  if (requestingUser.id !== userId && requestingUser.role !== 'admin' && requestingUser.role !== 'super_admin') {
    const err = new Error('You can only update your own profile');
    err.status = 403;
    throw err;
  }

  const allowed = ['name', 'avatar_url'];
  const fields = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(updates[key]);
      idx++;
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  fields.push(`updated_at = NOW()`);
  params.push(userId, orgId);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${idx} AND org_id = $${idx + 1}
     RETURNING id, org_id, email, name, avatar_url, role, is_active`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function deleteUser(orgId, userId, requestingUserId) {
  if (userId === requestingUserId) {
    const err = new Error('Cannot deactivate yourself');
    err.status = 400;
    throw err;
  }
  const result = await query(
    `UPDATE users SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND org_id = $2 RETURNING id`,
    [userId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
}

async function changeRole(orgId, userId, role) {
  const validRoles = ['admin', 'manager', 'agent', 'viewer'];
  if (!validRoles.includes(role)) {
    const err = new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    err.status = 400;
    throw err;
  }
  const result = await query(
    `UPDATE users SET role = $1, updated_at = NOW()
     WHERE id = $2 AND org_id = $3
     RETURNING id, email, name, role`,
    [role, userId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function suspendUser(orgId, userId, requestingUserId) {
  if (userId === requestingUserId) {
    const err = new Error('Cannot suspend yourself');
    err.status = 400;
    throw err;
  }
  const result = await query(
    `UPDATE users SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND org_id = $2
     RETURNING id, email, name, is_active`,
    [userId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

module.exports = { listUsers, inviteUser, getUser, updateUser, deleteUser, changeRole, suspendUser };
