const axios = require('axios');
const https = require('https');
const logger = require('./logger');

async function fetchWithRetry(url, headers = {}, maxRetries = 3) {
  let delay = 2000; // ms
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers,
        httpsAgent: new https.Agent({ rejectUnauthorized: true }),
        timeout: 10000, // 10s
      });
      return response.data;
    } catch (err) {
      logger.warn(
        `Fetch attempt ${attempt} failed for URL: ${url}. Error: ${err.message}`
      );
      if (attempt === maxRetries) {
        logger.error(`Max retries reached for URL: ${url}`);
        throw err;
      }
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

module.exports = fetchWithRetry;
