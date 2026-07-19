const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/pipeline/stages
router.get('/stages', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM pipeline_stages ORDER BY sort_order`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pipeline/deals — all deals grouped by stage
router.get('/deals', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT pd.*, c.name AS client_name, c.whatsapp_number, tm.name AS assigned_name
       FROM pipeline_deals pd
       LEFT JOIN clients c ON c.id=pd.client_id
       LEFT JOIN team_members tm ON tm.id=pd.assigned_to
       ORDER BY pd.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pipeline/deals — create deal
router.post('/deals', async (req, res) => {
  try {
    const { client_id, stage_slug, title, value_pkr, assigned_to, notes } = req.body;
    const r = await db.query(
      `INSERT INTO pipeline_deals (client_id, stage_slug, title, value_pkr, assigned_to, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [client_id, stage_slug || 'new_lead', title, value_pkr || 0, assigned_to || null, notes || null]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/pipeline/deals/:id/stage — move deal to different stage
router.patch('/deals/:id/stage', async (req, res) => {
  try {
    const { stage_slug } = req.body;
    const old = await db.query(`SELECT stage_slug FROM pipeline_deals WHERE id=$1`, [req.params.id]);
    await db.query(`UPDATE pipeline_deals SET stage_slug=$1 WHERE id=$2`, [stage_slug, req.params.id]);
    await db.query(
      `INSERT INTO deal_stage_history (deal_id, from_stage, to_stage) VALUES ($1,$2,$3)`,
      [req.params.id, old.rows[0]?.stage_slug, stage_slug]
    );
    if (stage_slug === 'won' || stage_slug === 'lost') {
      await db.query(`UPDATE pipeline_deals SET closed_at=NOW() WHERE id=$1`, [req.params.id]);
    }
    const r = await db.query(`SELECT * FROM pipeline_deals WHERE id=$1`, [req.params.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/pipeline/deals/:id — update deal
router.put('/deals/:id', async (req, res) => {
  try {
    const { title, value_pkr, assigned_to, notes } = req.body;
    const r = await db.query(
      `UPDATE pipeline_deals SET title=$1,value_pkr=$2,assigned_to=$3,notes=$4 WHERE id=$5 RETURNING *`,
      [title, value_pkr, assigned_to, notes, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/pipeline/deals/:id
router.delete('/deals/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM pipeline_deals WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pipeline/analytics
router.get('/analytics', async (req, res) => {
  try {
    const [stageCount, totalValue, wonDeals, convRate] = await Promise.all([
      db.query(`SELECT stage_slug, COUNT(*) AS count, COALESCE(SUM(value_pkr),0) AS value FROM pipeline_deals GROUP BY stage_slug`),
      db.query(`SELECT COALESCE(SUM(value_pkr),0) AS total FROM pipeline_deals WHERE stage_slug NOT IN ('lost')`),
      db.query(`SELECT COUNT(*) AS won, COALESCE(SUM(value_pkr),0) AS won_value FROM pipeline_deals WHERE stage_slug='won'`),
      db.query(`SELECT COUNT(*) AS total FROM pipeline_deals`),
    ]);
    res.json({
      stages: stageCount.rows,
      pipeline_value: parseFloat(totalValue.rows[0].total),
      won_count: parseInt(wonDeals.rows[0].won),
      won_value: parseFloat(wonDeals.rows[0].won_value),
      total_deals: parseInt(convRate.rows[0].total),
      conversion_rate: convRate.rows[0].total > 0
        ? ((wonDeals.rows[0].won / convRate.rows[0].total) * 100).toFixed(1)
        : '0.0',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
