const axios = require('axios');
const https = require('https');
const { URLSearchParams } = require('url');
const logger = require('../utils/logger');
const { CLIENT_ID, CLIENT_SECRET } = require('../config');

let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  // If we have a non-expired cached token, return it
  if (cachedToken && tokenExpiry && tokenExpiry > Date.now()) {
    return cachedToken;
  }

  logger.info('Fetching new access token from WHO ICD API...');

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('scope', 'icdapi_access');
  params.append('grant_type', 'client_credentials');

  try {
    const response = await axios.post(
      'https://icdaccessmanagement.who.int/connect/token',
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        httpsAgent: new https.Agent({ rejectUnauthorized: true }),
      }
    );

    const data = response.data;
    cachedToken = data.access_token;
    // Typically "expires_in" is in seconds
    tokenExpiry = Date.now() + data.expires_in * 1000 - 30000; // minus 30s buffer
    return cachedToken;
  } catch (error) {
    logger.error('Authentication failed: ' + error.message);
    throw error;
  }
}

module.exports = {
  getAccessToken,
};
