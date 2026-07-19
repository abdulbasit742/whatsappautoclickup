const axios = require('axios');

const GRAPH_API = 'https://graph.facebook.com/v19.0';

/**
 * Test connection using Facebook Page Access Token.
 * keys: { FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID }
 */
async function testConnection(keys) {
  const accessToken = keys['FACEBOOK_ACCESS_TOKEN'];
  const pageId = keys['FACEBOOK_PAGE_ID'];
  if (!accessToken) throw new Error('FACEBOOK_ACCESS_TOKEN is missing');
  if (!pageId) throw new Error('FACEBOOK_PAGE_ID is missing');

  const response = await axios.get(`${GRAPH_API}/${pageId}`, {
    params: {
      fields: 'id,name,fan_count,link',
      access_token: accessToken,
    },
    timeout: 10000,
  });

  return { success: true, data: response.data };
}

/**
 * Fetch Facebook page information.
 */
async function getPageInfo(pageId, accessToken) {
  const response = await axios.get(`${GRAPH_API}/${pageId}`, {
    params: {
      fields: 'id,name,fan_count,link,category',
      access_token: accessToken,
    },
    timeout: 10000,
  });
  return response.data;
}

/**
 * Validate a user/app/page access token via the Token Debug endpoint.
 * Requires appId and appSecret to build the app access token.
 */
async function debugToken(inputToken, appId, appSecret) {
  const appAccessToken = `${appId}|${appSecret}`;
  const response = await axios.get(`${GRAPH_API}/debug_token`, {
    params: {
      input_token: inputToken,
      access_token: appAccessToken,
    },
    timeout: 10000,
  });
  return response.data;
}

module.exports = { testConnection, getPageInfo, debugToken };
