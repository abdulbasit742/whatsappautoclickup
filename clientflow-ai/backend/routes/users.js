const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// List all users (admin only)
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, email, name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const hash = await bcrypt.hash(password, 10);
    const r = await db.query(
      `INSERT INTO users (email, name, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role, created_at`,
      [email, name, hash, role || 'agent']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { name, role, is_active } = req.body;
    const r = await db.query(
      `UPDATE users SET name=$1, role=$2, is_active=$3 WHERE id=$4 RETURNING id, email, name, role, is_active`,
      [name, role, is_active, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reset password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await db.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hash, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Multi-user login (added alongside owner login in auth.js)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
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
    res.json({ token, email: r.rows[0].email, name: r.rows[0].name, role: r.rows[0].role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
