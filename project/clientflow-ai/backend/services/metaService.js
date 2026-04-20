// backend/services/metaService.js
// Meta Graph API integration — rate-limit handling, token exchange, messaging, posts, comments, analytics
// Prompts 141-160

const axios = require('axios');

const GRAPH_BASE = 'https://graph.facebook.com/v18.0';
const REQUIRED_SCOPES = [
  'pages_manage_metadata',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_messaging',
  'instagram_basic',
  'instagram_manage_messages',
  'instagram_manage_comments',
  'instagram_content_publish',
  'public_profile',
  'email',
];

const ALLOWED_GRAPH_HOSTS = ['graph.facebook.com', 'www.facebook.com'];

// ─── Rate-Limit-Aware Request ────────────────────────────────────────────────────
async function makeGraphRequest({ method = 'GET', path, params = {}, data = {}, token, retries = 3 }) {
  // Build the full URL — only allow requests to Meta's Graph API (SSRF protection)
  let url;
  if (path.startsWith('http')) {
    const parsed = new URL(path);
    if (!ALLOWED_GRAPH_HOSTS.includes(parsed.hostname)) {
      return { data: null, error: { type: 'invalid_host', message: `Disallowed host: ${parsed.hostname}` } };
    }
    url = path;
  } else {
    url = `${GRAPH_BASE}${path}`;
  }

  // Build params — keep access_token out of URLs for GET by injecting directly into params
  const requestParams = { ...params };
  if (token) requestParams.access_token = token;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const config = {
        method,
        url,
        params: requestParams,
        data: method !== 'GET' ? data : undefined,
        timeout: 15000,
      };
      const res = await axios(config);
      return { data: res.data, error: null };
    } catch (err) {
      const status = err.response?.status;
      const fbErr  = err.response?.data?.error;

      // Rate limit — wait and retry
      if (status === 429 || fbErr?.code === 4 || fbErr?.code === 17 || fbErr?.code === 32) {
        const waitMs = Math.pow(2, attempt) * 1000;
        console.warn(`[Meta] Rate limited. Retrying in ${waitMs}ms (attempt ${attempt}/${retries})`);
        await sleep(waitMs);
        continue;
      }

      // Token expired / invalid
      if (fbErr?.code === 190) {
        return { data: null, error: { type: 'token_expired', message: fbErr.message, code: 190 } };
      }

      // Permission denied
      if (status === 403 || fbErr?.code === 200 || fbErr?.code === 10) {
        return { data: null, error: { type: 'permission_denied', message: fbErr?.message || 'Permission denied', code: fbErr?.code } };
      }

      // Last attempt — return error
      if (attempt === retries) {
        return {
          data: null,
          error: {
            type: 'api_error',
            message: fbErr?.message || err.message,
            code: fbErr?.code || status,
          },
        };
      }

      await sleep(1000 * attempt);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── OAuth: Exchange code for short-lived user token ─────────────────────────────
async function exchangeCodeForToken(code, redirectUri) {
  const { data, error } = await makeGraphRequest({
    path: '/oauth/access_token',
    params: {
      client_id:     process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri:  redirectUri,
      code,
    },
    token: null,
  });
  if (error || !data?.access_token) {
    throw new Error(error?.message || 'Failed to exchange code for token');
  }
  return data; // { access_token, token_type, expires_in }
}

// ─── Exchange short-lived token for long-lived (60-day) token ────────────────────
async function exchangeForLongLivedToken(shortToken) {
  const { data, error } = await makeGraphRequest({
    path: '/oauth/access_token',
    params: {
      grant_type:        'fb_exchange_token',
      client_id:         process.env.META_APP_ID,
      client_secret:     process.env.META_APP_SECRET,
      fb_exchange_token: shortToken,
    },
    token: null,
  });
  if (error || !data?.access_token) {
    throw new Error(error?.message || 'Failed to exchange for long-lived token');
  }
  return data; // { access_token, token_type, expires_in }
}

// ─── Refresh long-lived user token (must be done within 60-day window) ───────────
async function refreshLongLivedToken(existingToken) {
  // Long-lived tokens are refreshed by re-exchanging them
  return exchangeForLongLivedToken(existingToken);
}

// ─── Debug/Validate Token (returns expiry, scopes, app_id) ───────────────────────
async function debugToken(tokenToInspect) {
  const appToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const { data, error } = await makeGraphRequest({
    path: '/debug_token',
    params: { input_token: tokenToInspect },
    token: appToken,
  });
  if (error) throw new Error(error.message);
  return data?.data; // { is_valid, expires_at, scopes, app_id, user_id }
}

// ─── Get User Profile ────────────────────────────────────────────────────────────
async function getUserProfile(userToken) {
  const { data, error } = await makeGraphRequest({
    path: '/me',
    params: { fields: 'id,name,email,picture' },
    token: userToken,
  });
  if (error) throw new Error(error.message);
  return data;
}

// ─── Get Facebook Pages ──────────────────────────────────────────────────────────
async function getPages(userToken) {
  const { data, error } = await makeGraphRequest({
    path: '/me/accounts',
    params: { fields: 'id,name,access_token,picture,fan_count,link,category' },
    token: userToken,
  });
  if (error) throw new Error(error.message);
  return data?.data || [];
}

// ─── Get Instagram Business Account linked to a Page ─────────────────────────────
async function getInstagramAccount(pageId, pageToken) {
  const { data, error } = await makeGraphRequest({
    path: `/${pageId}`,
    params: { fields: 'instagram_business_account,name' },
    token: pageToken,
  });
  if (error) throw new Error(error.message);
  if (!data?.instagram_business_account) return null;

  const igId = data.instagram_business_account.id;
  const { data: igData, error: igError } = await makeGraphRequest({
    path: `/${igId}`,
    params: { fields: 'id,name,username,profile_picture_url,followers_count,media_count,biography' },
    token: pageToken,
  });
  if (igError) throw new Error(igError.message);
  return igData;
}

// ─── Facebook: Get Conversations ─────────────────────────────────────────────────
async function getFBConversations(pageId, pageToken, limit = 20) {
  const { data, error } = await makeGraphRequest({
    path: `/${pageId}/conversations`,
    params: { fields: 'id,updated_time,participants,snippet,message_count,unread_count', limit },
    token: pageToken,
  });
  if (error) throw new Error(error.message);
  return data?.data || [];
}

// ─── Facebook: Get Messages in Conversation ───────────────────────────────────────
async function getFBMessages(conversationId, pageToken, limit = 50) {
  const { data, error } = await makeGraphRequest({
    path: `/${conversationId}/messages`,
    params: { fields: 'id,message,from,to,created_time,sticker,attachments', limit },
    token: pageToken,
  });
  if (error) throw new Error(error.message);
  return (data?.data || []).reverse(); // oldest first
}

// ─── Facebook: Send Message ───────────────────────────────────────────────────────
async function sendFBMessage(pageToken, recipientId, message, attachmentUrl = null) {
  const msgData = { recipient: { id: recipientId }, messaging_type: 'RESPONSE' };
  if (attachmentUrl) {
    msgData.message = { attachment: { type: 'image', payload: { url: attachmentUrl, is_reusable: true } } };
  } else {
    msgData.message = { text: message };
  }

  const { data, error } = await makeGraphRequest({
    method: 'POST',
    path: '/me/messages',
    data: msgData,
    token: pageToken,
  });
  if (error) throw new Error(error.message);
  return data; // { message_id, recipient_id }
}

// ─── Instagram: Get Conversations ────────────────────────────────────────────────
async function getIGConversations(igAccountId, accessToken, limit = 20) {
  const { data, error } = await makeGraphRequest({
    path: `/${igAccountId}/conversations`,
    params: { fields: 'id,updated_time,participants,snippet,message_count,unread_count', platform: 'instagram', limit },
    token: accessToken,
  });
  if (error) throw new Error(error.message);
  return data?.data || [];
}

// ─── Instagram: Get Messages in Conversation ──────────────────────────────────────
async function getIGMessages(conversationId, accessToken, limit = 50) {
  const { data, error } = await makeGraphRequest({
    path: `/${conversationId}/messages`,
    params: { fields: 'id,text,from,to,created_time,attachments', limit },
    token: accessToken,
  });
  if (error) throw new Error(error.message);
  return (data?.data || []).reverse();
}

// ─── Instagram: Send Message ──────────────────────────────────────────────────────
async function sendIGMessage(igAccountId, accessToken, recipientId, message) {
  const { data, error } = await makeGraphRequest({
    method: 'POST',
    path: `/${igAccountId}/messages`,
    data: { recipient: { id: recipientId }, message: { text: message } },
    token: accessToken,
  });
  if (error) throw new Error(error.message);
  return data;
}

// ─── Facebook: Get Post Comments ──────────────────────────────────────────────────
async function getFBComments(objectId, pageToken, limit = 50) {
  const { data, error } = await makeGraphRequest({
    path: `/${objectId}/comments`,
    params: { fields: 'id,message,from,created_time,can_reply_privately', limit },
    token: pageToken,
  });
  if (error) throw new Error(error.message);
  return data?.data || [];
}

// ─── Facebook/Instagram: Reply to Comment ────────────────────────────────────────
async function replyToComment(commentId, token, message) {
  const { data, error } = await makeGraphRequest({
    method: 'POST',
    path: `/${commentId}/replies`,
    data: { message },
    token,
  });
  if (error) throw new Error(error.message);
  return data;
}

// ─── Facebook: Publish Post ───────────────────────────────────────────────────────
async function publishFBPost(pageId, pageToken, message, mediaUrl = null, scheduledAt = null) {
  const postData = { message };
  if (mediaUrl) postData.link = mediaUrl;
  if (scheduledAt) {
    postData.published = false;
    postData.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
  }
  const { data, error } = await makeGraphRequest({
    method: 'POST',
    path: `/${pageId}/feed`,
    data: postData,
    token: pageToken,
  });
  if (error) throw new Error(error.message);
  return data; // { id }
}

// ─── Instagram: Create Media Container ───────────────────────────────────────────
async function createIGMediaContainer(igAccountId, accessToken, imageUrl, caption) {
  const { data, error } = await makeGraphRequest({
    method: 'POST',
    path: `/${igAccountId}/media`,
    data: { image_url: imageUrl, caption, media_type: 'IMAGE' },
    token: accessToken,
  });
  if (error) throw new Error(error.message);
  return data?.id; // creation_id
}

// ─── Instagram: Publish Media Container ──────────────────────────────────────────
async function publishIGMedia(igAccountId, accessToken, creationId) {
  const { data, error } = await makeGraphRequest({
    method: 'POST',
    path: `/${igAccountId}/media_publish`,
    data: { creation_id: creationId },
    token: accessToken,
  });
  if (error) throw new Error(error.message);
  return data; // { id }
}

// ─── Instagram: Publish Post (container + publish in one call) ───────────────────
async function publishIGPost(igAccountId, accessToken, imageUrl, caption) {
  const creationId = await createIGMediaContainer(igAccountId, accessToken, imageUrl, caption);
  await sleep(3000); // wait for container processing
  return publishIGMedia(igAccountId, accessToken, creationId);
}

// ─── Facebook: Page Insights (Analytics) ─────────────────────────────────────────
async function getPageInsights(pageId, pageToken, metric = 'page_impressions,page_engaged_users,page_fan_adds,page_views_total', period = 'day') {
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const { data, error } = await makeGraphRequest({
    path: `/${pageId}/insights`,
    params: { metric, period, since, until },
    token: pageToken,
  });
  if (error) throw new Error(error.message);
  return data?.data || [];
}

// ─── Instagram: Account Insights ─────────────────────────────────────────────────
async function getIGInsights(igAccountId, accessToken, metric = 'impressions,reach,profile_views,follower_count', period = 'day') {
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const { data, error } = await makeGraphRequest({
    path: `/${igAccountId}/insights`,
    params: { metric, period, since, until },
    token: accessToken,
  });
  if (error) throw new Error(error.message);
  return data?.data || [];
}

module.exports = {
  REQUIRED_SCOPES,
  makeGraphRequest,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  refreshLongLivedToken,
  debugToken,
  getUserProfile,
  getPages,
  getInstagramAccount,
  getFBConversations,
  getFBMessages,
  sendFBMessage,
  getIGConversations,
  getIGMessages,
  sendIGMessage,
  getFBComments,
  replyToComment,
  publishFBPost,
  publishIGPost,
  getPageInsights,
  getIGInsights,
};
