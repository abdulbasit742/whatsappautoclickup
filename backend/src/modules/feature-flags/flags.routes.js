const express = require('express');
const router = express.Router();
const controller = require('./flags.controller');
const { authenticate, checkRole } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/', controller.listFlags);
router.post('/', checkRole('admin', 'super_admin'), controller.createFlag);
router.patch('/:key', checkRole('admin', 'super_admin'), controller.updateFlag);
router.delete('/:key', checkRole('admin', 'super_admin'), controller.deleteFlag);

module.exports = router;
