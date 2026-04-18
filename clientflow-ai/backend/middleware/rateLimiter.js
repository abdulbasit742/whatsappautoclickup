const rateLimit = require('express-rate-limit');

// ─── Login: 5 attempts per 15 minutes per IP ────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ─── General API: 120 requests per 15 minutes per IP ────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// ─── Webhook: higher limit (Meta sends many delivery receipts) ───────────────
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.WEBHOOK_RATE_LIMIT || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Webhook rate limit exceeded.' },
});

// ─── Broadcast send: 10 sends per hour per IP ────────────────────────────────
const broadcastLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.BROADCAST_RATE_LIMIT || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Broadcast rate limit reached. Please wait before sending again.' },
});

module.exports = { loginLimiter, apiLimiter, webhookLimiter, broadcastLimiter };
