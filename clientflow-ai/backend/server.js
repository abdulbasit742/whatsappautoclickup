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
const webhookRouter         = require('./routes/webhook');
const authRouter            = require('./routes/auth');
const clientRouter          = require('./routes/clients');
const paymentRouter         = require('./routes/payments');
const serviceRouter         = require('./routes/services');
const alertRouter           = require('./routes/alerts');
const reviewRouter          = require('./routes/reviews');
const broadcastRouter       = require('./routes/broadcasts');
const templateRouter        = require('./routes/templates');
const appointmentRouter     = require('./routes/appointments');
const referralRouter        = require('./routes/referrals');
const analyticsRouter       = require('./routes/analytics');
const settingsRouter        = require('./routes/settings');
const followupRouter        = require('./routes/followups');
const aiRouter              = require('./routes/ai');
const segmentsRouter        = require('./routes/segments');
const cohortsRouter         = require('./routes/cohorts');
const activationRouter      = require('./routes/activation');
const featureAdoptionRouter = require('./routes/feature-adoption');
const pqlRouter             = require('./routes/pql');
const expansionRouter       = require('./routes/expansion');
const billingRecoveryRouter = require('./routes/billing-recovery');
const affiliatesRouter      = require('./routes/affiliates');
const testimonialsRouter    = require('./routes/testimonials');
const caseStudiesRouter     = require('./routes/case-studies');
const npsRouter             = require('./routes/nps');
const csatRouter            = require('./routes/csat');
const roadmapRouter         = require('./routes/roadmap');
const betaRouter            = require('./routes/beta');
const statusRouter          = require('./routes/status');
const incidentsRouter       = require('./routes/incidents');
const postmortemsRouter     = require('./routes/postmortems');
const adminOpsRouter        = require('./routes/admin-ops');
const biRouter              = require('./routes/bi');

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
app.use('/api/segments',           segmentsRouter);
app.use('/api/cohorts',            cohortsRouter);
app.use('/api/activation',         activationRouter);
app.use('/api/feature-adoption',   featureAdoptionRouter);
app.use('/api/pql',                pqlRouter);
app.use('/api/expansion',          expansionRouter);
app.use('/api/billing-recovery',   billingRecoveryRouter);
app.use('/api/affiliates',         affiliatesRouter);
app.use('/api/testimonials',       testimonialsRouter);
app.use('/api/case-studies',       caseStudiesRouter);
app.use('/api/nps',                npsRouter);
app.use('/api/csat',               csatRouter);
app.use('/api/roadmap',            roadmapRouter);
app.use('/api/beta',               betaRouter);
app.use('/api/status',             statusRouter);
app.use('/api/incidents',          incidentsRouter);
app.use('/api/postmortems',        postmortemsRouter);
app.use('/api/admin-ops',          adminOpsRouter);
app.use('/api/bi',                 biRouter);

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
