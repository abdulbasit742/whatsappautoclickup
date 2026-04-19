/**
 * PROMPT 113 — Session Management Routes
 * List sessions, revoke specific session, logout all devices.
 */

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const sessionService = require('../services/sessionService');
const { asyncHandler } = require('../middleware/errorHandler');

// All session routes require authentication
router.use(auth);
router.use(apiLimiter);

/** GET /api/sessions — List all active sessions for current user */
router.get('/', asyncHandler(async (req, res) => {
  const sessions = await sessionService.listSessions(req.owner.user_id);
  res.json({ sessions });
}));

/** DELETE /api/sessions/:sessionId — Revoke a specific session */
router.delete('/:sessionId', asyncHandler(async (req, res) => {
  // Users can only revoke their own sessions
  const db = require('../db/index');
  const { rows } = await db.query(
    `SELECT token_hash FROM sessions WHERE id = $1 AND user_id = $2`,
    [req.params.sessionId, req.owner.user_id]
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
  }
  await db.query(
    `UPDATE sessions SET revoked = TRUE, revoked_at = NOW() WHERE id = $1`,
    [req.params.sessionId]
  );
  res.json({ message: 'Session revoked successfully' });
}));

/** DELETE /api/sessions — Logout from ALL devices */
router.delete('/', asyncHandler(async (req, res) => {
  const count = await sessionService.revokeAllSessions(req.owner.user_id);
  res.json({ message: `Logged out from ${count} device(s) successfully` });
}));

module.exports = router;
