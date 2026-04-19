require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

app.set('io', io);

// ─── Rate Limiting ───────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api', apiLimiter);

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
const usersRouter       = require('./routes/users');
const leadsRouter       = require('./routes/leads');
const tagsRouter        = require('./routes/tags');
const notesRouter       = require('./routes/notes');
const apiKeysRouter     = require('./routes/apikeys');
const integrationsRouter = require('./routes/integrations');
const billingRouter     = require('./routes/billing');
const campaignsRouter   = require('./routes/campaigns');

app.use('/webhook',          webhookRouter);
app.use('/api/auth',         authLimiter, authRouter);
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
app.use('/api/users',        usersRouter);
app.use('/api/leads',        leadsRouter);
app.use('/api/tags',         tagsRouter);
app.use('/api/notes',        notesRouter);
app.use('/api/api-keys',     apiKeysRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/billing',      billingRouter);
app.use('/api/campaigns',    campaignsRouter);

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
