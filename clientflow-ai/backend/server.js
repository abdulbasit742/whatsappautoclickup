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
const webhookRouter        = require('./routes/webhook');
const authRouter           = require('./routes/auth');
const clientRouter         = require('./routes/clients');
const paymentRouter        = require('./routes/payments');
const serviceRouter        = require('./routes/services');
const alertRouter          = require('./routes/alerts');
const reviewRouter         = require('./routes/reviews');
const broadcastRouter      = require('./routes/broadcasts');
const templateRouter       = require('./routes/templates');
const appointmentRouter    = require('./routes/appointments');
const referralRouter       = require('./routes/referrals');
const analyticsRouter      = require('./routes/analytics');
const settingsRouter       = require('./routes/settings');
const followupRouter       = require('./routes/followups');
const aiRouter             = require('./routes/ai');
// v2 routes
const channelsRouter       = require('./routes/channels');
const activityRouter       = require('./routes/activity');
const teamRouter           = require('./routes/team');
const pipelineRouter       = require('./routes/pipeline');
const assignmentsRouter    = require('./routes/assignments');
const tagsRouter           = require('./routes/tags');
const importRouter         = require('./routes/import');
const exportRouter         = require('./routes/export');
const { router: backupRouter } = require('./routes/backup');
const privacyRouter        = require('./routes/privacy');
const orgRouter            = require('./routes/org');
const dashboardBuilderRouter = require('./routes/dashboardBuilder');
const filtersRouter        = require('./routes/filters');
const rulesRouter          = require('./routes/rules');
const aiTrainingRouter     = require('./routes/aiTraining');
const aiFeedbackRouter     = require('./routes/aiFeedback');
const healthRouter         = require('./routes/health');
const revenueRouter        = require('./routes/revenue');

app.use('/webhook',              webhookRouter);
app.use('/api/auth',             authRouter);
app.use('/api/clients',          clientRouter);
app.use('/api/payments',         paymentRouter);
app.use('/api/services',         serviceRouter);
app.use('/api/alerts',           alertRouter);
app.use('/api/reviews',          reviewRouter);
app.use('/api/broadcasts',       broadcastRouter);
app.use('/api/templates',        templateRouter);
app.use('/api/appointments',     appointmentRouter);
app.use('/api/referrals',        referralRouter);
app.use('/api/analytics',        analyticsRouter);
app.use('/api/settings',         settingsRouter);
app.use('/api/followups',        followupRouter);
app.use('/api/ai',               aiRouter);
// v2 routes
app.use('/api/channels',         channelsRouter);
app.use('/api/activity',         activityRouter);
app.use('/api/team',             teamRouter);
app.use('/api/pipeline',         pipelineRouter);
app.use('/api/assignments',      assignmentsRouter);
app.use('/api/tags',             tagsRouter);
app.use('/api/import',           importRouter);
app.use('/api/export',           exportRouter);
app.use('/api/backup',           backupRouter);
app.use('/api/privacy',          privacyRouter);
app.use('/api/org',              orgRouter);
app.use('/api/dashboard-builder', dashboardBuilderRouter);
app.use('/api/filters',          filtersRouter);
app.use('/api/rules',            rulesRouter);
app.use('/api/ai-training',      aiTrainingRouter);
app.use('/api/ai-feedback',      aiFeedbackRouter);
app.use('/api/health',           healthRouter);
app.use('/api/revenue',          revenueRouter);

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
