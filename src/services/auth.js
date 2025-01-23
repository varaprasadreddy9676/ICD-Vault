const axios = require('axios');
const https = require('https');
const { URLSearchParams } = require('url');
const { CLIENT_ID, CLIENT_SECRET } = require('../config');
const logger = require('../utils/logger');

let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  logger.info('Fetching new access token from WHO ICD API...');
  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('scope', 'icdapi_access');
  params.append('grant_type', 'client_credentials');

  try {
    const res = await axios.post(
      'https://icdaccessmanagement.who.int/connect/token',
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        httpsAgent: new https.Agent({ rejectUnauthorized: true }),
      }
    );
    cachedToken = res.data.access_token;
    tokenExpiry = Date.now() + res.data.expires_in * 1000 - 30000;
    return cachedToken;
  } catch (err) {
    logger.error(`Failed to get access token: ${err.message}`);
    throw err;
  }
}

module.exports = { getAccessToken };