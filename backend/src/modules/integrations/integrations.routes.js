const express = require('express');
const router = express.Router();
const controller = require('./integrations.controller');
const { authenticate, checkRole } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/', controller.listIntegrations);
router.post('/:provider/connect', checkRole('admin', 'super_admin'), controller.connect);
router.post('/:provider/disconnect', checkRole('admin', 'super_admin'), controller.disconnect);
router.post('/:provider/test', controller.testConnection);
router.get('/:provider/logs', controller.getLogs);
router.patch('/:provider/config', checkRole('admin', 'super_admin'), controller.updateConfig);

module.exports = router;
