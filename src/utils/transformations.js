// src/utils/transformations.js
const fs = require('fs');
const logger = require('./logger');

const HIERARCHY_LEVELS = {
  CHAPTER: ['chapter'],
  SECTION: ['section', 'block'],
  SUBSECTION: ['subsection', 'category', 'precoordination'],
  DIAGNOSIS: ['morbidity', 'mortality', 'foundation']
};

let chapterId = 1;
let sectionId = 1;
let subsectionId = 1;
let diagnosisId = 1;

/**
 * Priority-based classification approach combining:
 * 1) parent containing "/chapter/"
 * 2) code pattern
 * 3) entity.properties
 * 4) fallback to classKind
 */
function classifyEntity(entity) {
  // 1. If parent includes "/chapter/" => 'CHAPTER'
  if (entity.parent?.some((p) => p.includes('/chapter/'))) {
    return 'CHAPTER';
  }

  // 2. If code matches pattern => 'DIAGNOSIS'
  if (entity.code && entity.code.match(/^[A-Z]{2}\d{2}/)) {
    return 'DIAGNOSIS';
  }

  // 3. If entity.properties?.bodySystem => 'SECTION'
  if (entity.properties?.bodySystem) {
    return 'SECTION';
  }

  // 4. Fallback to classKind -> match in HIERARCHY_LEVELS
  const found = Object.entries(HIERARCHY_LEVELS).find(([_, kinds]) =>
    kinds.includes(entity.classKind)
  );
  return found?.[0] || 'DIAGNOSIS';
}

/**
 * We climb up the parent chain to find the nearest chapter, section, subsection.
 */
function resolveHierarchy(entity, entityMap) {
  const hierarchy = {
    chapter: null,
    section: null,
    subsection: null
  };

  let current = entity;
  const visited = new Set();

  while (current.parent && current.parent.length > 0) {
    if (visited.has(current.code)) {
      logger.warn(`Cycle detected in hierarchy for ${current.code}`);
      break;
    }
    visited.add(current.code);

    const parentUrl = current.parent[0]; // just handle first parent for example
    const parentEntity = findEntityByUrl(parentUrl, entityMap);
    if (!parentEntity) break;

    // fill in if missing
    if (!hierarchy.chapter && parentEntity.classKind === 'chapter') {
      hierarchy.chapter = parentEntity;
    }
    if (
      !hierarchy.section &&
      ['section', 'block'].includes(parentEntity.classKind)
    ) {
      hierarchy.section = parentEntity;
    }
    if (
      !hierarchy.subsection &&
      ['subsection', 'category'].includes(parentEntity.classKind)
    ) {
      hierarchy.subsection = parentEntity;
    }

    current = parentEntity;
  }

  return hierarchy;
}

/**
 * Simple helper to find an entity by URL in the map
 */
function findEntityByUrl(url, entityMap) {
  for (const [c, e] of entityMap.entries()) {
    if (c === url || e.uri === url || e.index === url) {
      return e;
    }
  }
  return null;
}

/**
 * If we want to check if an entity is "infectious"
 */
function isInfectious(entity) {
  const infectiousIndicators = [
    /bacterial/i,
    /viral/i,
    /infection/i,
    /parasit/i
  ];
  const title = entity.title?.['@value'] || '';
  const definition = entity.definition?.['@value'] || '';

  return infectiousIndicators.some((regex) => regex.test(title) || regex.test(definition));
}

/**
 * Turn entire entityMap into 4 arrays
 */
function classifyAndFlatten(entityMap) {
  // We'll store final arrays here
  const chapters = [];
  const sections = [];
  const subsections = [];
  const diagnoses = [];

  // Reset counters if needed
  chapterId = sectionId = subsectionId = diagnosisId = 1;

  // First pass: classify each entity
  // Second pass: resolve hierarchy
  for (const [code, entity] of entityMap.entries()) {
    const classification = classifyEntity(entity);
    const { chapter, section, subsection } = resolveHierarchy(entity, entityMap);

    switch (classification) {
      case 'CHAPTER': {
        chapters.push({
          chapter_id: chapterId++,
          chapter_description: entity.title?.['@value'] || '',
          chapter_version: entity.releaseDate || 'N/A', // or ICD_VERSION
          code
        });
        break;
      }
      case 'SECTION': {
        sections.push({
          section_id: sectionId++,
          chapter_id: chapter ? chapter.code : null, // We'll do final mapping later if needed
          section_description: entity.title?.['@value'] || '',
          code
        });
        break;
      }
      case 'SUBSECTION': {
        subsections.push({
          subsection_id: subsectionId++,
          chapter_id: chapter ? chapter.code : null,
          section_id: section ? section.code : null,
          description: entity.title?.['@value'] || '',
          code
        });
        break;
      }
      case 'DIAGNOSIS':
      default: {
        const hasChildren = entity.child && entity.child.length > 0;
        diagnoses.push({
          diagnosis_id: diagnosisId++,
          chapter_id: chapter ? chapter.code : null,
          section_id: section ? section.code : null,
          subsection_id: subsection ? subsection.code : null,
          diagnosis_code: code,
          description: entity.title?.['@value'] || '',
          diagnosis_has_subclassification: hasChildren,
          // e.g. determine parent diagnosis
          diagnosis_parent_id: null, 
          diagnosis_is_infectious: isInfectious(entity),
          code
        });
      }
    }
  }

  // If we want numeric references in child records for chapter_id, etc.
  // We'll do a third pass to convert "chapter.code" => actual "chapter_id" 
  // but that requires we track which chapter code => which numeric ID, etc.

  return { chapters, sections, subsections, diagnoses };
}

/**
 * Validate classification results (optional).
 */
function validateClassification(classification) {
  const errors = [];
  classification.diagnoses.forEach((d) => {
    if (!d.chapter_id) {
      errors.push(`Diagnosis ${d.code} missing chapter reference`);
    }
  });
  if (errors.length > 0) {
    fs.writeFileSync('validation-errors.log', errors.join('\n'));
    logger.warn(
      `Found ${errors.length} classification errors. Check validation-errors.log.`
    );
  }
}

/**
 * Example reconciliation function:
 * If a 'subsection' doesn't have a section_id, treat it as a diagnosis, etc.
 */
function reconcileAmbiguousEntities(classification) {
  const { subsections, diagnoses } = classification;
  const stillAmbiguous = [];

  // Filter out subsections that have no section or chapter
  classification.subsections = subsections.filter((sub) => {
    if (!sub.section_id) {
      // push to diagnoses
      const diag = {
        diagnosis_id: classification.diagnoses.length + 1,
        chapter_id: sub.chapter_id,
        section_id: null,
        subsection_id: null,
        diagnosis_code: sub.code,
        description: sub.description,
        diagnosis_has_subclassification: false,
        diagnosis_parent_id: null,
        diagnosis_is_infectious: false,
        code: sub.code
      };
      diagnoses.push(diag);
      return false;
    }
    return true;
  });

  // etc. More logic can go here if you want deeper reconciliation
}

module.exports = {
  classifyAndFlatten,
  validateClassification,
  reconcileAmbiguousEntities
};