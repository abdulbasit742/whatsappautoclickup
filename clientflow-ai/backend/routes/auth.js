const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');

// Login — supports both owner (env-based) and multi-user (db-based)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Check owner credentials first
  if (email === process.env.OWNER_EMAIL) {
    if (password !== process.env.OWNER_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ email, role: 'admin', name: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, email, role: 'admin', name: 'Admin' });
  }

  // Check database users
  try {
    const r = await db.query(`SELECT * FROM users WHERE email=$1 AND is_active=true`, [email]);
    if (!r.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, r.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    await db.query(`UPDATE users SET last_login=NOW() WHERE id=$1`, [r.rows[0].id]);
    const token = jwt.sign(
      { id: r.rows[0].id, email: r.rows[0].email, role: r.rows[0].role, name: r.rows[0].name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ token, email: r.rows[0].email, role: r.rows[0].role, name: r.rows[0].name });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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

