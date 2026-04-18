const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();
const { loginLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../middleware/logger');

/**
 * Compares a candidate password against the configured owner password.
 * Supports both plain-text (dev) and bcrypt-hashed (production) passwords.
 * Set OWNER_PASSWORD_HASH to a bcrypt hash for secure production deployments.
 */
async function verifyOwnerPassword(candidate) {
  const hash = process.env.OWNER_PASSWORD_HASH;
  if (hash) {
    return bcrypt.compare(candidate, hash);
  }
  // Fallback: plain comparison (development only – not recommended in production)
  if (process.env.NODE_ENV === 'production') {
    logger.warn('OWNER_PASSWORD_HASH is not set. Set it to a bcrypt hash for production security.');
  }
  return candidate === process.env.OWNER_PASSWORD;
}

// Single owner login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Constant-time email check to avoid timing attacks
  const expectedEmail = (process.env.OWNER_EMAIL || '').toLowerCase().trim();
  const submittedEmail = email.toLowerCase().trim();

  if (submittedEmail !== expectedEmail) {
    logger.warn(`Failed login attempt for email "${submittedEmail}" from ${req.ip}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const passwordValid = await verifyOwnerPassword(password);
  if (!passwordValid) {
    logger.warn(`Failed login attempt for email "${submittedEmail}" from ${req.ip} (wrong password)`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { email: submittedEmail, role: 'owner' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  logger.info(`Successful login for ${submittedEmail} from ${req.ip}`);
  res.json({ token, email: submittedEmail });
});

router.get('/me', (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth, process.env.JWT_SECRET);
    res.json(decoded);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
