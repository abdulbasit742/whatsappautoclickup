const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── List templates ────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { org_id, type } = req.query;
    let q = `SELECT * FROM email_templates WHERE (org_id=$1 OR is_default=TRUE)`;
    const params = [org_id || null];
    if (type) { q += ` AND type=$2`; params.push(type); }
    q += ` ORDER BY is_default ASC, created_at DESC`;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get single template ──────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: [tpl] } = await db.query(`SELECT * FROM email_templates WHERE id=$1`, [req.params.id]);
    if (!tpl) return res.status(404).json({ error: 'Not found' });
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create template ──────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { org_id, type, name, subject, html_body, variables } = req.body;
  try {
    const { rows: [tpl] } = await db.query(
      `INSERT INTO email_templates (org_id, type, name, subject, html_body, variables)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [org_id, type, name, subject, html_body, JSON.stringify(variables || [])]
    );
    res.status(201).json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update template ──────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  const { name, subject, html_body, variables } = req.body;
  try {
    const { rows: [tpl] } = await db.query(
      `UPDATE email_templates SET name=$1, subject=$2, html_body=$3, variables=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [name, subject, html_body, JSON.stringify(variables || []), req.params.id]
    );
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Preview template (render variables) ─────────────────────────────────────
router.post('/:id/preview', auth, async (req, res) => {
  try {
    const { rows: [tpl] } = await db.query(`SELECT * FROM email_templates WHERE id=$1`, [req.params.id]);
    if (!tpl) return res.status(404).json({ error: 'Not found' });
    const sampleVars = req.body.variables || {};
    let rendered = tpl.html_body;
    for (const [k, v] of Object.entries(sampleVars)) {
      rendered = rendered.replaceAll(`{{${k}}}`, v);
    }
    res.json({ subject: tpl.subject, html: rendered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Test send ────────────────────────────────────────────────────────────────
router.post('/:id/test-send', auth, async (req, res) => {
  // Placeholder: integrate with your email provider (Nodemailer / SendGrid)
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'Recipient email required' });
  res.json({ success: true, message: `Test email would be sent to ${to} (integrate email provider)` });
});

// ── Delete template ──────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query(`DELETE FROM email_templates WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
