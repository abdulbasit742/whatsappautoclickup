require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const orgsRoutes = require('./modules/organizations/organizations.routes');
const contactsRoutes = require('./modules/crm/contacts.routes');
const inboxRoutes = require('./modules/inbox/inbox.routes');
const campaignsRoutes = require('./modules/campaigns/campaigns.routes');
const followupsRoutes = require('./modules/followups/followups.routes');
const issuesRoutes = require('./modules/issues/issues.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const integrationsRoutes = require('./modules/integrations/integrations.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const flagsRoutes = require('./modules/feature-flags/flags.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/organizations', orgsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/conversations', inboxRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/flags', flagsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

module.exports = app;
