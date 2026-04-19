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
const webhookRouter          = require('./routes/webhook');
const authRouter             = require('./routes/auth');
const clientRouter           = require('./routes/clients');
const paymentRouter          = require('./routes/payments');
const serviceRouter          = require('./routes/services');
const alertRouter            = require('./routes/alerts');
const reviewRouter           = require('./routes/reviews');
const broadcastRouter        = require('./routes/broadcasts');
const templateRouter         = require('./routes/templates');
const appointmentRouter      = require('./routes/appointments');
const referralRouter         = require('./routes/referrals');
const analyticsRouter        = require('./routes/analytics');
const settingsRouter         = require('./routes/settings');
const followupRouter         = require('./routes/followups');
const aiRouter               = require('./routes/ai');

// ─── New Routes (P51–P80) ────────────────────────────────────────────────────
const teamRouter             = require('./routes/team');
const rbacRouter             = require('./routes/rbac');
const timelineRouter         = require('./routes/timeline');
const customer360Router      = require('./routes/customer360');
const searchRouter           = require('./routes/search');
const filesRouter            = require('./routes/files');
const notesRouter            = require('./routes/notes');
const segmentsRouter         = require('./routes/segments');
const workflowsRouter        = require('./routes/workflows');
const emailIntegRouter       = require('./routes/emailIntegration');
const calendarIntegRouter    = require('./routes/calendarIntegration');
const webhookEngineRouter    = require('./routes/webhookEngine');
const templateLibraryRouter  = require('./routes/templateLibrary');
const aiPromptsRouter        = require('./routes/aiPrompts');
const issuesRouter           = require('./routes/issues');
const notificationsRouter    = require('./routes/notifications');
const exportsRouter          = require('./routes/exports');
const widgetsRouter          = require('./routes/widgets');
const customFieldsRouter     = require('./routes/customFields');
const tagManagerRouter       = require('./routes/tagManager');
const bulkActionsRouter      = require('./routes/bulkActions');
const queueMonitorRouter     = require('./routes/queueMonitor');
const integrationHealthRouter = require('./routes/integrationHealth');
const { apiUsageLogger }     = require('./routes/apiUsage');
const apiUsageRouter         = require('./routes/apiUsage');
const securityAuditRouter    = require('./routes/securityAudit');
const onboardingRouter       = require('./routes/onboarding');
const nbaRouter              = require('./routes/nba');
const leadScoringRouter      = require('./routes/leadScoring');

// Apply API usage logger globally (before auth routes)
app.use(apiUsageLogger);

app.use('/webhook',                webhookRouter);
app.use('/api/auth',               authRouter);
app.use('/api/clients',            clientRouter);
app.use('/api/payments',           paymentRouter);
app.use('/api/services',           serviceRouter);
app.use('/api/alerts',             alertRouter);
app.use('/api/reviews',            reviewRouter);
app.use('/api/broadcasts',         broadcastRouter);
app.use('/api/templates',          templateRouter);
app.use('/api/appointments',       appointmentRouter);
app.use('/api/referrals',          referralRouter);
app.use('/api/analytics',          analyticsRouter);
app.use('/api/settings',           settingsRouter);
app.use('/api/followups',          followupRouter);
app.use('/api/ai',                 aiRouter);

// New feature routes
app.use('/api/team',               teamRouter);
app.use('/api/rbac',               rbacRouter);
app.use('/api/timeline',           timelineRouter);
app.use('/api/customer360',        customer360Router);
app.use('/api/search',             searchRouter);
app.use('/api/files',              filesRouter);
app.use('/api/notes',              notesRouter);
app.use('/api/segments',           segmentsRouter);
app.use('/api/workflows',          workflowsRouter);
app.use('/api/email-integration',  emailIntegRouter);
app.use('/api/calendar',           calendarIntegRouter);
app.use('/api/webhook-engine',     webhookEngineRouter);
app.use('/api/template-library',   templateLibraryRouter);
app.use('/api/ai-prompts',         aiPromptsRouter);
app.use('/api/issues',             issuesRouter);
app.use('/api/notifications',      notificationsRouter);
app.use('/api/exports',            exportsRouter);
app.use('/api/widgets',            widgetsRouter);
app.use('/api/custom-fields',      customFieldsRouter);
app.use('/api/tags',               tagManagerRouter);
app.use('/api/bulk',               bulkActionsRouter);
app.use('/api/queue',              queueMonitorRouter);
app.use('/api/integration-health', integrationHealthRouter);
app.use('/api/api-usage',          apiUsageRouter);
app.use('/api/security-audit',     securityAuditRouter);
app.use('/api/onboarding',         onboardingRouter);
app.use('/api/nba',                nbaRouter);
app.use('/api/lead-scoring',       leadScoringRouter);

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
