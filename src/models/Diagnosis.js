const mongoose = require('mongoose');

const diagnosisSchema = new mongoose.Schema({
  diagnosis_id: { type: Number, unique: true },
  code: { type: String, unique: true },
  description: String,
  chapter_id: { type: Number },
  section_id: { type: Number },
  subsection_id: { type: Number },
  diagnosis_has_subclassification: { type: Boolean, default: false },
  diagnosis_parent_id: { type: Number, default: null },
  diagnosis_is_infectious: { type: Boolean, default: false },
});

module.exports = mongoose.model('Diagnosis', diagnosisSchema);