/**
 * PROMPT 106 — Logging System
 * Structured logging service with log levels, context, and searchable output.
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function formatLog(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'clientflow-ai',
    env: process.env.NODE_ENV || 'development',
    ...meta,
  };
  return JSON.stringify(entry);
}

function log(level, message, meta) {
  if (LOG_LEVELS[level] <= currentLevel) {
    const output = formatLog(level, message, meta);
    if (level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }
}

const logger = {
  error: (msg, meta)  => log('error', msg, meta),
  warn:  (msg, meta)  => log('warn',  msg, meta),
  info:  (msg, meta)  => log('info',  msg, meta),
  http:  (msg, meta)  => log('http',  msg, meta),
  debug: (msg, meta)  => log('debug', msg, meta),

  /** Log an API request */
  request: (req, res, durationMs) => log('http', 'API Request', {
    method:      req.method,
    path:        req.path,
    status:      res.statusCode,
    duration_ms: durationMs,
    ip:          req.ip,
    org_id:      req.owner?.org_id,
    user_id:     req.owner?.user_id,
    user_agent:  req.get('User-Agent'),
  }),

  /** Log an AI call */
  ai: (provider, tokens, latencyMs, success, orgId, error) => log('info', 'AI Call', {
    category:   'ai_call',
    provider,
    tokens,
    latency_ms: latencyMs,
    success,
    org_id:     orgId,
    error:      error || null,
  }),

  /** Log a campaign/broadcast run */
  campaign: (broadcastId, orgId, sent, failed) => log('info', 'Campaign Run', {
    category:     'campaign',
    broadcast_id: broadcastId,
    org_id:       orgId,
    sent,
    failed,
  }),

  /** Log security events */
  security: (event, details) => log('warn', 'Security Event', {
    category: 'security',
    event,
    ...details,
  }),
};

module.exports = logger;
