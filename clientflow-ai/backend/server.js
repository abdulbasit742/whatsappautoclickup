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

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
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

const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many support requests, please try again later.' },
});

// ─── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api', apiLimiter);

const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.single('file'), (req, res) => {
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
const followupRouter        = require('./routes/followups');
const aiRouter              = require('./routes/ai');
const orgsRouter            = require('./routes/orgs');
const brandingRouter        = require('./routes/branding');
const emailTemplatesRouter  = require('./routes/emailTemplates');
const onboardingRouter      = require('./routes/onboarding');
const seedRouter            = require('./routes/seed');
const billingRouter         = require('./routes/billing');
const announcementsRouter   = require('./routes/announcements');
const releaseNotesRouter    = require('./routes/releaseNotes');
const helpCenterRouter      = require('./routes/helpCenter');
const faqsRouter            = require('./routes/faqs');
const supportRouter         = require('./routes/support');
const livechatRouter        = require('./routes/livechat');
const healthScoreRouter     = require('./routes/healthScore');

app.use('/webhook',                  webhookRouter);
app.use('/api/auth',                 authLimiter, authRouter);
app.use('/api/clients',              clientRouter);
app.use('/api/payments',             paymentRouter);
app.use('/api/services',             serviceRouter);
app.use('/api/alerts',               alertRouter);
app.use('/api/reviews',              reviewRouter);
app.use('/api/broadcasts',           broadcastRouter);
app.use('/api/templates',            templateRouter);
app.use('/api/appointments',         appointmentRouter);
app.use('/api/referrals',            referralRouter);
app.use('/api/analytics',            analyticsRouter);
app.use('/api/settings',             settingsRouter);
app.use('/api/followups',            followupRouter);
app.use('/api/ai',                   aiRouter);
app.use('/api/orgs',                 orgsRouter);
app.use('/api/branding',             brandingRouter);
app.use('/api/email-templates',      emailTemplatesRouter);
app.use('/api/onboarding',           onboardingRouter);
app.use('/api/seed',                 seedRouter);
app.use('/api/billing',              billingRouter);
app.use('/api/announcements',        announcementsRouter);
app.use('/api/release-notes',        releaseNotesRouter);
app.use('/api/help',                 helpCenterRouter);
app.use('/api/faqs',                 faqsRouter);
app.use('/api/support',              supportLimiter, supportRouter);
app.use('/api/livechat',             livechatRouter);
app.use('/api/health',               healthScoreRouter);

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
