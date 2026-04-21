const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/beta — list beta programs
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT b.*, COALESCE(e.enrolled,0) AS enrolled_count
       FROM beta_programs b
       LEFT JOIN (SELECT program_id, COUNT(*) AS enrolled FROM beta_enrollments GROUP BY program_id) e ON e.program_id=b.id
       ORDER BY b.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/beta — create beta program
router.post('/', async (req, res) => {
  try {
    const { name, description, feature_flag } = req.body;
    const r = await db.query(
      `INSERT INTO beta_programs (name, description, feature_flag) VALUES ($1,$2,$3) RETURNING *`,
      [name, description, feature_flag]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/beta/:id/enroll — enroll a client
router.post('/:id/enroll', async (req, res) => {
  try {
    const { client_id } = req.body;
    const r = await db.query(
      `INSERT INTO beta_enrollments (program_id, client_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *`,
      [req.params.id, client_id]
    );
    res.json(r.rows[0] || { already_enrolled: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/beta/:id/enroll/:client_id — unenroll
router.delete('/:id/enroll/:client_id', async (req, res) => {
  try {
    await db.query(
      `DELETE FROM beta_enrollments WHERE program_id=$1 AND client_id=$2`,
      [req.params.id, req.params.client_id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/beta/:id/enrolled — list enrolled clients
router.get('/:id/enrolled', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT e.*, c.name, c.whatsapp_number, c.status
       FROM beta_enrollments e JOIN clients c ON c.id=e.client_id
       WHERE e.program_id=$1 ORDER BY e.enrolled_at DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/beta/:id/feedback — submit beta feedback
router.post('/:id/feedback', async (req, res) => {
  try {
    const { client_id, rating, comment } = req.body;
    const r = await db.query(
      `INSERT INTO beta_feedback (program_id, client_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, client_id, rating, comment]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/beta/:id/feedback — list feedback for a program
router.get('/:id/feedback', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT f.*, c.name AS client_name FROM beta_feedback f JOIN clients c ON c.id=f.client_id
       WHERE f.program_id=$1 ORDER BY f.created_at DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/beta/:id/toggle — enable/disable beta program
router.put('/:id/toggle', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE beta_programs SET is_active=NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
