require('dotenv').config();

// ─── Startup Environment Validation ─────────────────────────────────────────────
const REQUIRED_ENV = [
  'DATABASE_URL', 'JWT_SECRET', 'OWNER_EMAIL', 'OWNER_PASSWORD',
  'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'WHATSAPP_VERIFY_TOKEN',
  'ANTHROPIC_API_KEY', 'FRONTEND_URL',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[Startup] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// ─── Global Error Handlers ───────────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UnhandledRejection]', reason?.stack || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err.stack || err.message);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

app.set('io', io);

// ─── Simple in-memory rate limiter ───────────────────────────────────────────────
const rateLimitStore = new Map();

function rateLimit({ windowMs = 60000, max = 100, keyFn = (req) => req.ip } = {}) {
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count++;
    rateLimitStore.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
    next();
  };
}

// Clean up rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

// ─── Middleware ──────────────────────────────────────────────────────────────────
// FRONTEND_URL is required at startup (validated above); no wildcard fallback
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static('uploads'));

// Rate limiting: strict for auth, moderate for API
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const apiLimiter  = rateLimit({ windowMs: 60 * 1000, max: 200 });
const webhookLimiter = rateLimit({ windowMs: 1000, max: 50 }); // WhatsApp can burst

// ─── Secure file upload ──────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
});

app.post('/api/upload',
  apiLimiter,
  (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    next();
  },
  upload.single('file'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  }
);

// ─── Health Check ────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ─── Routes ─────────────────────────────────────────────────────────────────────
const webhookRouter     = require('./routes/webhook');
const authRouter        = require('./routes/auth');
const clientRouter      = require('./routes/clients');
const paymentRouter     = require('./routes/payments');
const serviceRouter     = require('./routes/services');
const alertRouter       = require('./routes/alerts');
const reviewRouter      = require('./routes/reviews');
const broadcastRouter   = require('./routes/broadcasts');
const templateRouter    = require('./routes/templates');
const appointmentRouter = require('./routes/appointments');
const referralRouter    = require('./routes/referrals');
const analyticsRouter   = require('./routes/analytics');
const settingsRouter    = require('./routes/settings');
const followupRouter    = require('./routes/followups');
const aiRouter          = require('./routes/ai');

app.use('/webhook',          webhookLimiter, webhookRouter);
app.use('/api/auth',         authLimiter, authRouter);
app.use('/api/clients',      apiLimiter, clientRouter);
app.use('/api/payments',     apiLimiter, paymentRouter);
app.use('/api/services',     apiLimiter, serviceRouter);
app.use('/api/alerts',       apiLimiter, alertRouter);
app.use('/api/reviews',      apiLimiter, reviewRouter);
app.use('/api/broadcasts',   apiLimiter, broadcastRouter);
app.use('/api/templates',    apiLimiter, templateRouter);
app.use('/api/appointments', apiLimiter, appointmentRouter);
app.use('/api/referrals',    apiLimiter, referralRouter);
app.use('/api/analytics',    apiLimiter, analyticsRouter);
app.use('/api/settings',     apiLimiter, settingsRouter);
app.use('/api/followups',    apiLimiter, followupRouter);
app.use('/api/ai',           apiLimiter, aiRouter);

// ─── Socket.io ───────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  socket.on('disconnect', () => console.log('[Socket] Client disconnected:', socket.id));
});

// ─── Cron Jobs ───────────────────────────────────────────────────────────────────
const { initCronJobs } = require('./services/cronService');
initCronJobs();

// ─── Global Error Handler ────────────────────────────────────────────────────────
// Must be last middleware (4 params = error handler)
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[Error]', err.message);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start ───────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 ClientFlow AI running on port ${PORT}`));
