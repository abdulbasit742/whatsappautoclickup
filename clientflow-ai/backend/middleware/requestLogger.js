/**
 * PROMPT 106 — Request Logger Middleware
 * Logs all API requests with structured data and optionally persists to DB.
 */

const logger = require('../services/loggerService');
const db = require('../db/index');

const SKIP_PATHS = ['/health', '/favicon.ico'];

module.exports = function requestLogger(req, res, next) {
  if (SKIP_PATHS.includes(req.path)) return next();

  const startAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startAt;

    logger.request(req, res, durationMs);

    // Async persist to api_logs table (fire and forget, non-blocking)
    const orgId  = req.owner?.org_id || null;
    const userId = req.owner?.user_id || null;

    // Only log errors and slow requests to DB (avoid noise)
    if (res.statusCode >= 400 || durationMs > 2000) {
      db.query(
        `INSERT INTO api_logs (org_id, user_id, method, path, status_code, duration_ms, ip_address, user_agent, error)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orgId, userId,
          req.method, req.path,
          res.statusCode, durationMs,
          req.ip, req.get('User-Agent'),
          res.statusCode >= 400 ? (req._errorMessage || null) : null,
        ]
      ).catch(() => {}); // never throw from logging
    }
  });

  next();
};
