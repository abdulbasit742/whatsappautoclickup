const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/rules — list rule definitions
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM rule_definitions ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/rules — create rule
router.post('/', async (req, res) => {
  try {
    const { name, trigger, conditions, actions } = req.body;
    const r = await db.query(
      `INSERT INTO rule_definitions (name, trigger, conditions, actions)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, trigger, JSON.stringify(conditions || []), JSON.stringify(actions || [])]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/rules/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, trigger, conditions, actions, is_active } = req.body;
    const r = await db.query(
      `UPDATE rule_definitions SET name=$1,trigger=$2,conditions=$3,actions=$4,is_active=$5 WHERE id=$6 RETURNING *`,
      [name, trigger, JSON.stringify(conditions || []), JSON.stringify(actions || []), is_active, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/rules/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM rule_definitions WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/rules/execute — trigger rule execution against an entity
router.post('/execute', async (req, res) => {
  try {
    const { rule_id, entity_id, entity_type, context } = req.body;
    const rule = (await db.query(`SELECT * FROM rule_definitions WHERE id=$1 AND is_active=true`, [rule_id])).rows[0];
    if (!rule) return res.status(404).json({ error: 'Rule not found or inactive' });

    const conditions = rule.conditions || [];
    const actions = rule.actions || [];
    const ctx = context || {};

    // Evaluate conditions
    let passed = true;
    for (const cond of conditions) {
      const { field, op, value } = cond;
      const ctxVal = ctx[field];
      if (op === 'equals' && ctxVal !== value) { passed = false; break; }
      if (op === 'contains' && !String(ctxVal || '').toLowerCase().includes(String(value).toLowerCase())) { passed = false; break; }
      if (op === 'gt' && !(Number(ctxVal) > Number(value))) { passed = false; break; }
      if (op === 'lt' && !(Number(ctxVal) < Number(value))) { passed = false; break; }
    }

    const output = { conditions_passed: passed, actions_taken: [] };

    if (passed) {
      for (const action of actions) {
        if (action.type === 'assign_tag' && action.tag_id && entity_type === 'client') {
          await db.query(
            `INSERT INTO client_tags (client_id, tag_id, source) VALUES ($1,$2,'rule') ON CONFLICT DO NOTHING`,
            [entity_id, action.tag_id]
          ).catch(() => {});
          output.actions_taken.push({ type: 'assign_tag', tag_id: action.tag_id });
        } else if (action.type === 'emit_activity') {
          await db.query(
            `INSERT INTO activity_feed (type, entity_type, entity_id, title) VALUES ($1,$2,$3,$4)`,
            [action.activity_type || 'rule_action', entity_type, entity_id, action.title || 'Rule triggered']
          ).catch(() => {});
          output.actions_taken.push({ type: 'emit_activity' });
        }
      }
    }

    await db.query(`UPDATE rule_definitions SET run_count=run_count+1, last_run_at=NOW() WHERE id=$1`, [rule_id]);
    await db.query(
      `INSERT INTO rule_execution_log (rule_id, entity_id, entity_type, success, output) VALUES ($1,$2,$3,$4,$5)`,
      [rule_id, entity_id, entity_type, passed, JSON.stringify(output)]
    );

    res.json(output);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/rules/log
router.get('/log', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT rel.*, rd.name AS rule_name FROM rule_execution_log rel
       LEFT JOIN rule_definitions rd ON rd.id=rel.rule_id
       ORDER BY rel.executed_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
