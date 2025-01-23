const mongoose = require('mongoose');
const { MONGO_URI } = require('../config');
const logger = require('./logger');

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

module.exports = { connectDB };