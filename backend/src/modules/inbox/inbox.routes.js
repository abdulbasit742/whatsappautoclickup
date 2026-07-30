const express = require('express');
const router = express.Router();
const controller = require('./inbox.controller');
const { authenticate } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/', controller.listConversations);
router.post('/', controller.createConversation);
router.get('/:id', controller.getConversation);
router.patch('/:id', controller.updateConversation);
router.post('/:id/messages', controller.sendMessage);
router.get('/:id/messages', controller.listMessages);
router.post('/:id/notes', controller.addInternalNote);

module.exports = router;
