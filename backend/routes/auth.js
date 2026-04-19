const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Single owner login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (email !== process.env.OWNER_EMAIL) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (password !== process.env.OWNER_PASSWORD) {
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
