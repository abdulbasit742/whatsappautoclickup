// backend/routes/social.js
// All Meta social integration routes — Prompts 141-160
// OAuth (FB+IG), page/account sync, messages, comments, scheduler, analytics, auto-replies, scopes

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');
const meta    = require('../services/metaService');
const tokens  = require('../services/tokenService');

// All routes require owner auth except OAuth callbacks (which redirect)
const OAUTH_SCOPES = meta.REQUIRED_SCOPES.join(',');

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 141/142 — Facebook OAuth
// ─────────────────────────────────────────────────────────────────────────────────

// Step 1: Initiate Facebook OAuth (redirect to Meta)
router.get('/auth/facebook', auth, (req, res) => {
  const state = Buffer.from(JSON.stringify({ ts: Date.now(), source: 'facebook' })).toString('base64');
  const redirectUri = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`}/api/social/auth/facebook/callback`;
  const url = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  url.searchParams.set('client_id',     process.env.META_APP_ID);
  url.searchParams.set('redirect_uri',  redirectUri);
  url.searchParams.set('state',         state);
  url.searchParams.set('scope',         OAUTH_SCOPES);
  url.searchParams.set('response_type', 'code');
  res.json({ url: url.toString(), redirectUri });
});

// Step 2: Facebook OAuth Callback
router.get('/auth/facebook/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (oauthError) {
    return res.redirect(`${frontendUrl}/social/accounts?error=${encodeURIComponent(oauthError)}`);
  }

  // State validation
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    if (!stateData.ts || Date.now() - stateData.ts > 10 * 60 * 1000) {
      throw new Error('OAuth state expired');
    }
  } catch {
    return res.redirect(`${frontendUrl}/social/accounts?error=invalid_state`);
  }

  try {
    const redirectUri = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`}/api/social/auth/facebook/callback`;

    // Exchange code → short-lived user token
    const shortToken = await meta.exchangeCodeForToken(code, redirectUri);

    // Exchange → long-lived token (60 days)
    const longToken = await meta.exchangeForLongLivedToken(shortToken.access_token);
    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000)
      : null;

    // Get user profile
    const profile = await meta.getUserProfile(longToken.access_token);

    // Save user token
    await tokens.saveToken({
      platform:    'facebook',
      accountId:   profile.id,
      accountName: profile.name,
      username:    profile.email || profile.name,
      accessToken: longToken.access_token,
      tokenType:   'user',
      expiresAt,
    });

    // Auto-sync pages
    const pages = await meta.getPages(longToken.access_token);
    for (const page of pages) {
      await tokens.saveToken({
        platform:           'facebook',
        accountId:          page.id,
        accountName:        page.name,
        accessToken:        page.access_token,
        tokenType:          'page',
        expiresAt:          null, // page tokens don't expire
        profilePictureUrl:  page.picture?.data?.url || null,
      });
    }

    res.redirect(`${frontendUrl}/social/accounts?connected=facebook&pages=${pages.length}`);
  } catch (err) {
    console.error('[Social] FB OAuth error:', err.message);
    res.redirect(`${frontendUrl}/social/accounts?error=${encodeURIComponent(err.message)}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 143 — Instagram OAuth
// ─────────────────────────────────────────────────────────────────────────────────

// Initiate Instagram OAuth (same Meta OAuth, just triggers IG scope)
router.get('/auth/instagram', auth, (req, res) => {
  const state = Buffer.from(JSON.stringify({ ts: Date.now(), source: 'instagram' })).toString('base64');
  const redirectUri = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`}/api/social/auth/instagram/callback`;
  const url = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  url.searchParams.set('client_id',     process.env.META_APP_ID);
  url.searchParams.set('redirect_uri',  redirectUri);
  url.searchParams.set('state',         state);
  url.searchParams.set('scope',         OAUTH_SCOPES);
  url.searchParams.set('response_type', 'code');
  res.json({ url: url.toString(), redirectUri });
});

// Instagram OAuth Callback — syncs IG business accounts linked to FB pages
router.get('/auth/instagram/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (oauthError) {
    return res.redirect(`${frontendUrl}/social/accounts?error=${encodeURIComponent(oauthError)}`);
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    if (!stateData.ts || Date.now() - stateData.ts > 10 * 60 * 1000) throw new Error('State expired');
  } catch {
    return res.redirect(`${frontendUrl}/social/accounts?error=invalid_state`);
  }

  try {
    const redirectUri = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`}/api/social/auth/instagram/callback`;
    const shortToken  = await meta.exchangeCodeForToken(code, redirectUri);
    const longToken   = await meta.exchangeForLongLivedToken(shortToken.access_token);

    const pages = await meta.getPages(longToken.access_token);
    let igCount = 0;

    for (const page of pages) {
      // Save FB page token too
      await tokens.saveToken({
        platform:    'facebook',
        accountId:   page.id,
        accountName: page.name,
        accessToken: page.access_token,
        tokenType:   'page',
        expiresAt:   null,
      });

      // Fetch linked IG account
      try {
        const igAccount = await meta.getInstagramAccount(page.id, page.access_token);
        if (igAccount) {
          await tokens.saveToken({
            platform:           'instagram',
            accountId:          igAccount.id,
            accountName:        igAccount.name || igAccount.username,
            username:           igAccount.username,
            accessToken:        page.access_token, // IG uses FB page token
            tokenType:          'page',
            expiresAt:          null,
            profilePictureUrl:  igAccount.profile_picture_url || null,
            fbPageId:           page.id,
          });
          igCount++;
        }
      } catch (err) {
        console.warn(`[Social] No IG account for page ${page.name}: ${err.message}`);
      }
    }

    res.redirect(`${frontendUrl}/social/accounts?connected=instagram&ig_accounts=${igCount}`);
  } catch (err) {
    console.error('[Social] IG OAuth error:', err.message);
    res.redirect(`${frontendUrl}/social/accounts?error=${encodeURIComponent(err.message)}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 144/152 — Token Management & Account Manager
// ─────────────────────────────────────────────────────────────────────────────────

// List all connected social accounts
router.get('/accounts', auth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT id, platform, account_id, account_name, username, token_type,
              expires_at, last_refreshed_at, scopes, profile_picture_url,
              fb_page_id, is_active, error_message, created_at
       FROM social_accounts ORDER BY platform, created_at`
    );
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect a social account
router.delete('/accounts/:id', auth, async (req, res) => {
  try {
    await db.query(`DELETE FROM social_accounts WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually refresh a token
router.post('/accounts/:id/refresh', auth, async (req, res) => {
  try {
    const result = await tokens.refreshToken(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Validate a token
router.get('/accounts/:id/validate', auth, async (req, res) => {
  try {
    const result = await tokens.validateToken(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 145/146 — Facebook Page & Instagram Account Sync
// ─────────────────────────────────────────────────────────────────────────────────

// Sync Facebook pages (re-fetch from Meta)
router.post('/pages/sync', auth, async (req, res) => {
  try {
    const userAccounts = await db.query(
      `SELECT * FROM social_accounts WHERE platform='facebook' AND token_type='user' AND is_active=true`
    );
    if (!userAccounts.rows.length) {
      return res.status(400).json({ error: 'No connected Facebook user account. Please connect Facebook first.' });
    }
    const userToken = userAccounts.rows[0].access_token;
    const pages = await meta.getPages(userToken);
    for (const page of pages) {
      await tokens.saveToken({
        platform:           'facebook',
        accountId:          page.id,
        accountName:        page.name,
        accessToken:        page.access_token,
        tokenType:          'page',
        profilePictureUrl:  page.picture?.data?.url || null,
      });
    }
    res.json({ synced: pages.length, pages: pages.map(p => ({ id: p.id, name: p.name })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync Instagram accounts
router.post('/instagram/sync', auth, async (req, res) => {
  try {
    const fbPages = await db.query(
      `SELECT * FROM social_accounts WHERE platform='facebook' AND token_type='page' AND is_active=true`
    );
    let igCount = 0;
    const results = [];
    for (const page of fbPages.rows) {
      try {
        const igAccount = await meta.getInstagramAccount(page.account_id, page.access_token);
        if (igAccount) {
          await tokens.saveToken({
            platform:           'instagram',
            accountId:          igAccount.id,
            accountName:        igAccount.name || igAccount.username,
            username:           igAccount.username,
            accessToken:        page.access_token,
            tokenType:          'page',
            profilePictureUrl:  igAccount.profile_picture_url || null,
            fbPageId:           page.account_id,
          });
          igCount++;
          results.push({ pageId: page.account_id, pageName: page.account_name, igUsername: igAccount.username });
        }
      } catch (err) {
        console.warn(`[Social] IG sync failed for page ${page.account_name}: ${err.message}`);
      }
    }
    res.json({ synced: igCount, accounts: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 148/149/150 — Message Fetching & Sending
// ─────────────────────────────────────────────────────────────────────────────────

// Get all social conversations (FB + IG)
router.get('/conversations', auth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT DISTINCT ON (conversation_id)
         sm.conversation_id, sm.platform, sm.account_id, sm.sender_name,
         sm.content AS last_message, sm.created_at, sm.is_read,
         sa.account_name, sa.username
       FROM social_messages sm
       JOIN social_accounts sa ON sa.id = sm.account_id
       ORDER BY conversation_id, sm.created_at DESC`
    );
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', auth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM social_messages WHERE conversation_id=$1 ORDER BY created_at ASC`,
      [req.params.conversationId]
    );
    // Mark as read
    await db.query(
      `UPDATE social_messages SET is_read=true WHERE conversation_id=$1 AND direction='inbound'`,
      [req.params.conversationId]
    );
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync messages from Meta for a specific account
router.post('/accounts/:id/sync-messages', auth, async (req, res) => {
  try {
    const account = await tokens.getToken(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    let synced = 0;
    if (account.platform === 'facebook') {
      const convs = await meta.getFBConversations(account.account_id, account.access_token);
      for (const conv of convs) {
        const msgs = await meta.getFBMessages(conv.id, account.access_token);
        for (const msg of msgs) {
          const participants = conv.participants?.data || [];
          const pageParticipant = participants.find(p => p.id === account.account_id);
          const senderParticipant = participants.find(p => p.id !== account.account_id);
          const direction = msg.from?.id === account.account_id ? 'outbound' : 'inbound';
          await db.query(
            `INSERT INTO social_messages
               (account_id, platform, conversation_id, sender_id, sender_name, direction, content, message_type, platform_message_id)
             VALUES ($1,'facebook',$2,$3,$4,$5,$6,'text',$7)
             ON CONFLICT (platform_message_id) DO NOTHING`,
            [account.id, conv.id, msg.from?.id, msg.from?.name, direction, msg.message || '', msg.id]
          );
          synced++;
        }
      }
    } else if (account.platform === 'instagram') {
      const convs = await meta.getIGConversations(account.account_id, account.access_token);
      for (const conv of convs) {
        const msgs = await meta.getIGMessages(conv.id, account.access_token);
        for (const msg of msgs) {
          const direction = msg.from?.id === account.account_id ? 'outbound' : 'inbound';
          await db.query(
            `INSERT INTO social_messages
               (account_id, platform, conversation_id, sender_id, sender_name, direction, content, message_type, platform_message_id)
             VALUES ($1,'instagram',$2,$3,$4,$5,$6,'text',$7)
             ON CONFLICT (platform_message_id) DO NOTHING`,
            [account.id, conv.id, msg.from?.id, msg.from?.username || msg.from?.name, direction, msg.text || msg.message || '', msg.id]
          );
          synced++;
        }
      }
    }

    res.json({ synced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message via Facebook or Instagram
router.post('/messages/send', auth, async (req, res) => {
  const { accountId, recipientId, message, attachmentUrl } = req.body;
  if (!accountId || !recipientId || (!message && !attachmentUrl)) {
    return res.status(400).json({ error: 'accountId, recipientId, and message are required' });
  }
  try {
    const account = await tokens.getToken(accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    let result;
    if (account.platform === 'facebook') {
      result = await meta.sendFBMessage(account.access_token, recipientId, message, attachmentUrl);
    } else if (account.platform === 'instagram') {
      result = await meta.sendIGMessage(account.account_id, account.access_token, recipientId, message);
    } else {
      return res.status(400).json({ error: 'Unknown platform' });
    }

    // Save outbound message
    await db.query(
      `INSERT INTO social_messages (account_id, platform, sender_id, direction, content, platform_message_id)
       VALUES ($1,$2,$3,'outbound',$4,$5)`,
      [accountId, account.platform, account.account_id, message, result?.message_id || null]
    );

    // Check auto-reply rules for new messages (triggered from outbound is skipped — inbound only)
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 158 — Comment Handling
// ─────────────────────────────────────────────────────────────────────────────────

// Get comments (from DB)
router.get('/comments', auth, async (req, res) => {
  try {
    const { accountId, replied } = req.query;
    let q = `SELECT sc.*, sa.account_name, sa.platform
             FROM social_comments sc
             JOIN social_accounts sa ON sa.id = sc.account_id
             WHERE 1=1`;
    const params = [];
    if (accountId) { q += ` AND sc.account_id=$${params.length + 1}`; params.push(accountId); }
    if (replied !== undefined) { q += ` AND sc.replied=$${params.length + 1}`; params.push(replied === 'true'); }
    q += ` ORDER BY sc.created_at DESC LIMIT 100`;
    const rows = await db.query(q, params);
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync comments for a post
router.post('/accounts/:id/sync-comments', auth, async (req, res) => {
  const { postId } = req.body;
  if (!postId) return res.status(400).json({ error: 'postId is required' });
  try {
    const account = await tokens.getToken(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const comments = await meta.getFBComments(postId, account.access_token);
    let saved = 0;
    for (const c of comments) {
      await db.query(
        `INSERT INTO social_comments (account_id, platform, post_id, comment_id, commenter_id, commenter_name, content)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (comment_id) DO NOTHING`,
        [account.id, account.platform, postId, c.id, c.from?.id, c.from?.name, c.message]
      );
      saved++;
    }
    res.json({ synced: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reply to a comment
router.post('/comments/:commentId/reply', auth, async (req, res) => {
  const { message, accountId } = req.body;
  if (!message || !accountId) return res.status(400).json({ error: 'message and accountId are required' });
  try {
    const account = await tokens.getToken(accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const result = await meta.replyToComment(req.params.commentId, account.access_token, message);
    await db.query(
      `UPDATE social_comments SET replied=true, reply_content=$1, replied_at=NOW() WHERE comment_id=$2`,
      [message, req.params.commentId]
    );
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 159 — Social Media Scheduler
// ─────────────────────────────────────────────────────────────────────────────────

// List scheduled/draft posts
router.get('/posts', auth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT sp.*, sa.account_name, sa.username
       FROM social_posts sp
       JOIN social_accounts sa ON sa.id = sp.account_id
       ORDER BY sp.created_at DESC`
    );
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a scheduled post
router.post('/posts', auth, async (req, res) => {
  const { accountId, content, mediaUrl, scheduledAt } = req.body;
  if (!accountId || !content) return res.status(400).json({ error: 'accountId and content are required' });
  try {
    const account = await tokens.getToken(accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const status = scheduledAt ? 'scheduled' : 'draft';
    const row = await db.query(
      `INSERT INTO social_posts (account_id, platform, content, media_url, status, scheduled_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [accountId, account.platform, content, mediaUrl || null, status, scheduledAt || null]
    );
    res.json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Publish a post immediately
router.post('/posts/:id/publish', auth, async (req, res) => {
  try {
    const post = (await db.query(`SELECT * FROM social_posts WHERE id=$1`, [req.params.id])).rows[0];
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const account = await tokens.getToken(post.account_id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    let platformPostId;
    if (account.platform === 'facebook') {
      const result = await meta.publishFBPost(account.account_id, account.access_token, post.content, post.media_url);
      platformPostId = result.id;
    } else if (account.platform === 'instagram') {
      if (!post.media_url) return res.status(400).json({ error: 'Instagram posts require a media_url (image URL)' });
      const result = await meta.publishIGPost(account.account_id, account.access_token, post.media_url, post.content);
      platformPostId = result.id;
    }

    await db.query(
      `UPDATE social_posts SET status='published', published_at=NOW(), platform_post_id=$1 WHERE id=$2`,
      [platformPostId, req.params.id]
    );
    res.json({ success: true, platformPostId });
  } catch (err) {
    await db.query(`UPDATE social_posts SET status='failed', error_message=$1 WHERE id=$2`, [err.message, req.params.id]);
    res.status(500).json({ error: err.message });
  }
});

// Delete a post
router.delete('/posts/:id', auth, async (req, res) => {
  try {
    await db.query(`DELETE FROM social_posts WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 156 — Social Analytics
// ─────────────────────────────────────────────────────────────────────────────────

router.get('/analytics', auth, async (req, res) => {
  try {
    const [msgStats, commentStats, postStats, accountStats, replyRate] = await Promise.all([
      db.query(
        `SELECT platform,
                COUNT(*) FILTER (WHERE direction='inbound')  AS received,
                COUNT(*) FILTER (WHERE direction='outbound') AS sent,
                COUNT(*) FILTER (WHERE is_read=false AND direction='inbound') AS unread
         FROM social_messages
         GROUP BY platform`
      ),
      db.query(
        `SELECT platform,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE replied=true) AS replied
         FROM social_comments GROUP BY platform`
      ),
      db.query(
        `SELECT platform, status, COUNT(*) AS count
         FROM social_posts GROUP BY platform, status`
      ),
      db.query(
        `SELECT platform, COUNT(*) AS count, COUNT(*) FILTER (WHERE is_active=true) AS active
         FROM social_accounts GROUP BY platform`
      ),
      db.query(
        `SELECT ROUND(
           100.0 * COUNT(*) FILTER (WHERE replied=true) / NULLIF(COUNT(*), 0)
         , 1) AS comment_reply_rate FROM social_comments`
      ),
    ]);

    // Per-platform insight data (if API keys configured)
    const accounts = (await db.query(
      `SELECT * FROM social_accounts WHERE is_active=true AND token_type='page'`
    )).rows;

    const insights = [];
    for (const acc of accounts.slice(0, 3)) { // limit to avoid rate limits
      try {
        if (acc.platform === 'facebook') {
          const data = await meta.getPageInsights(acc.account_id, acc.access_token);
          insights.push({ accountId: acc.id, name: acc.account_name, platform: 'facebook', metrics: data });
        } else if (acc.platform === 'instagram') {
          const data = await meta.getIGInsights(acc.account_id, acc.access_token);
          insights.push({ accountId: acc.id, name: acc.account_name, platform: 'instagram', metrics: data });
        }
      } catch {
        // skip if insights not available
      }
    }

    res.json({
      messages:       msgStats.rows,
      comments:       commentStats.rows,
      posts:          postStats.rows,
      accounts:       accountStats.rows,
      commentReplyRate: replyRate.rows[0]?.comment_reply_rate || 0,
      insights,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 157 — Auto-Reply Rules
// ─────────────────────────────────────────────────────────────────────────────────

router.get('/auto-replies', auth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT ar.*, sa.account_name, sa.platform
       FROM social_auto_replies ar
       JOIN social_accounts sa ON sa.id = ar.account_id
       ORDER BY ar.created_at DESC`
    );
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auto-replies', auth, async (req, res) => {
  const { accountId, triggerType, keyword, replyText } = req.body;
  if (!accountId || !triggerType || !replyText) {
    return res.status(400).json({ error: 'accountId, triggerType, and replyText are required' });
  }
  try {
    const row = await db.query(
      `INSERT INTO social_auto_replies (account_id, trigger_type, keyword, reply_text)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [accountId, triggerType, keyword || null, replyText]
    );
    res.json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/auto-replies/:id', auth, async (req, res) => {
  const { triggerType, keyword, replyText, isActive } = req.body;
  try {
    const row = await db.query(
      `UPDATE social_auto_replies
       SET trigger_type=$1, keyword=$2, reply_text=$3, is_active=$4
       WHERE id=$5 RETURNING *`,
      [triggerType, keyword || null, replyText, isActive !== false, req.params.id]
    );
    res.json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/auto-replies/:id', auth, async (req, res) => {
  try {
    await db.query(`DELETE FROM social_auto_replies WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 153 — Permission & Scopes Manager
// ─────────────────────────────────────────────────────────────────────────────────

router.get('/scopes/:accountId', auth, async (req, res) => {
  try {
    const account = await tokens.getToken(req.params.accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    let grantedScopes = [];
    try {
      const info = await meta.debugToken(account.access_token);
      grantedScopes = info?.scopes || [];
    } catch {
      if (account.scopes) grantedScopes = account.scopes.split(',').map(s => s.trim());
    }

    const missingScopes = meta.REQUIRED_SCOPES.filter(s => !grantedScopes.includes(s));
    res.json({ granted: grantedScopes, missing: missingScopes, required: meta.REQUIRED_SCOPES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get reauthorize URL
router.get('/scopes/:accountId/reauthorize', auth, (req, res) => {
  const redirectUri = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`}/api/social/auth/facebook/callback`;
  const state = Buffer.from(JSON.stringify({ ts: Date.now(), reauth: true })).toString('base64');
  const url = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  url.searchParams.set('client_id',     process.env.META_APP_ID);
  url.searchParams.set('redirect_uri',  redirectUri);
  url.searchParams.set('state',         state);
  url.searchParams.set('scope',         OAUTH_SCOPES);
  url.searchParams.set('auth_type',     'rerequest');
  url.searchParams.set('response_type', 'code');
  res.json({ url: url.toString() });
});

// ─────────────────────────────────────────────────────────────────────────────────
// PROMPT 154/155 — Error Status endpoint
// ─────────────────────────────────────────────────────────────────────────────────

router.get('/health', auth, async (req, res) => {
  try {
    const issues = (await db.query(
      `SELECT id, platform, account_name, is_active, error_message, expires_at
       FROM social_accounts
       WHERE is_active=false OR (expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '7 days')`
    )).rows;

    const healthy = (await db.query(
      `SELECT COUNT(*) FROM social_accounts WHERE is_active=true`
    )).rows[0].count;

    res.json({
      healthyAccounts: parseInt(healthy),
      issues: issues.map(a => ({
        id:           a.id,
        platform:     a.platform,
        accountName:  a.account_name,
        isActive:     a.is_active,
        error:        a.error_message,
        expiresAt:    a.expires_at,
        action:       a.error_message?.includes('expired') ? 'reconnect' : 'refresh',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
