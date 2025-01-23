// src/utils/csvWriter.js
const { createObjectCsvWriter } = require('csv-writer');

function initCsvWriter(filePath) {
  return createObjectCsvWriter({
    path: filePath,
    append: false, // if you want to overwrite each time
    header: [
      { id: 'code', title: 'CODE' },
      { id: 'title', title: 'TITLE' },
      { id: 'definition', title: 'DEFINITION' },
      { id: 'classKind', title: 'CLASS_KIND' },
      { id: 'parentCode', title: 'PARENT_CODE' },
      { id: 'chapter', title: 'CHAPTER' },
      { id: 'section', title: 'SECTION' },
      { id: 'subsection', title: 'SUBSECTION' },
      { id: 'isLeaf', title: 'IS_LEAF' },
      { id: 'synonyms', title: 'SYNONYMS' },
      { id: 'inclusions', title: 'INCLUSIONS' },
      { id: 'exclusions', title: 'EXCLUSIONS' },
      { id: 'codingNotes', title: 'CODING_NOTES' },
      { id: 'releaseId', title: 'RELEASE_ID' },
    ],
  });
}

async function writeCsvRecords(csvWriter, records) {
  await csvWriter.writeRecords(records);
}

module.exports = {
  initCsvWriter,
  writeCsvRecords,
};
