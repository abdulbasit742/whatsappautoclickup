/**
 * PROMPT 113 — Session Management System
 * Multiple sessions, logout from all devices, session expiry, session tracking.
 */

const crypto = require('crypto');
const db = require('../db/index');
const logger = require('./loggerService');

/**
 * Create a new session record.
 * Called after successful login.
 *
 * @param {string} userId
 * @param {string} orgId
 * @param {string} jwtToken      Raw JWT string (will be hashed before storage)
 * @param {Object} deviceInfo    { deviceName, ipAddress, userAgent }
 * @param {number} expiresInSec  Token TTL in seconds
 * @returns {Promise<string>}    session id
 */
async function createSession(userId, orgId, jwtToken, deviceInfo = {}, expiresInSec = 604800) {
  const tokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInSec * 1000);

  const { rows } = await db.query(
    `INSERT INTO sessions (user_id, org_id, token_hash, device_name, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, orgId, tokenHash,
     deviceInfo.deviceName || 'Unknown Device',
     deviceInfo.ipAddress  || null,
     deviceInfo.userAgent  || null,
     expiresAt]
  );
  return rows[0].id;
}

/**
 * Validate a session token.
 * Returns session data if valid, null if revoked/expired.
 */
async function validateSession(jwtToken) {
  const tokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');
  const { rows } = await db.query(
    `SELECT s.*, u.email, u.role, u.name as user_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked = FALSE
       AND s.expires_at > NOW()`,
    [tokenHash]
  );
  if (!rows.length) return null;

  // Update last_active_at asynchronously
  db.query(`UPDATE sessions SET last_active_at = NOW() WHERE token_hash = $1`, [tokenHash]).catch(() => {});
  return rows[0];
}

/**
 * Revoke a specific session (logout from one device).
 */
async function revokeSession(jwtToken) {
  const tokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');
  await db.query(
    `UPDATE sessions SET revoked = TRUE, revoked_at = NOW() WHERE token_hash = $1`,
    [tokenHash]
  );
  logger.info('Session revoked', { tokenHash: tokenHash.slice(0, 8) + '...' });
}

/**
 * Revoke all sessions for a user (logout from all devices).
 */
async function revokeAllSessions(userId) {
  const { rowCount } = await db.query(
    `UPDATE sessions SET revoked = TRUE, revoked_at = NOW()
     WHERE user_id = $1 AND revoked = FALSE`,
    [userId]
  );
  logger.info('All sessions revoked', { userId, count: rowCount });
  return rowCount;
}

/**
 * List all active sessions for a user.
 */
async function listSessions(userId) {
  const { rows } = await db.query(
    `SELECT id, device_name, ip_address, last_active_at, expires_at, created_at
     FROM sessions
     WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()
     ORDER BY last_active_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Purge expired sessions older than 30 days (run via cron).
 */
async function purgeExpiredSessions() {
  const { rowCount } = await db.query(
    `DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '30 days'`
  );
  logger.info('Expired sessions purged', { count: rowCount });
}

module.exports = { createSession, validateSession, revokeSession, revokeAllSessions, listSessions, purgeExpiredSessions };
