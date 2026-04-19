const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Contact Lists ───────────────────────────────────────────────────────────
router.get('/lists', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT cl.*, COUNT(clm.client_id) AS member_count
       FROM contact_lists cl
       LEFT JOIN contact_list_members clm ON clm.list_id = cl.id
       GROUP BY cl.id ORDER BY cl.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/lists', async (req, res) => {
  try {
    const { name, description } = req.body;
    const r = await db.query(
      `INSERT INTO contact_lists (name, description) VALUES ($1,$2) RETURNING *`,
      [name, description]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/lists/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM contact_lists WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add members to list
router.post('/lists/:id/members', async (req, res) => {
  try {
    const { client_ids } = req.body;
    const values = client_ids.map((cid) => `('${req.params.id}','${cid}')`).join(',');
    await db.query(`INSERT INTO contact_list_members (list_id, client_id) VALUES ${values} ON CONFLICT DO NOTHING`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List members
router.get('/lists/:id/members', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT c.* FROM clients c JOIN contact_list_members clm ON clm.client_id = c.id WHERE clm.list_id=$1`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Drip Campaigns ──────────────────────────────────────────────────────────
router.get('/drip', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT dc.*, cl.name AS list_name,
              COUNT(DISTINCT ds.id) AS step_count,
              COUNT(DISTINCT de.client_id) AS enrolled_count
       FROM drip_campaigns dc
       LEFT JOIN contact_lists cl ON cl.id = dc.list_id
       LEFT JOIN drip_steps ds ON ds.campaign_id = dc.id
       LEFT JOIN drip_enrollments de ON de.campaign_id = dc.id
       GROUP BY dc.id, cl.name ORDER BY dc.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/drip', async (req, res) => {
  try {
    const { name, list_id } = req.body;
    const r = await db.query(
      `INSERT INTO drip_campaigns (name, list_id) VALUES ($1,$2) RETURNING *`,
      [name, list_id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/drip/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const r = await db.query(
      `UPDATE drip_campaigns SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Drip steps
router.get('/drip/:id/steps', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT ds.*, t.name AS template_name FROM drip_steps ds
       LEFT JOIN templates t ON t.id = ds.template_id
       WHERE ds.campaign_id=$1 ORDER BY ds.step_number`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/drip/:id/steps', async (req, res) => {
  try {
    const { step_number, delay_hours, template_id, message } = req.body;
    const r = await db.query(
      `INSERT INTO drip_steps (campaign_id, step_number, delay_hours, template_id, message)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, step_number, delay_hours || 24, template_id, message]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete drip step
router.delete('/drip/:id/steps/:stepId', async (req, res) => {
  try {
    await db.query(`DELETE FROM drip_steps WHERE id=$1`, [req.params.stepId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Enroll list into drip campaign
router.post('/drip/:id/enroll', async (req, res) => {
  try {
    const members = (await db.query(
      `SELECT client_id FROM contact_list_members clm
       JOIN drip_campaigns dc ON dc.id=$1 AND dc.list_id = clm.list_id`,
      [req.params.id]
    )).rows;

    const firstStep = (await db.query(
      `SELECT delay_hours FROM drip_steps WHERE campaign_id=$1 ORDER BY step_number ASC LIMIT 1`,
      [req.params.id]
    )).rows[0];

    const nextSend = firstStep ? new Date(Date.now() + firstStep.delay_hours * 3600000) : null;

    for (const m of members) {
      await db.query(
        `INSERT INTO drip_enrollments (campaign_id, client_id, next_send_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [req.params.id, m.client_id, nextSend]
      );
    }

    await db.query(`UPDATE drip_campaigns SET status='active' WHERE id=$1`, [req.params.id]);
    res.json({ enrolled: members.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── A/B Tests ───────────────────────────────────────────────────────────────
router.get('/ab-tests', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM ab_tests ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ab-tests', async (req, res) => {
  try {
    const { name, variant_a, variant_b, broadcast_id } = req.body;
    const r = await db.query(
      `INSERT INTO ab_tests (name, variant_a, variant_b, broadcast_id) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, variant_a, variant_b, broadcast_id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/ab-tests/:id', async (req, res) => {
  try {
    const { winner, status, sent_a, sent_b, opens_a, opens_b, replies_a, replies_b } = req.body;
    const r = await db.query(
      `UPDATE ab_tests SET winner=$1, status=$2, sent_a=$3, sent_b=$4, opens_a=$5, opens_b=$6, replies_a=$7, replies_b=$8
       WHERE id=$9 RETURNING *`,
      [winner, status, sent_a, sent_b, opens_a, opens_b, replies_a, replies_b, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
