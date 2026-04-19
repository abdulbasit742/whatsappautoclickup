const express = require('express');
const router = express.Router();
const controller = require('./followups.controller');
const { authenticate } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/', controller.listFollowUps);
router.post('/', controller.createFollowUp);
router.get('/:id', controller.getFollowUp);
router.patch('/:id', controller.updateFollowUp);
router.post('/:id/complete', controller.completeFollowUp);

router.get('/reminders/list', controller.listReminders);
router.post('/reminders', controller.createReminder);
router.patch('/reminders/:id', controller.updateReminder);
router.post('/reminders/:id/complete', controller.completeReminder);

module.exports = router;
