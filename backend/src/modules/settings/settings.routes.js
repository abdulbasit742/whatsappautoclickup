const express = require('express');
const router = express.Router();
const controller = require('./settings.controller');
const { authenticate, checkRole } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/', controller.getSettings);
router.patch('/', checkRole('admin', 'super_admin'), controller.updateSettings);
router.get('/api-keys', checkRole('admin', 'super_admin'), controller.listApiKeys);
router.post('/api-keys', checkRole('admin', 'super_admin'), controller.saveApiKey);
router.delete('/api-keys/:id', checkRole('admin', 'super_admin'), controller.deleteApiKey);
router.post('/api-keys/:id/test', checkRole('admin', 'super_admin'), controller.testApiKey);

module.exports = router;
