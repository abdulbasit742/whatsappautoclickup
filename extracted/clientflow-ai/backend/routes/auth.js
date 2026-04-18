const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role = 'agent' } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const existing = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const r = await db.query(
      'INSERT INTO users (email,password,name,role) VALUES ($1,$2,$3,$4) RETURNING id,email,name,role',
      [email, hashed, name || email.split('@')[0], role]
    );
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Login (supports both env-var owner and DB users)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Owner login (env-based)
    if (email === process.env.OWNER_EMAIL && password === process.env.OWNER_PASSWORD) {
      const token = jwt.sign({ email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { email, role: 'admin', name: 'Owner' } });
    }
    // DB user login
    const r = await db.query('SELECT * FROM users WHERE email=$1 AND is_active=true', [email]);
    if (!r.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, r.rows[0].password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get current user
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

// List users (admin only)
router.get('/users', async (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const r = await db.query('SELECT id,email,name,role,is_active,created_at FROM users ORDER BY created_at DESC');
    res.json(r.rows);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
