const axios = require('axios');

const GRAPH_API = 'https://graph.facebook.com/v19.0';

/**
 * Test connection using Instagram Business Account access token.
 * keys: { INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID }
 */
async function testConnection(keys) {
  const accessToken = keys['INSTAGRAM_ACCESS_TOKEN'];
  const businessAccountId = keys['INSTAGRAM_BUSINESS_ACCOUNT_ID'];
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is missing');
  if (!businessAccountId) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID is missing');

  const response = await axios.get(`${GRAPH_API}/${businessAccountId}`, {
    params: {
      fields: 'id,name,username,biography,followers_count,media_count',
      access_token: accessToken,
    },
    timeout: 10000,
  });

  return { success: true, data: response.data };
}

/**
 * Exchange a short-lived Instagram user token for a long-lived token (valid ~60 days).
 * https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-access-tokens
 */
async function exchangeForLongLivedToken(keys) {
  const appSecret = keys['INSTAGRAM_APP_SECRET'];
  const shortLivedToken = keys['INSTAGRAM_ACCESS_TOKEN'];
  if (!appSecret) throw new Error('INSTAGRAM_APP_SECRET is missing for token exchange');
  if (!shortLivedToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is missing for token exchange');

  const response = await axios.get(`${GRAPH_API}/access_token`, {
    params: {
      grant_type: 'ig_exchange_token',
      client_secret: appSecret,
      access_token: shortLivedToken,
    },
    timeout: 10000,
  });

  // Returns: { access_token, token_type, expires_in }
  return response.data;
}

/**
 * Refresh an existing long-lived token before it expires.
 * Must be called at least once every 60 days.
 */
async function refreshLongLivedToken(longLivedToken) {
  if (!longLivedToken) throw new Error('Long-lived access token is required for refresh');

  const response = await axios.get(`${GRAPH_API}/refresh_access_token`, {
    params: {
      grant_type: 'ig_refresh_token',
      access_token: longLivedToken,
    },
    timeout: 10000,
  });

  // Returns: { access_token, token_type, expires_in }
  return response.data;
}

module.exports = { testConnection, exchangeForLongLivedToken, refreshLongLivedToken };
