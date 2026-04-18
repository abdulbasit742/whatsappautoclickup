require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const helmet = require('helmet');
const path = require('path');

const { logger, requestLogger } = require('./middleware/logger');
const { apiLimiter, webhookLimiter } = require('./middleware/rateLimiter');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

app.set('io', io);

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// ─── Serve uploads (static files) ───────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── File Upload (authenticated, type-validated) ────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed`));
    }
  },
});

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

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
app.use('/api/auth',         authRouter);
app.use('/api/clients',      clientRouter);
app.use('/api/payments',     paymentRouter);
app.use('/api/services',     serviceRouter);
app.use('/api/alerts',       alertRouter);
app.use('/api/reviews',      reviewRouter);
app.use('/api/broadcasts',   broadcastRouter);
app.use('/api/templates',    templateRouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/referrals',    referralRouter);
app.use('/api/analytics',    analyticsRouter);
app.use('/api/settings',     settingsRouter);
app.use('/api/followups',    followupRouter);
app.use('/api/ai',           aiRouter);

// ─── Socket.io ───────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`[Socket] Client disconnected: ${socket.id}`));
});

// ─── Cron Jobs ───────────────────────────────────────────────────────────────────
const { initCronJobs } = require('./services/cronService');
initCronJobs();

// ─── Global Error Handler ────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Multer file type error
  if (err.message && err.message.startsWith('File type')) {
    return res.status(415).json({ error: err.message });
  }
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.stack || err.message}`);
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
});

// ─── Start ───────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`🚀 ClientFlow AI running on port ${PORT}`));
