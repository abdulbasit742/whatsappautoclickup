// Simple in-memory rate limiter — no external dependencies
// Production: use express-rate-limit or nginx rate limiting

const rateLimitMap = new Map();

function createRateLimiter(maxRequests = 100, windowMs = 60 * 1000) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }
    record.count += 1;
    rateLimitMap.set(key, record);
    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }
    next();
  };
}

module.exports = { createRateLimiter };
