const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

router.use(auth);

// ─── List team members ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, email, name, role, status, last_active_at, invited_at, created_at
       FROM team_members WHERE org_id=$1 ORDER BY created_at DESC`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Invite member ────────────────────────────────────────────
router.post('/invite', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const token = uuidv4();
    const r = await db.query(
      `INSERT INTO team_members (org_id, email, name, role, status, invite_token, invited_at)
       VALUES ($1,$2,$3,$4,'invited',$5,NOW())
       ON CONFLICT (org_id, email) DO UPDATE
         SET role=EXCLUDED.role, invite_token=EXCLUDED.invite_token, status='invited', invited_at=NOW()
       RETURNING *`,
      [req.owner.org_id, email, name, role || 'agent', token]
    );
    // In production send invite email here
    res.json({ member: r.rows[0], invite_link: `/accept-invite?token=${token}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Accept invite ────────────────────────────────────────────
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, name, password } = req.body;
    const member = (await db.query(
      `SELECT * FROM team_members WHERE invite_token=$1 AND status='invited'`, [token]
    )).rows[0];
    if (!member) return res.status(400).json({ error: 'Invalid or expired invite' });
    const hash = await bcrypt.hash(password, 10);
    const r = await db.query(
      `UPDATE team_members SET name=$1, password_hash=$2, status='active', invite_token=NULL
       WHERE id=$3 RETURNING id, email, name, role, status`,
      [name, hash, member.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Update member role ───────────────────────────────────────
router.put('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['super_admin','org_admin','manager','agent','support','viewer'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const r = await db.query(
      `UPDATE team_members SET role=$1 WHERE id=$2 AND org_id=$3 RETURNING *`,
      [role, req.params.id, req.owner.org_id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Deactivate / reactivate ──────────────────────────────────
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active','inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const r = await db.query(
      `UPDATE team_members SET status=$1 WHERE id=$2 AND org_id=$3 RETURNING *`,
      [status, req.params.id, req.owner.org_id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Reset password ───────────────────────────────────────────
router.post('/:id/reset-password', async (req, res) => {
  try {
    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000).toISOString();
    const r = await db.query(
      `UPDATE team_members SET reset_token=$1, reset_expires=$2 WHERE id=$3 AND org_id=$4 RETURNING email`,
      [token, expires, req.params.id, req.owner.org_id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Member not found' });
    // In production: send email with reset link
    res.json({ message: 'Password reset link sent', reset_link: `/reset-password?token=${token}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Team performance overview ────────────────────────────────
router.get('/performance', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT tm.id, tm.name, tm.email, tm.role,
              COUNT(DISTINCT i.id) FILTER (WHERE i.status='resolved') AS issues_resolved,
              COUNT(DISTINCT i.id) FILTER (WHERE i.status='open')     AS issues_open,
              tm.last_active_at
       FROM team_members tm
       LEFT JOIN issues i ON i.assigned_to = tm.id
       WHERE tm.org_id=$1
       GROUP BY tm.id ORDER BY issues_resolved DESC`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Assign entity (chat/lead/issue) to user ──────────────────
router.post('/assign', async (req, res) => {
  try {
    const { entity_type, entity_id, user_id } = req.body;
    let result;
    if (entity_type === 'issue') {
      result = await db.query(
        `UPDATE issues SET assigned_to=$1 WHERE id=$2 RETURNING *`,
        [user_id, entity_id]
      );
    } else {
      return res.status(400).json({ error: 'Unsupported entity_type' });
    }
    res.json(result.rows[0] || { success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
