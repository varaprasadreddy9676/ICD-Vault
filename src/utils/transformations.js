const logger = require('./logger');

// We store incremental counters in memory.
// If you need them persistent, store them in DB or a separate collection.
let chapterCounter = 1;
let sectionCounter = 1;
let subsectionCounter = 1;
let diagnosisCounter = 1;

function resetCounters() {
  chapterCounter = 1;
  sectionCounter = 1;
  subsectionCounter = 1;
  diagnosisCounter = 1;
}

const HIERARCHY_LEVELS = {
  CHAPTER: ['chapter'],
  SECTION: ['section', 'block'],
  SUBSECTION: ['subsection', 'category', 'precoordination'],
  DIAGNOSIS: ['morbidity', 'mortality', 'foundation'],
};

/**
 * Priority-based logic to classify an entity into one of CHAPTER, SECTION, SUBSECTION, or DIAGNOSIS.
 * Feel free to expand with code patterns or properties checks.
 */
function classifyEntity(entity) {
  if (entity.classKind === 'chapter') return 'CHAPTER';
  if (['section', 'block'].includes(entity.classKind)) return 'SECTION';
  if (['subsection', 'category', 'precoordination'].includes(entity.classKind)) return 'SUBSECTION';
  return 'DIAGNOSIS';
}

function isInfectious(entity) {
  const indicators = [/bacterial/i, /viral/i, /infection/i, /parasit/i];
  const title = entity.title?.['@value'] || '';
  const definition = entity.definition?.['@value'] || '';
  return indicators.some((re) => re.test(title) || re.test(definition));
}

/**
 * Simple function that transforms the raw entity (JSON from WHO) into one of the 4 classification records.
 */
function transformAndAssign(entity, hierarchy) {
  // hierarchy might contain the parent's chapter, section, subsection if you do advanced parent lookups

  const classification = classifyEntity(entity);
  switch (classification) {
    case 'CHAPTER':
      return {
        type: 'CHAPTER',
        chapter_id: chapterCounter++,
        code: entity.code,
        description: entity.title?.['@value'] || '',
        version: entity.releaseDate || '2024-01',
      };
    case 'SECTION':
      return {
        type: 'SECTION',
        section_id: sectionCounter++,
        code: entity.code,
        description: entity.title?.['@value'] || '',
        // possibly link chapter_id if you find a chapter ancestor
      };
    case 'SUBSECTION':
      return {
        type: 'SUBSECTION',
        subsection_id: subsectionCounter++,
        code: entity.code,
        description: entity.title?.['@value'] || '',
      };
    default:
      // DIAGNOSIS
      return {
        type: 'DIAGNOSIS',
        diagnosis_id: diagnosisCounter++,
        code: entity.code,
        description: entity.title?.['@value'] || '',
        diagnosis_has_subclassification: (entity.child && entity.child.length > 0) || false,
        diagnosis_parent_id: null, // could be resolved by climbing parents
        diagnosis_is_infectious: isInfectious(entity),
      };
  }
}

module.exports = {
  resetCounters,
  transformAndAssign,
};