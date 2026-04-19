require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
const multer  = require('multer');
const swaggerUi = require('swagger-ui-express');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});
app.set('io', io);

// ─── Import services ─────────────────────────────────────────────────────────
const cache   = require('./services/cacheService');
const logger  = require('./services/loggerService');

// ─── Import middleware ────────────────────────────────────────────────────────
const { secureHeaders, sanitizeInput, payloadSizeGuard } = require('./middleware/security');
const requestLogger  = require('./middleware/requestLogger');
const subdomainTenant = require('./middleware/subdomainTenant');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter }   = require('./middleware/rateLimiter');
const swaggerSpec      = require('./swagger');

// ─── Connect to Redis ────────────────────────────────────────────────────────
cache.connect().catch(() => logger.warn('Redis connection failed — caching disabled'));

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(secureHeaders);
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(payloadSizeGuard);
app.use(sanitizeInput);
app.use(requestLogger);
app.use(subdomainTenant);

// ─── Static Uploads ──────────────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ─── API Docs (PROMPT 116) ───────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'ClientFlow AI API Docs',
  customCss:       '.swagger-ui .topbar { background-color: #10B981; }',
}));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status:    'ok',
  timestamp: new Date().toISOString(),
  redis:     cache.isConnected(),
  version:   '1.0.0',
}));

// ─── API Rate Limiter (applies to all /api routes) ───────────────────────────
app.use('/api', apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
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
const sessionsRouter    = require('./routes/sessions');
const whitelabelRouter  = require('./routes/whitelabel');
const experimentsRouter = require('./routes/experiments');
const usageRouter       = require('./routes/usage');

// ─── PROMPT 115: API Versioning — mount under both /api/v1 and /api (legacy) ─
const mountRoutes = (base) => {
  app.use(`${base}/webhook`,      webhookRouter);
  app.use(`${base}/auth`,         authRouter);
  app.use(`${base}/clients`,      clientRouter);
  app.use(`${base}/payments`,     paymentRouter);
  app.use(`${base}/services`,     serviceRouter);
  app.use(`${base}/alerts`,       alertRouter);
  app.use(`${base}/reviews`,      reviewRouter);
  app.use(`${base}/broadcasts`,   broadcastRouter);
  app.use(`${base}/templates`,    templateRouter);
  app.use(`${base}/appointments`, appointmentRouter);
  app.use(`${base}/referrals`,    referralRouter);
  app.use(`${base}/analytics`,    analyticsRouter);
  app.use(`${base}/settings`,     settingsRouter);
  app.use(`${base}/followups`,    followupRouter);
  app.use(`${base}/ai`,           aiRouter);
  app.use(`${base}/sessions`,     sessionsRouter);
  app.use(`${base}/experiments`,  experimentsRouter);
  app.use(`${base}/usage`,        usageRouter);
  app.use(`${base}`,              whitelabelRouter);  // /branding and /domains
};

mountRoutes('/api/v1');   // current version
mountRoutes('/api');      // legacy / backward-compatible

// API version header
app.use('/api/v1', (_req, res, next) => { res.setHeader('API-Version', 'v1'); next(); });

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info('Socket connected', { id: socket.id });
  socket.on('join-org', (orgId) => socket.join(`org:${orgId}`));
  socket.on('disconnect', () => logger.debug('Socket disconnected', { id: socket.id }));
});

// ─── Cron Jobs ───────────────────────────────────────────────────────────────
const { initCronJobs } = require('./services/cronService');
initCronJobs();

// ─── Global Error Handler (must be last middleware) ──────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`ClientFlow AI running on port ${PORT}`, { port: PORT }));
