// backend/routes/socialWebhook.js
// Meta Webhook endpoint — message, comment, reaction events
// Prompt 147

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const meta    = require('../services/metaService');
const tokens  = require('../services/tokenService');

// ─── Webhook Verification (GET) ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[SocialWebhook] Webhook verified');
    return res.status(200).send(challenge);
  }
  console.warn('[SocialWebhook] Verification failed');
  res.sendStatus(403);
});

// ─── Event Processing (POST) ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  // Always respond 200 immediately
  res.sendStatus(200);

  const body = req.body;
  if (!body?.object) return;

  const io = req.app.get('io');

  try {
    for (const entry of body.entry || []) {
      // ── Facebook Messenger messages ──────────────────────────────────────────
      if (entry.messaging) {
        for (const event of entry.messaging) {
          await handleFBMessagingEvent(entry.id, event, io);
        }
      }

      // ── Page/IG feed changes ─────────────────────────────────────────────────
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // New comment on a post
        if (change.field === 'feed' && value.item === 'comment') {
          await handleFBComment(entry.id, value, io);
        }

        // Instagram messages
        if (change.field === 'messages') {
          await handleIGMessagingEvent(entry.id, value, io);
        }

        // Instagram comments
        if (change.field === 'comments') {
          await handleIGComment(entry.id, value, io);
        }
      }
    }
  } catch (err) {
    console.error('[SocialWebhook] Error:', err.message);
  }
});

// ─── Facebook Messenger Event ─────────────────────────────────────────────────────
async function handleFBMessagingEvent(pageId, event, io) {
  if (!event.message || event.message.is_echo) return;

  const senderId   = event.sender.id;
  const messageId  = event.message.mid;
  const text       = event.message.text || '';
  const attachment = event.message.attachments?.[0];

  // Find the page account
  const accRes = await db.query(
    `SELECT * FROM social_accounts WHERE platform='facebook' AND account_id=$1 AND is_active=true`,
    [pageId]
  );
  if (!accRes.rows.length) {
    console.warn(`[SocialWebhook] No FB account found for page ${pageId}`);
    return;
  }
  const account = accRes.rows[0];

  const content = text || (attachment ? `[${attachment.type}]` : '[empty]');

  // Store message
  await db.query(
    `INSERT INTO social_messages
       (account_id, platform, conversation_id, sender_id, direction, content, message_type, platform_message_id)
     VALUES ($1,'facebook',$2,$3,'inbound',$4,$5,$6)
     ON CONFLICT (platform_message_id) DO NOTHING`,
    [account.id, `fb_${pageId}_${senderId}`, senderId, content, attachment ? attachment.type : 'text', messageId]
  );

  io?.emit('social_message', { platform: 'facebook', accountId: account.id, senderId, content });

  // Process auto-replies
  await processAutoReply(account, 'inbound', content, senderId, 'facebook', io);
}

// ─── Instagram Messaging Event ────────────────────────────────────────────────────
async function handleIGMessagingEvent(igAccountId, value, io) {
  const messages = value.messages || [];
  for (const msg of messages) {
    if (msg.is_echo) continue;
    const senderId  = msg.from?.id || msg.sender?.id;
    const text      = msg.text || '';
    const messageId = msg.id || msg.mid;

    const accRes = await db.query(
      `SELECT * FROM social_accounts WHERE platform='instagram' AND account_id=$1 AND is_active=true`,
      [igAccountId]
    );
    if (!accRes.rows.length) return;
    const account = accRes.rows[0];

    await db.query(
      `INSERT INTO social_messages
         (account_id, platform, conversation_id, sender_id, direction, content, message_type, platform_message_id)
       VALUES ($1,'instagram',$2,$3,'inbound',$4,'text',$5)
       ON CONFLICT (platform_message_id) DO NOTHING`,
      [account.id, `ig_${igAccountId}_${senderId}`, senderId, text, messageId]
    );

    io?.emit('social_message', { platform: 'instagram', accountId: account.id, senderId, content: text });

    await processAutoReply(account, 'inbound', text, senderId, 'instagram', io);
  }
}

// ─── Facebook Comment Event ──────────────────────────────────────────────────────
async function handleFBComment(pageId, value, io) {
  if (value.verb !== 'add') return;

  const accRes = await db.query(
    `SELECT * FROM social_accounts WHERE platform='facebook' AND account_id=$1 AND is_active=true`,
    [pageId]
  );
  if (!accRes.rows.length) return;
  const account = accRes.rows[0];

  await db.query(
    `INSERT INTO social_comments
       (account_id, platform, post_id, comment_id, commenter_id, commenter_name, content)
     VALUES ($1,'facebook',$2,$3,$4,$5,$6)
     ON CONFLICT (comment_id) DO NOTHING`,
    [account.id, value.post_id || value.parent_id, value.comment_id, value.from?.id, value.from?.name, value.message]
  );

  io?.emit('social_comment', { platform: 'facebook', accountId: account.id, commentId: value.comment_id });

  // Auto-reply to comment
  await processAutoReply(account, 'comment', value.message || '', value.comment_id, 'facebook', io);
}

// ─── Instagram Comment Event ──────────────────────────────────────────────────────
async function handleIGComment(igAccountId, value, io) {
  const accRes = await db.query(
    `SELECT * FROM social_accounts WHERE platform='instagram' AND account_id=$1 AND is_active=true`,
    [igAccountId]
  );
  if (!accRes.rows.length) return;
  const account = accRes.rows[0];

  await db.query(
    `INSERT INTO social_comments
       (account_id, platform, post_id, comment_id, commenter_id, commenter_name, content)
     VALUES ($1,'instagram',$2,$3,$4,$5,$6)
     ON CONFLICT (comment_id) DO NOTHING`,
    [account.id, value.media?.id, value.id, value.from?.id, value.from?.username, value.text]
  );

  io?.emit('social_comment', { platform: 'instagram', accountId: account.id, commentId: value.id });

  await processAutoReply(account, 'comment', value.text || '', value.id, 'instagram', io);
}

// ─── Auto-Reply Engine ────────────────────────────────────────────────────────────
async function processAutoReply(account, eventType, messageText, targetId, platform, io) {
  try {
    const rules = (await db.query(
      `SELECT * FROM social_auto_replies
       WHERE account_id=$1 AND is_active=true
         AND (trigger_type='new_message' OR trigger_type='comment' OR trigger_type='keyword')
       ORDER BY trigger_type`,
      [account.id]
    )).rows;

    for (const rule of rules) {
      let matches = false;

      if (rule.trigger_type === 'new_message' && eventType === 'inbound') {
        matches = true;
      } else if (rule.trigger_type === 'comment' && eventType === 'comment') {
        matches = true;
      } else if (rule.trigger_type === 'keyword' && rule.keyword) {
        matches = messageText.toLowerCase().includes(rule.keyword.toLowerCase());
      }

      if (matches) {
        try {
          if (eventType === 'comment') {
            await meta.replyToComment(targetId, account.access_token, rule.reply_text);
            await db.query(
              `UPDATE social_comments SET replied=true, reply_content=$1, replied_at=NOW() WHERE comment_id=$2`,
              [rule.reply_text, targetId]
            );
          } else if (platform === 'facebook') {
            await meta.sendFBMessage(account.access_token, targetId, rule.reply_text);
          } else if (platform === 'instagram') {
            await meta.sendIGMessage(account.account_id, account.access_token, targetId, rule.reply_text);
          }

          await db.query(
            `UPDATE social_auto_replies SET match_count=match_count+1 WHERE id=$1`,
            [rule.id]
          );

          // Only fire first matching rule per message
          break;
        } catch (err) {
          console.error(`[SocialWebhook] Auto-reply failed for rule ${rule.id}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error('[SocialWebhook] Auto-reply engine error:', err.message);
  }
}

module.exports = router;
