const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { authLimiter } = require('../../middleware/rateLimit');
const { authenticate } = require('../../middleware/auth');

router.post('/register', authLimiter, controller.register);
router.post('/login', authLimiter, controller.login);
router.post('/refresh', authLimiter, controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.post('/forgot-password', authLimiter, controller.forgotPassword);
router.post('/reset-password', authLimiter, controller.resetPassword);
router.get('/me', authenticate, controller.me);

module.exports = router;
