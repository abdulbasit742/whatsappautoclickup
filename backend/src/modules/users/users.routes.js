const express = require('express');
const router = express.Router();
const controller = require('./users.controller');
const { authenticate, checkRole } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/', controller.listUsers);
router.post('/invite', checkRole('admin', 'super_admin'), controller.inviteUser);
router.get('/:id', controller.getUser);
router.patch('/:id', controller.updateUser);
router.delete('/:id', checkRole('admin', 'super_admin'), controller.deleteUser);
router.patch('/:id/role', checkRole('admin', 'super_admin'), controller.changeRole);
router.post('/:id/suspend', checkRole('admin', 'super_admin'), controller.suspendUser);

module.exports = router;
