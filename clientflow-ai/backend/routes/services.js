const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(auth);
router.use(apiLimiter);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM services ORDER BY price_pkr ASC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, price_pkr, delivery_days, category } = req.body;
    const r = await db.query(
      `INSERT INTO services (name,description,price_pkr,delivery_days,category) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description, price_pkr, delivery_days, category]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, price_pkr, delivery_days, category, is_active } = req.body;
    const r = await db.query(
      `UPDATE services SET name=$1,description=$2,price_pkr=$3,delivery_days=$4,category=$5,is_active=$6 WHERE id=$7 RETURNING *`,
      [name, description, price_pkr, delivery_days, category, is_active, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`UPDATE services SET is_active=false WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
