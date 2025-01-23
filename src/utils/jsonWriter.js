// src/utils/jsonWriter.js
const fs = require('fs');
const { Transform } = require('stream');

class JSONWriter extends Transform {
  constructor(filePath) {
    super({ objectMode: true });
    this.firstChunk = true;
    this.fd = fs.createWriteStream(filePath);
    this.fd.write('[');
  }

  _transform(chunk, encoding, callback) {
    if (!this.firstChunk) {
      this.fd.write(',');
    }
    // Write the JSON representation of the chunk
    this.fd.write(JSON.stringify(chunk, null, 2));
    this.firstChunk = false;
    callback();
  }

  _final(callback) {
    this.fd.write(']');
    this.fd.end();
    callback();
  }
}

module.exports = {
  JSONWriter
};