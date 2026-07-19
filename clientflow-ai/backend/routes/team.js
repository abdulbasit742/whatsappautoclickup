const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/team — list team members
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM team_members WHERE is_active=true ORDER BY name`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/team — create team member
router.post('/', async (req, res) => {
  try {
    const { name, email, role, skills, max_load } = req.body;
    const r = await db.query(
      `INSERT INTO team_members (name, email, role, skills, max_load)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, email, role || 'agent', skills || [], max_load || 20]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/team/performance — aggregated performance for all members
router.get('/performance', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const r = await db.query(
      `SELECT tm.id, tm.name, tm.role,
         COALESCE(SUM(tp.messages_handled),0) AS messages_handled,
         COALESCE(AVG(tp.avg_response_time),0) AS avg_response_time,
         COALESCE(SUM(tp.resolved_issues),0) AS resolved_issues,
         COALESCE(SUM(tp.closed_deals),0) AS closed_deals,
         COALESCE(SUM(tp.followups_done),0) AS followups_done
       FROM team_members tm
       LEFT JOIN team_performance tp ON tp.member_id=tm.id AND tp.date >= NOW()-INTERVAL '${parseInt(days)} days'
       GROUP BY tm.id ORDER BY messages_handled DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/team/:id/performance — member-specific performance over time
router.get('/:id/performance', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM team_performance WHERE member_id=$1 ORDER BY date DESC LIMIT 30`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/team/:id — update member
router.put('/:id', async (req, res) => {
  try {
    const { name, role, skills, max_load, is_active } = req.body;
    const r = await db.query(
      `UPDATE team_members SET name=$1,role=$2,skills=$3,max_load=$4,is_active=$5 WHERE id=$6 RETURNING *`,
      [name, role, skills, max_load, is_active, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
