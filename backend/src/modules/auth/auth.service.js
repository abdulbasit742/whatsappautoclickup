const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');
const { hashToken } = require('../../shared/utils/crypto');
const config = require('../../config');

function generateAccessToken(userId, orgId, role) {
  return jwt.sign({ userId, orgId, role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function generateRefreshToken() {
  return uuidv4() + '-' + uuidv4();
}

async function register({ orgName, orgSlug, email, password, name }) {
  if (!orgName || !email || !password || !name) {
    const err = new Error('orgName, email, password and name are required');
    err.status = 400;
    throw err;
  }

  const slug = (orgSlug || orgName).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const existingOrg = await query('SELECT id FROM organizations WHERE slug = $1', [slug]);
  if (existingOrg.rows.length) {
    const err = new Error('Organization slug already taken');
    err.status = 409;
    throw err;
  }

  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length) {
    const err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const orgResult = await query(
    'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name, slug, plan',
    [orgName, slug]
  );
  const org = orgResult.rows[0];

  const userResult = await query(
    `INSERT INTO users (org_id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, 'admin')
     RETURNING id, org_id, email, name, role`,
    [org.id, email, passwordHash, name]
  );
  const user = userResult.rows[0];

  await query(
    `INSERT INTO lead_stages (org_id, name, order_index, color, is_default) VALUES
     ($1,'New Lead',0,'#6366f1',true),
     ($1,'Contacted',1,'#3b82f6',false),
     ($1,'Qualified',2,'#f59e0b',false),
     ($1,'Won',3,'#10b981',false),
     ($1,'Lost',4,'#ef4444',false)`,
    [org.id]
  );

  const accessToken = generateAccessToken(user.id, org.id, user.role);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  return { accessToken, refreshToken, user: { ...user, org } };
}

async function login({ email, password }, ip) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  const result = await query(
    `SELECT u.id, u.org_id, u.email, u.password_hash, u.name, u.role, u.is_active,
            o.name as org_name, o.slug as org_slug, o.plan as org_plan
     FROM users u JOIN organizations o ON o.id = u.org_id
     WHERE u.email = $1 AND o.deleted_at IS NULL`,
    [email]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const accessToken = generateAccessToken(user.id, user.org_id, user.role);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  const { password_hash: _, ...safeUser } = user;
  return {
    accessToken,
    refreshToken,
    user: safeUser,
  };
}

async function refreshToken(token) {
  if (!token) {
    const err = new Error('Refresh token required');
    err.status = 400;
    throw err;
  }

  const tokenHash = hashToken(token);
  const result = await query(
    `SELECT rt.*, u.org_id, u.role, u.is_active
     FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
    [tokenHash]
  );

  if (!result.rows.length) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    throw err;
  }

  const stored = result.rows[0];
  if (!stored.is_active) {
    const err = new Error('User account is inactive');
    err.status = 401;
    throw err;
  }

  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);

  const newAccessToken = generateAccessToken(stored.user_id, stored.org_id, stored.role);
  const newRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [stored.user_id, newHash, expiresAt]
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async function logout(token, userId) {
  if (token) {
    const tokenHash = hashToken(token);
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  } else {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  }
}

async function forgotPassword(email) {
  // Stub: In production, generate a signed reset token and email it
  // We do not reveal whether the email exists
  return;
}

async function resetPassword(token, newPassword) {
  // Stub: In production, verify the signed token and update password
  if (!token || !newPassword) {
    const err = new Error('Token and new password are required');
    err.status = 400;
    throw err;
  }
  return;
}

async function getMe(userId) {
  const result = await query(
    `SELECT u.id, u.org_id, u.email, u.name, u.avatar_url, u.role, u.is_active, u.last_login_at, u.created_at,
            o.name as org_name, o.slug as org_slug, o.plan as org_plan, o.settings as org_settings
     FROM users u JOIN organizations o ON o.id = u.org_id
     WHERE u.id = $1`,
    [userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

module.exports = { register, login, refreshToken, logout, forgotPassword, resetPassword, getMe };
