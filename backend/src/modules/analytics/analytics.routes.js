const express = require('express');
const router = express.Router();
const controller = require('./analytics.controller');
const { authenticate } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/dashboard', controller.getDashboard);
router.get('/conversations', controller.getConversationAnalytics);
router.get('/campaigns', controller.getCampaignAnalytics);
router.get('/crm', controller.getCrmAnalytics);
router.get('/ai', controller.getAiAnalytics);
router.get('/team', controller.getTeamAnalytics);
router.get('/billing', controller.getBillingAnalytics);

module.exports = router;
