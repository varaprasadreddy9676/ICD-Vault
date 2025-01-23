const mongoose = require('mongoose');

const icdEntitySchema = new mongoose.Schema({
  code: { type: String, index: true },
  data: { type: Object, required: true }, // entire raw JSON from API
});

module.exports = mongoose.model('ICDEntity', icdEntitySchema);