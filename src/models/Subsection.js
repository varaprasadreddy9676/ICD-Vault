const mongoose = require('mongoose');

const subsectionSchema = new mongoose.Schema({
  subsection_id: { type: Number, unique: true },
  code: { type: String, unique: true },
  description: String,
  chapter_id: { type: Number },
  section_id: { type: Number },
});

module.exports = mongoose.model('Subsection', subsectionSchema);