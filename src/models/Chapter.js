const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  chapter_id: { type: Number, unique: true },
  code: { type: String, unique: true },
  description: String,
  version: String,
});

module.exports = mongoose.model('Chapter', chapterSchema);