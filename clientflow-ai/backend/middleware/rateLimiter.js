/**
 * Rate Limiter Middleware
 * In-memory store with per-user, per-org, per-IP limits
 */

const PLAN_LIMITS = {
  free:       { user: 30,   org: 300,  ip: 60 },
  starter:    { user: 60,   org: 600,  ip: 120 },
  pro:        { user: 100,  org: 1000, ip: 200 },
  enterprise: { user: 500,  org: 5000, ip: 1000 },
};

const store = new Map();

function getKey(type, id) {
  return `${type}:${id}`;
}

function getWindow(windowMs = 60000) {
  return Math.floor(Date.now() / windowMs);
}

function checkLimit(key, limit, windowMs = 60000) {
  const window = getWindow(windowMs);
  const entry  = store.get(key);

  if (!entry || entry.window !== window) {
    store.set(key, { count: 1, window });
    return { allowed: true, remaining: limit - 1, reset: (window + 1) * windowMs };
  }

  entry.count++;
  store.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);
  return {
    allowed:   entry.count <= limit,
    remaining,
    reset:     (window + 1) * windowMs,
    count:     entry.count,
    limit,
  };
}

function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// Violation log (last 1000 entries)
const violations = [];
const MAX_VIOLATIONS = 1000;

function logViolation(type, id, endpoint, req) {
  violations.unshift({
    type, id, endpoint,
    ip:        getClientIp(req),
    method:    req.method,
    path:      req.path,
    timestamp: new Date().toISOString(),
  });
  if (violations.length > MAX_VIOLATIONS) violations.pop();
}

const rateLimiter = (req, res, next) => {
  const ip     = getClientIp(req);
  const userId = req.owner?.id || 'anonymous';
  const orgId  = req.owner?.org_id || 'default';
  const plan   = req.owner?.plan || 'pro';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.pro;

  const ipCheck   = checkLimit(getKey('ip', ip), limits.ip);
  const userCheck = userId !== 'anonymous' ? checkLimit(getKey('user', userId), limits.user) : null;
  const orgCheck  = checkLimit(getKey('org', orgId), limits.org);

  res.setHeader('X-RateLimit-Limit-IP',   limits.ip);
  res.setHeader('X-RateLimit-Remaining',  ipCheck.remaining);
  res.setHeader('X-RateLimit-Reset',      Math.ceil(ipCheck.reset / 1000));

  if (!ipCheck.allowed) {
    logViolation('ip', ip, req.path, req);
    return res.status(429).json({ error: 'Too many requests from this IP', retryAfter: Math.ceil((ipCheck.reset - Date.now()) / 1000) });
  }

  if (userCheck && !userCheck.allowed) {
    logViolation('user', userId, req.path, req);
    return res.status(429).json({ error: 'User rate limit exceeded', retryAfter: Math.ceil((userCheck.reset - Date.now()) / 1000) });
  }

  if (!orgCheck.allowed) {
    logViolation('org', orgId, req.path, req);
    return res.status(429).json({ error: 'Organization rate limit exceeded', retryAfter: Math.ceil((orgCheck.reset - Date.now()) / 1000) });
  }

  next();
};

function dynamicRateLimiter(plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.pro;
  return (req, res, next) => {
    const ip    = getClientIp(req);
    const check = checkLimit(getKey('plan_ip', ip), limits.ip);
    if (!check.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded', plan, limit: limits.ip });
    }
    next();
  };
}

function getViolations(limit = 100) {
  return violations.slice(0, limit);
}

function getCurrentUsage(userId, orgId, ip) {
  const window = getWindow();
  const plan   = 'pro';
  const limits = PLAN_LIMITS[plan];

  const getCount = key => {
    const entry = store.get(key);
    return (entry && entry.window === window) ? entry.count : 0;
  };

  return {
    user: { used: getCount(getKey('user', userId)), limit: limits.user },
    org:  { used: getCount(getKey('org',  orgId)),  limit: limits.org },
    ip:   { used: getCount(getKey('ip',   ip)),     limit: limits.ip },
  };
}

module.exports = { rateLimiter, dynamicRateLimiter, getViolations, getCurrentUsage, PLAN_LIMITS };
