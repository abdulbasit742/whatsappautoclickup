const express = require('express');
const router = express.Router();
const controller = require('./notifications.controller');
const { authenticate } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/', controller.listNotifications);
router.patch('/:id/read', controller.markRead);
router.post('/mark-all-read', controller.markAllRead);

module.exports = router;
