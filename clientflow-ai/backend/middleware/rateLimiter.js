/**
 * PROMPT 104 — Rate Limiting System
 * Redis-based rate limiter applied per-user, per-org, and per-plan.
 * Provides separate limiters for API, AI requests, and campaigns.
 */

const cache = require('../services/cacheService');
const logger = require('../services/loggerService');

// Plan-based limits (requests per window)
const PLAN_LIMITS = {
  starter:    { api: 1000, ai: 100,  campaign: 10  },
  pro:        { api: 5000, ai: 500,  campaign: 50  },
  enterprise: { api: -1,   ai: -1,   campaign: -1  }, // unlimited
  default:    { api: 200,  ai: 20,   campaign: 5   }, // unauthenticated / unknown
};

const WINDOWS = {
  api:      { seconds: 60,   label: '1 minute'  },
  ai:       { seconds: 86400, label: '24 hours'  },  // daily AI quota
  campaign: { seconds: 2592000, label: '30 days' },  // monthly campaign quota
};

/**
 * Core rate limit check using Redis INCR + EXPIRE.
 * Returns { allowed, remaining, resetAt }.
 */
async function checkLimit(key, limit, windowSeconds) {
  // If Redis unavailable or limit is -1 (unlimited), allow all
  if (!cache.isConnected() || limit === -1) {
    return { allowed: true, remaining: -1, resetAt: null };
  }

  const count = await cache.incr(key, windowSeconds);
  if (count === null) {
    return { allowed: true, remaining: -1, resetAt: null };
  }

  const remaining = Math.max(0, limit - count);
  const resetAt   = new Date(Date.now() + windowSeconds * 1000).toISOString();

  return { allowed: count <= limit, remaining, resetAt };
}

/**
 * Build a rate limit middleware for a specific category.
 * @param {'api'|'ai'|'campaign'} category
 */
function createLimiter(category) {
  return async (req, res, next) => {
    const orgId  = req.owner?.org_id;
    const userId = req.owner?.user_id;
    const plan   = req.owner?.plan || 'default';

    const planLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.default;
    const limit  = planLimits[category];
    const window = WINDOWS[category];

    // Build scoped keys
    const keys = [];
    if (userId) keys.push({ k: `ratelimit:${category}:user:${userId}`,     l: Math.floor(limit / 5) });  // per-user: 1/5 of org limit
    if (orgId)  keys.push({ k: `ratelimit:${category}:org:${orgId}`,       l: limit });
    if (!orgId && !userId) {
      const ip = req.ip;
      keys.push({ k: `ratelimit:${category}:ip:${ip}`, l: PLAN_LIMITS.default[category] });
    }

    for (const { k, l } of keys) {
      const { allowed, remaining, resetAt } = await checkLimit(k, l, window.seconds);

      res.setHeader(`X-RateLimit-Limit-${category}`,     l === -1 ? 'unlimited' : l);
      res.setHeader(`X-RateLimit-Remaining-${category}`, remaining);
      if (resetAt) res.setHeader(`X-RateLimit-Reset-${category}`, resetAt);

      if (!allowed) {
        logger.warn('Rate limit exceeded', { category, key: k, plan, orgId, userId, ip: req.ip });
        return res.status(429).json({
          error:   'Rate limit exceeded',
          code:    'RATE_LIMIT_EXCEEDED',
          category,
          resetAt,
          message: `You have exceeded the ${category} limit for your plan. Resets in ${window.label}.`,
        });
      }
    }

    next();
  };
}

const apiLimiter      = createLimiter('api');
const aiLimiter       = createLimiter('ai');
const campaignLimiter = createLimiter('campaign');

/**
 * Strict login rate limiter (no auth, IP-based, prevents brute force).
 */
async function loginLimiter(req, res, next) {
  const ip  = req.ip;
  const key = `ratelimit:login:ip:${ip}`;
  const { allowed, resetAt } = await checkLimit(key, 10, 900); // 10 attempts per 15 min

  if (!allowed) {
    logger.security('brute_force_blocked', { ip });
    return res.status(429).json({
      error:   'Too many login attempts',
      code:    'LOGIN_RATE_LIMIT',
      resetAt,
      message: 'Too many failed login attempts. Please wait 15 minutes.',
    });
  }
  next();
}

module.exports = { apiLimiter, aiLimiter, campaignLimiter, loginLimiter };
