const mongoose = require('mongoose');

const bfsQueueSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
});

module.exports = mongoose.model('BFSQueue', bfsQueueSchema);