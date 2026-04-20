const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── List pending invites ────────────────────────────────────────────────────
router.get('/:orgId/invites', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, u.full_name AS invited_by_name
       FROM org_invites i
       LEFT JOIN users u ON u.id = i.invited_by
       WHERE i.org_id = $1
       ORDER BY i.created_at DESC`,
      [req.params.orgId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Send invite ─────────────────────────────────────────────────────────────
router.post('/:orgId/invites', auth, async (req, res) => {
  const { email, role = 'member' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    // check seat limit
    const { rows: [sub] } = await db.query(
      `SELECT s.seat_limit FROM org_subscriptions os
       JOIN subscription_plans s ON s.id = os.plan_id
       WHERE os.org_id = $1 AND os.status IN ('trialing','active')
       ORDER BY os.created_at DESC LIMIT 1`,
      [req.params.orgId]
    );
    const seatLimit = sub ? sub.seat_limit : 2;
    if (seatLimit !== -1) {
      const { rows: [usage] } = await db.query(
        `SELECT COUNT(*) AS used FROM org_members WHERE org_id = $1`,
        [req.params.orgId]
      );
      const pendingCount = await db.query(
        `SELECT COUNT(*) AS cnt FROM org_invites WHERE org_id=$1 AND status='pending'`,
        [req.params.orgId]
      );
      const total = parseInt(usage.used) + parseInt(pendingCount.rows[0].cnt);
      if (total >= seatLimit) {
        return res.status(403).json({ error: 'Seat limit reached. Please upgrade your plan.' });
      }
    }
    // upsert invite
    const token = crypto.randomBytes(32).toString('hex');
    const { rows: [invite] } = await db.query(
      `INSERT INTO org_invites (org_id, invited_by, email, role, token)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [req.params.orgId, req.user?.id || null, email, role, token]
    );
    if (!invite) return res.status(409).json({ error: 'Invite already pending for this email' });
    res.status(201).json({ invite, invite_link: `${process.env.FRONTEND_URL}/invite/${token}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Accept invite ────────────────────────────────────────────────────────────
router.post('/invites/accept/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const { rows: [invite] } = await db.query(
      `SELECT * FROM org_invites WHERE token = $1`,
      [token]
    );
    if (!invite) return res.status(404).json({ error: 'Invalid invite link' });
    if (invite.status !== 'pending') return res.status(400).json({ error: `Invite is ${invite.status}` });
    if (new Date(invite.expires_at) < new Date()) {
      await db.query(`UPDATE org_invites SET status='expired' WHERE id=$1`, [invite.id]);
      return res.status(400).json({ error: 'Invite has expired' });
    }
    res.json({ invite, org_id: invite.org_id, email: invite.email, role: invite.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Resend invite ────────────────────────────────────────────────────────────
router.post('/:orgId/invites/:inviteId/resend', auth, async (req, res) => {
  try {
    const newToken = crypto.randomBytes(32).toString('hex');
    const { rows: [invite] } = await db.query(
      `UPDATE org_invites SET token=$1, status='pending', expires_at=NOW()+INTERVAL '7 days'
       WHERE id=$2 AND org_id=$3
       RETURNING *`,
      [newToken, req.params.inviteId, req.params.orgId]
    );
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    res.json({ invite, invite_link: `${process.env.FRONTEND_URL}/invite/${newToken}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Revoke invite ────────────────────────────────────────────────────────────
router.delete('/:orgId/invites/:inviteId', auth, async (req, res) => {
  try {
    await db.query(
      `UPDATE org_invites SET status='revoked' WHERE id=$1 AND org_id=$2`,
      [req.params.inviteId, req.params.orgId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get org members ─────────────────────────────────────────────────────────
router.get('/:orgId/members', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.email, u.full_name, u.avatar_url
       FROM org_members m JOIN users u ON u.id = m.user_id
       WHERE m.org_id = $1 ORDER BY m.joined_at ASC`,
      [req.params.orgId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Seat usage summary ───────────────────────────────────────────────────────
router.get('/:orgId/seats', auth, async (req, res) => {
  try {
    const [membersRes, pendingRes, planRes] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM org_members WHERE org_id=$1`, [req.params.orgId]),
      db.query(`SELECT COUNT(*) FROM org_invites WHERE org_id=$1 AND status='pending'`, [req.params.orgId]),
      db.query(
        `SELECT s.seat_limit, s.name AS plan_name FROM org_subscriptions os
         JOIN subscription_plans s ON s.id = os.plan_id
         WHERE os.org_id=$1 AND os.status IN ('trialing','active')
         ORDER BY os.created_at DESC LIMIT 1`,
        [req.params.orgId]
      ),
    ]);
    const used = parseInt(membersRes.rows[0].count);
    const pending = parseInt(pendingRes.rows[0].count);
    const seatLimit = planRes.rows[0]?.seat_limit ?? 2;
    const planName  = planRes.rows[0]?.plan_name ?? 'Free';
    res.json({
      total: seatLimit === -1 ? 'unlimited' : seatLimit,
      used,
      pending,
      available: seatLimit === -1 ? 'unlimited' : Math.max(0, seatLimit - used - pending),
      at_limit: seatLimit !== -1 && (used + pending) >= seatLimit,
      plan_name: planName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List orgs for user ──────────────────────────────────────────────────────
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.*, m.role FROM org_members m JOIN organizations o ON o.id = m.org_id
       WHERE m.user_id = $1 ORDER BY o.name`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Switch active org ───────────────────────────────────────────────────────
router.post('/user/:userId/switch', auth, async (req, res) => {
  const { org_id } = req.body;
  try {
    const { rows: [membership] } = await db.query(
      `SELECT * FROM org_members WHERE user_id=$1 AND org_id=$2`,
      [req.params.userId, org_id]
    );
    if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    await db.query(`UPDATE users SET active_org_id=$1 WHERE id=$2`, [org_id, req.params.userId]);
    res.json({ active_org_id: org_id, role: membership.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
