const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/assignments/rules
router.get('/rules', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM assignment_rules ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/assignments/rules
router.post('/rules', async (req, res) => {
  try {
    const { name, entity_type, strategy, conditions } = req.body;
    const r = await db.query(
      `INSERT INTO assignment_rules (name, entity_type, strategy, conditions)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, entity_type, strategy, JSON.stringify(conditions || {})]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/assignments/assign — run assignment logic
router.post('/assign', async (req, res) => {
  try {
    const { entity_type, entity_id, rule_id } = req.body;

    // Get the rule
    const rule = rule_id
      ? (await db.query(`SELECT * FROM assignment_rules WHERE id=$1 AND is_active=true`, [rule_id])).rows[0]
      : (await db.query(`SELECT * FROM assignment_rules WHERE entity_type=$1 AND is_active=true LIMIT 1`, [entity_type])).rows[0];

    if (!rule) return res.status(404).json({ error: 'No active rule found' });

    // Get available team members
    const members = (await db.query(
      `SELECT id, name, current_load, max_load, skills FROM team_members WHERE is_active=true`
    )).rows;

    if (!members.length) return res.status(422).json({ error: 'No available team members' });

    let assigned;
    if (rule.strategy === 'round_robin') {
      // Pick member with least recent assignment
      const lastAssign = await db.query(
        `SELECT member_id, MAX(created_at) AS last FROM assignment_log GROUP BY member_id`
      );
      const lastMap = {};
      lastAssign.rows.forEach(r => { lastMap[r.member_id] = r.last; });
      assigned = members.sort((a, b) => {
        const aLast = lastMap[a.id] ? new Date(lastMap[a.id]) : new Date(0);
        const bLast = lastMap[b.id] ? new Date(lastMap[b.id]) : new Date(0);
        return aLast - bLast;
      })[0];
    } else if (rule.strategy === 'load_balance') {
      assigned = members.filter(m => m.current_load < m.max_load).sort((a, b) => a.current_load - b.current_load)[0];
      if (!assigned) assigned = members[0];
    } else {
      // skill_based — pick based on conditions.required_skill
      const skill = rule.conditions?.required_skill;
      assigned = skill
        ? (members.find(m => m.skills?.includes(skill)) || members[0])
        : members[0];
    }

    // Log the assignment
    await db.query(
      `INSERT INTO assignment_log (rule_id, entity_type, entity_id, member_id) VALUES ($1,$2,$3,$4)`,
      [rule.id, entity_type, entity_id, assigned.id]
    );
    // Bump load
    await db.query(`UPDATE team_members SET current_load=current_load+1 WHERE id=$1`, [assigned.id]);

    res.json({ assigned_to: assigned });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/assignments/log
router.get('/log', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT al.*, tm.name AS member_name FROM assignment_log al
       LEFT JOIN team_members tm ON tm.id=al.member_id ORDER BY al.created_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/assignments/rules/:id
router.delete('/rules/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM assignment_rules WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
