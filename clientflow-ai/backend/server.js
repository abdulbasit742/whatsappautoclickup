require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

app.set('io', io);

// ─── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
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
const apiKeysRouter     = require('./routes/apikeys');

app.use('/webhook',          webhookRouter);
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
app.use('/api/apikeys',      apiKeysRouter);

// ─── Queue health endpoint ────────────────────────────────────────────────────────
const { messageQueue, broadcastQueue, followupQueue, aiTaskQueue } = require('./modules/queue/queues');
app.get('/api/queue/health', async (req, res, next) => {
  try {
    const queues = { messageQueue, broadcastQueue, followupQueue, aiTaskQueue };
    const stats = {};
    for (const [name, q] of Object.entries(queues)) {
      const [waiting, active, failed] = await Promise.all([
        q.getWaitingCount(),
        q.getActiveCount(),
        q.getFailedCount(),
      ]);
      stats[name] = { waiting, active, failed };
    }
    res.json({ status: 'ok', queues: stats });
  } catch (err) { next(err); }
});

// ─── Socket.io ───────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  socket.on('disconnect', () => console.log('[Socket] Client disconnected'));
});

// ─── Cron Jobs ───────────────────────────────────────────────────────────────────
const { initCronJobs } = require('./services/cronService');
initCronJobs();

// ─── Global error handler (must be last) ─────────────────────────────────────────
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 ClientFlow AI running on port ${PORT}`));
