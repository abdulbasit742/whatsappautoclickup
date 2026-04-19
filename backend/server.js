require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const requestLogger = require('./middleware/logger');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

app.set('io', io);

// ─── Rate Limiting ───────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

// ─── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(requestLogger);
app.use('/uploads', express.static('uploads'));

const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.single('file'), (req, res) => {
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

app.use('/webhook',             webhookRouter);
app.use('/api/auth',            authLimiter, authRouter);
app.use('/api/clients',         apiLimiter, clientRouter);
app.use('/api/payments',        apiLimiter, paymentRouter);
app.use('/api/services',        apiLimiter, serviceRouter);
app.use('/api/alerts',          apiLimiter, alertRouter);
app.use('/api/reviews',         apiLimiter, reviewRouter);
app.use('/api/broadcasts',      apiLimiter, broadcastRouter);
app.use('/api/templates',       apiLimiter, templateRouter);
app.use('/api/appointments',    apiLimiter, appointmentRouter);
app.use('/api/referrals',       apiLimiter, referralRouter);
app.use('/api/analytics',       apiLimiter, analyticsRouter);
app.use('/api/settings',        apiLimiter, settingsRouter);
app.use('/api/followups',       apiLimiter, followupRouter);
app.use('/api/ai',              apiLimiter, aiRouter);

// ─── Global Error Handler ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', req.method, req.originalUrl, err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  socket.on('disconnect', () => console.log('[Socket] Client disconnected'));
});

// ─── Cron Jobs ───────────────────────────────────────────────────────────────────
const { initCronJobs } = require('./services/cronService');
initCronJobs();

// ─── Start ───────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 ClientFlow AI running on port ${PORT}`));

// ─── Graceful Shutdown ───────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});
