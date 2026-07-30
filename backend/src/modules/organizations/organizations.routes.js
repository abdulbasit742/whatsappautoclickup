const express = require('express');
const router = express.Router();
const controller = require('./organizations.controller');
const { authenticate, checkRole } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.get('/current', authenticate, tenantIsolation, controller.getCurrent);
router.patch('/current', authenticate, tenantIsolation, checkRole('admin', 'super_admin'), controller.updateCurrent);
router.get('/', authenticate, checkRole('super_admin'), controller.listAll);
router.post('/:id/plan', authenticate, checkRole('super_admin'), controller.assignPlan);

module.exports = router;
