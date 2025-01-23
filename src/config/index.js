const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

module.exports = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/icd11db',
  CLIENT_ID: process.env.CLIENT_ID || '',
  CLIENT_SECRET: process.env.CLIENT_SECRET || '',
  ICD_VERSION: process.env.ICD_VERSION || '2024-01',
  API_URL: process.env.API_URL || '',
  API_LANGUAGE: process.env.API_LANGUAGE || 'en',
  OUTPUT_FORMAT: process.env.OUTPUT_FORMAT || 'csv', // or "json"
  OUTPUT_FILE: process.env.OUTPUT_FILE || 'icd11_dump.csv',
};
