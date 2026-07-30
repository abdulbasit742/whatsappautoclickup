const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, name, key_prefix, scopes, last_used, expires_at, is_active, created_at FROM api_keys ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, scopes, expires_days } = req.body;
    const rawKey = 'cfk_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 10);
    const user_id = req.owner?.id || null;
    const expires_at = expires_days
      ? new Date(Date.now() + expires_days * 86400000)
      : null;

    const r = await db.query(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, key_prefix, scopes, expires_at, created_at`,
      [user_id, name, keyHash, keyPrefix, scopes || ['read'], expires_at]
    );
    res.status(201).json({ ...r.rows[0], key: rawKey });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, scopes, is_active } = req.body;
    const r = await db.query(
      `UPDATE api_keys SET name=$1, scopes=$2, is_active=$3 WHERE id=$4 RETURNING id, name, key_prefix, scopes, is_active`,
      [name, scopes, is_active, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM api_keys WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
