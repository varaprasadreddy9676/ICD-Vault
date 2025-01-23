const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  section_id: { type: Number, unique: true },
  code: { type: String, unique: true },
  description: String,
  chapter_id: { type: Number }, // references Chapter.chapter_id if needed
});

module.exports = mongoose.model('Section', sectionSchema);