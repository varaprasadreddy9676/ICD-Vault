const XLSX = require('xlsx');
const fs = require('fs');

// Initialize data structures
const chapters = [];
const sections = [];
const subsections = [];
const diagnoses = [];

// Track current entities and IDs
let currentChapter = null;
let currentSection = null;
let currentSubsection = null;
const codeToDiagnosisId = new Map();

// Auto-incrementing IDs
let chapterId = 0;
let sectionId = 0;
let subsectionId = 0;
let diagnosisId = 0;

// Clean title from leading dashes and whitespace
const cleanTitle = (title) => (title || '').replace(/^-+/g, '').trim();

// Process XLSX file
const workbook = XLSX.readFile('input.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

rows.forEach((row) => {
  const classKind = row.ClassKind;
  const depth = row.DepthInKind;
  const code = row.Code || '';
  const title = cleanTitle(row.Title);

  // Handle different entity types
  if (classKind === 'chapter') {
    // Reset hierarchy for new chapter
    currentChapter = {
      chapter_id: ++chapterId,
      chapter_description: title,
      chapter_version: row.Version || '1.0',
      chapter_no: row.ChapterNo,
      foundation_uri: row['Foundation URI'],
      linearization_uri: row['Linearization (release) URI'],
      browser_link: row.BrowserLink
    };
    chapters.push(currentChapter);
    currentSection = null;
    currentSubsection = null;
    sectionId = 0;
    subsectionId = 0;
  }
  else if (classKind === 'block') {
    if (depth == 1) { // Section
      currentSection = {
        section_id: ++sectionId,
        chapter_id: currentChapter?.chapter_id || null,
        section_description: title,
        block_id: row.BlockId,
        primary_tabulation: row['Primary tabulation'],
        grouping1: row.Grouping1,
        grouping2: row.Grouping2
      };
      sections.push(currentSection);
      currentSubsection = null;
      subsectionId = 0;
    }
    else if (depth == 2) { // Subsection
      if (!currentSection) {
        console.warn('Subsection skipped - no parent section:', title);
        return;
      }
      currentSubsection = {
        subsection_id: ++subsectionId,
        chapter_id: currentChapter?.chapter_id || null,
        section_id: currentSection.section_id,
        description: title,
        block_id: row.BlockId,
        grouping3: row.Grouping3,
        grouping4: row.Grouping4
      };
      subsections.push(currentSubsection);
    }
  }
  else if (code) { // Diagnosis
    const diagnosis = {
      diagnosis_id: ++diagnosisId,
      chapter_id: currentChapter?.chapter_id || null,
      section_id: currentSection?.section_id || null,
      subsection_id: currentSubsection?.subsection_id || null,
      diagnosis_code: code,
      description: title,
      foundation_uri: row['Foundation URI'],
      linearization_uri: row['Linearization (release) URI'],
      block_id: row.BlockId,
      primary_location: row.PrimaryLocation,
      browser_link: row.BrowserLink,
      icat_link: row.iCatLink,
      diagnosis_has_subclassification: !row.isLeaf,
      diagnosis_parent_id: null,
      diagnosis_is_infectious: row.IsInfectious || false,
      is_residual: row.IsResidual || false,
      grouping5: row.Grouping5,
      version: row['Version:2025 Jan 22 - 22:30 UTC']
    };

    // Handle parent-child relationships
    if (code.includes('.')) {
      const parentCode = code.split('.')[0];
      const parentId = codeToDiagnosisId.get(parentCode);
      if (parentId) {
        diagnosis.diagnosis_parent_id = parentId;
        // Update parent's has_subclassification flag
        const parent = diagnoses.find(d => d.diagnosis_id === parentId);
        if (parent) parent.diagnosis_has_subclassification = true;
      }
    }

    // Store for future parent lookups
    codeToDiagnosisId.set(code, diagnosis.diagnosis_id);
    diagnoses.push(diagnosis);
  }
});

// Write output files
fs.writeFileSync('chapters.json', JSON.stringify(chapters, null, 2));
fs.writeFileSync('sections.json', JSON.stringify(sections, null, 2));
fs.writeFileSync('subsections.json', JSON.stringify(subsections, null, 2));
fs.writeFileSync('diagnoses.json', JSON.stringify(diagnoses, null, 2));

console.log('Conversion completed successfully!');