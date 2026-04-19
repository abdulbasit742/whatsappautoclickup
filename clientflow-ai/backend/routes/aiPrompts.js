const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List prompts ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let q = `SELECT ap.*, tm.name AS creator_name FROM ai_prompts ap
             LEFT JOIN team_members tm ON tm.id=ap.created_by
             WHERE ap.org_id=$1`;
    const params = [req.owner.org_id];
    if (category) { params.push(category); q += ` AND ap.category=$${params.length}`; }
    q += ` ORDER BY ap.category, ap.created_at DESC`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create prompt ────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, category, prompt_text, is_org_override } = req.body;
    const r = await db.query(
      `INSERT INTO ai_prompts (org_id, name, category, prompt_text, is_org_override, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.owner.org_id, name, category, prompt_text, !!is_org_override, req.owner.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Update prompt (creates new version) ─────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, category, prompt_text, is_active } = req.body;
    const current = (await db.query(`SELECT version FROM ai_prompts WHERE id=$1`, [req.params.id])).rows[0];
    const r = await db.query(
      `UPDATE ai_prompts SET name=$1, category=$2, prompt_text=$3, is_active=$4,
       version=$5, updated_at=NOW() WHERE id=$6 AND org_id=$7 RETURNING *`,
      [name, category, prompt_text, is_active !== false, (current?.version || 1) + 1, req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Toggle active ────────────────────────────────────────────
router.put('/:id/toggle', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE ai_prompts SET is_active = NOT is_active WHERE id=$1 AND org_id=$2 RETURNING *`,
      [req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Test prompt ──────────────────────────────────────────────
router.post('/:id/test', async (req, res) => {
  try {
    const { input } = req.body;
    const prompt = (await db.query(`SELECT * FROM ai_prompts WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id])).rows[0];
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    // Simulate AI call — in production call aiService
    const output = `[AI Response for prompt "${prompt.name}" with input: "${input}"]`;
    await db.query(
      `INSERT INTO ai_prompt_test_results (prompt_id, input, output, tested_by) VALUES ($1,$2,$3,$4)`,
      [prompt.id, input, output, req.owner.id || null]
    );
    res.json({ output });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete prompt ────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM ai_prompts WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
