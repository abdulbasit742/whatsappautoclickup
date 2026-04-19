const express = require('express');
const router = express.Router();
const controller = require('./billing.controller');
const { authenticate, checkRole } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/plans', controller.listPlans);
router.get('/subscription', controller.getSubscription);
router.post('/subscribe', checkRole('admin', 'super_admin'), controller.subscribe);
router.post('/upgrade', checkRole('admin', 'super_admin'), controller.upgrade);
router.get('/invoices', controller.listInvoices);
router.get('/usage', controller.getUsage);

module.exports = router;
