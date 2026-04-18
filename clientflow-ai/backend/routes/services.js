const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM services ORDER BY price_pkr ASC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, price_pkr, delivery_days, category } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (price_pkr === undefined || price_pkr === null || isNaN(Number(price_pkr)) || Number(price_pkr) < 0) {
      return res.status(400).json({ error: 'price_pkr must be a non-negative number' });
    }
    const r = await db.query(
      `INSERT INTO services (name,description,price_pkr,delivery_days,category) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name.trim(), description || null, Number(price_pkr), delivery_days || 1, category || null]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, price_pkr, delivery_days, category, is_active } = req.body;
    const r = await db.query(
      `UPDATE services
       SET name          = COALESCE($1, name),
           description   = COALESCE($2, description),
           price_pkr     = COALESCE($3, price_pkr),
           delivery_days = COALESCE($4, delivery_days),
           category      = COALESCE($5, category),
           is_active     = COALESCE($6, is_active)
       WHERE id=$7 RETURNING *`,
      [
        name !== undefined ? name : null,
        description !== undefined ? description : null,
        price_pkr !== undefined ? Number(price_pkr) : null,
        delivery_days !== undefined ? delivery_days : null,
        category !== undefined ? category : null,
        is_active !== undefined ? is_active : null,
        req.params.id,
      ]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Service not found' });
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
