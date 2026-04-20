// backend/services/tokenService.js
// Token lifecycle management — store, validate, refresh, reconnect alerts
// Prompt 144

const db = require('../db');
const { debugToken, refreshLongLivedToken } = require('./metaService');

// Token expiry fallback: 60 days in milliseconds
const DEFAULT_TOKEN_EXPIRY_MS = 60 * 24 * 60 * 60 * 1000;


async function saveToken({ platform, accountId, accountName, username, accessToken, tokenType = 'page',
  expiresAt = null, scopes = null, profilePictureUrl = null, fbPageId = null }) {
  const result = await db.query(
    `INSERT INTO social_accounts
       (platform, account_id, account_name, username, access_token, token_type,
        expires_at, scopes, profile_picture_url, fb_page_id, last_refreshed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT (platform, account_id) DO UPDATE SET
       account_name        = EXCLUDED.account_name,
       username            = EXCLUDED.username,
       access_token        = EXCLUDED.access_token,
       token_type          = EXCLUDED.token_type,
       expires_at          = EXCLUDED.expires_at,
       scopes              = EXCLUDED.scopes,
       profile_picture_url = EXCLUDED.profile_picture_url,
       fb_page_id          = EXCLUDED.fb_page_id,
       last_refreshed_at   = NOW(),
       is_active           = TRUE,
       error_message       = NULL
     RETURNING *`,
    [platform, accountId, accountName, username, accessToken, tokenType,
     expiresAt, scopes, profilePictureUrl, fbPageId]
  );
  return result.rows[0];
}

// ─── Get token for an account ────────────────────────────────────────────────────
async function getToken(accountDbId) {
  const res = await db.query(
    `SELECT * FROM social_accounts WHERE id=$1 AND is_active=true`,
    [accountDbId]
  );
  return res.rows[0] || null;
}

// ─── Get all active accounts ──────────────────────────────────────────────────────
async function getActiveAccounts(platform = null) {
  const q = platform
    ? `SELECT * FROM social_accounts WHERE is_active=true AND platform=$1 ORDER BY created_at`
    : `SELECT * FROM social_accounts WHERE is_active=true ORDER BY platform, created_at`;
  const res = await db.query(q, platform ? [platform] : []);
  return res.rows;
}

// ─── Validate token via Graph API debug_token ─────────────────────────────────────
async function validateToken(accountDbId) {
  const account = await getToken(accountDbId);
  if (!account) return { valid: false, reason: 'Account not found' };

  try {
    const info = await debugToken(account.access_token);
    if (!info?.is_valid) {
      await markTokenError(accountDbId, 'Token invalid according to Meta debug_token');
      return { valid: false, reason: 'Token marked invalid by Meta', info };
    }
    // Update expires_at if we got fresh info
    if (info.expires_at && info.expires_at !== 0) {
      const expiresAt = new Date(info.expires_at * 1000);
      await db.query(
        `UPDATE social_accounts SET expires_at=$1 WHERE id=$2`,
        [expiresAt, accountDbId]
      );
    }
    return {
      valid: true,
      scopes: info.scopes || [],
      expiresAt: info.expires_at ? new Date(info.expires_at * 1000) : null,
      info,
    };
  } catch (err) {
    await markTokenError(accountDbId, err.message);
    return { valid: false, reason: err.message };
  }
}

// ─── Attempt to refresh a token ───────────────────────────────────────────────────
async function refreshToken(accountDbId) {
  const account = await getToken(accountDbId);
  if (!account) throw new Error('Account not found');

  // Page tokens derived from long-lived user tokens don't expire
  // Only user tokens (type='user') need refresh
  if (account.token_type === 'page') {
    return { refreshed: false, reason: 'Page tokens do not expire and cannot be refreshed via API' };
  }

  try {
    const result = await refreshLongLivedToken(account.access_token);
    const expiresAt = result.expires_in
      ? new Date(Date.now() + result.expires_in * 1000)
      : new Date(Date.now() + DEFAULT_TOKEN_EXPIRY_MS);

    await db.query(
      `UPDATE social_accounts
       SET access_token=$1, expires_at=$2, last_refreshed_at=NOW(), error_message=NULL
       WHERE id=$3`,
      [result.access_token, expiresAt, accountDbId]
    );
    console.log(`[Token] Refreshed token for account ${accountDbId}`);
    return { refreshed: true, expiresAt };
  } catch (err) {
    await markTokenError(accountDbId, `Refresh failed: ${err.message}`);
    throw err;
  }
}

// ─── Mark an account's token as errored ──────────────────────────────────────────
async function markTokenError(accountDbId, message) {
  await db.query(
    `UPDATE social_accounts SET error_message=$1, is_active=false WHERE id=$2`,
    [message, accountDbId]
  );
}

// ─── Check and refresh expiring tokens (called by cron) ──────────────────────────
async function checkAndRefreshTokens() {
  // Find user tokens expiring within 7 days
  const res = await db.query(
    `SELECT * FROM social_accounts
     WHERE is_active=true
       AND token_type='user'
       AND expires_at IS NOT NULL
       AND expires_at < NOW() + INTERVAL '7 days'`
  );

  for (const account of res.rows) {
    try {
      await refreshToken(account.id);
    } catch (err) {
      console.error(`[Token] Could not refresh ${account.platform}/${account.account_name}: ${err.message}`);
    }
  }

  // Flag any expired tokens
  await db.query(
    `UPDATE social_accounts
     SET is_active=false, error_message='Token expired — please reconnect your account'
     WHERE is_active=true
       AND expires_at IS NOT NULL
       AND expires_at < NOW()`
  );

  const expiredCount = (await db.query(
    `SELECT COUNT(*) FROM social_accounts WHERE is_active=false AND error_message LIKE 'Token expired%'`
  )).rows[0].count;

  if (parseInt(expiredCount) > 0) {
    console.warn(`[Token] ${expiredCount} social account(s) have expired tokens`);
  }
}

module.exports = {
  saveToken,
  getToken,
  getActiveAccounts,
  validateToken,
  refreshToken,
  markTokenError,
  checkAndRefreshTokens,
};
