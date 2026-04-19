const express = require('express');
const router = express.Router();
const controller = require('./audit.controller');
const { authenticate, checkRole } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation, checkRole('admin', 'super_admin'));

router.get('/', controller.listAuditLogs);

module.exports = router;
