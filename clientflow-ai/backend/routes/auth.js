/**
 * PROMPT 101 — Multi-Tenant Auth Routes
 * PROMPT 113 — Session Management
 * Supports per-org login, multi-user, and session tracking.
 */

const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const router  = express.Router();
const db      = require('../db/index');
const sessionService  = require('../services/sessionService');
const { loginLimiter } = require('../middleware/rateLimiter');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const logger = require('../services/loggerService');

const JWT_EXPIRES = '7d';
const JWT_EXPIRES_SEC = 7 * 24 * 60 * 60;

/**
 * POST /api/auth/login
 * Multi-tenant login: requires email + password + orgSlug.
 * Falls back to single-owner env-var mode if orgSlug is omitted.
 */
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password, orgSlug } = req.body;
  if (!email || !password) throw new ValidationError('email and password are required');

  let token, responsePayload;

  // ── Multi-tenant mode ─────────────────────────────────────────────────────
  if (orgSlug) {
    const orgResult = await db.query(
      `SELECT o.id as org_id, o.plan_id, p.name as plan_name
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.slug = $1 AND o.is_active = TRUE`,
      [orgSlug]
    );
    if (!orgResult.rows.length) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
    const org = orgResult.rows[0];

    const userResult = await db.query(
      `SELECT id, email, password_hash, name, role, is_active
       FROM users WHERE org_id = $1 AND email = $2`,
      [org.org_id, email]
    );
    if (!userResult.rows.length) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account disabled', code: 'ACCOUNT_DISABLED' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Update last login
    db.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]).catch(() => {});

    token = jwt.sign(
      { user_id: user.id, org_id: org.org_id, email: user.email, role: user.role, plan: org.plan_name },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // Track session
    await sessionService.createSession(user.id, org.org_id, token, {
      deviceName: req.get('User-Agent')?.slice(0, 100) || 'Unknown',
      ipAddress:  req.ip,
      userAgent:  req.get('User-Agent'),
    }, JWT_EXPIRES_SEC);

    logger.info('User logged in', { userId: user.id, orgId: org.org_id, email: user.email });

    responsePayload = { token, email: user.email, name: user.name, role: user.role, org_id: org.org_id };

  } else {
    // ── Legacy single-owner fallback ──────────────────────────────────────
    if (email !== process.env.OWNER_EMAIL || password !== process.env.OWNER_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
    token = jwt.sign({ email, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES });
    responsePayload = { token, email, role: 'owner' };
  }

  res.json(responsePayload);
}));

/**
 * POST /api/auth/register-org
 * Create a new organization + owner user.
 */
router.post('/register-org', loginLimiter, asyncHandler(async (req, res) => {
  const { orgName, orgSlug, email, password, name } = req.body;
  if (!orgName || !orgSlug || !email || !password) {
    throw new ValidationError('orgName, orgSlug, email, and password are required');
  }
  if (!/^[a-z0-9-]+$/.test(orgSlug)) {
    throw new ValidationError('orgSlug must be lowercase alphanumeric with hyphens only');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Get starter plan
    const planResult = await client.query(`SELECT id FROM plans WHERE name = 'starter'`);
    const planId = planResult.rows[0]?.id || null;

    const orgResult = await client.query(
      `INSERT INTO organizations (name, slug, plan_id) VALUES ($1, $2, $3) RETURNING id`,
      [orgName, orgSlug, planId]
    );
    const orgId = orgResult.rows[0].id;

    const userResult = await client.query(
      `INSERT INTO users (org_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, 'owner') RETURNING id, email, name, role`,
      [orgId, email, passwordHash, name || email.split('@')[0]]
    );

    await client.query('COMMIT');
    logger.info('New org registered', { orgId, orgSlug, email });
    res.status(201).json({ message: 'Organization created', org_id: orgId, user: userResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

/**
 * GET /api/auth/me — Get current user info from token
 */
router.get('/me', asyncHandler(async (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'No token' });
  const decoded = jwt.verify(auth, process.env.JWT_SECRET);
  res.json(decoded);
}));

/**
 * POST /api/auth/logout — Revoke current session
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) await sessionService.revokeSession(token);
  res.json({ message: 'Logged out successfully' });
}));

module.exports = router;
