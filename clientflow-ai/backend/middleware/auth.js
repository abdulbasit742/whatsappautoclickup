/**
 * PROMPT 101 — Multi-Tenant Auth Middleware
 * Verifies JWT, validates session (PROMPT 113), and enforces org context.
 * Sets req.owner = { user_id, org_id, email, role }
 */

const jwt = require('jsonwebtoken');
const sessionService = require('../services/sessionService');
const logger = require('../services/loggerService');

module.exports = async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Multi-tenant token: validate session is not revoked
    if (decoded.user_id && decoded.org_id) {
      const session = await sessionService.validateSession(token);
      if (!session) {
        return res.status(401).json({ error: 'Session expired or revoked', code: 'SESSION_INVALID' });
      }
      req.owner = {
        user_id:    decoded.user_id,
        org_id:     decoded.org_id,
        email:      decoded.email,
        role:       decoded.role,
        session_id: session.id,
      };
    } else {
      // Legacy single-owner token compatibility
      req.owner = { email: decoded.email, role: decoded.role || 'owner' };
    }

    next();
  } catch (err) {
    logger.security('invalid_jwt', { ip: req.ip, error: err.message });
    return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
};
