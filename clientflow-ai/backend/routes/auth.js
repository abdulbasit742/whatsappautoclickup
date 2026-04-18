const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Compare against a dummy to ensure constant time regardless of length
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Single owner login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const emailMatch    = timingSafeEqual(email,    process.env.OWNER_EMAIL    || '');
  const passwordMatch = timingSafeEqual(password, process.env.OWNER_PASSWORD || '');
  if (!emailMatch || !passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ email, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, email });
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
