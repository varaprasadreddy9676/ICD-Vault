
// src/utils/transformations.js
function transformEntityToRecord(entity, parentCodes, hierarchyMap, releaseId) {
    
    const { code, title, definition, classKind, isLeaf } = entity;
  
    // Flatten synonyms, inclusions, exclusions, notes
    const synonyms = entity.synonym
      ? entity.synonym.map((s) => s['@value']).join('; ')
      : '';
    const inclusions = entity.inclusion
      ? entity.inclusion.map((i) => i['@value']).join('; ')
      : '';
    const exclusions = entity.exclusion
      ? entity.exclusion.map((e) => e['@value']).join('; ')
      : '';
    const codingNotes = entity.codingNote?.['@value'] || '';
  
    // Find direct parent code
    const parentCode = parentCodes[parentCodes.length - 1] || '';
  
    // Derive hierarchy levels
    const chapter = getHierarchyLevel(entity, parentCodes, hierarchyMap, [
      'chapter',
    ]);
    const section = getHierarchyLevel(entity, parentCodes, hierarchyMap, [
      'section',
      'block',
    ]);
    const subsection = getHierarchyLevel(entity, parentCodes, hierarchyMap, [
      'subsection',
      'category',
    ]);
  
    return {
      code: code || '',
      title: title?.['@value'] || '',
      definition: definition?.['@value'] || '',
      classKind: classKind || '',
      parentCode,
      chapter,
      section,
      subsection,
      isLeaf: !!isLeaf,
      synonyms,
      inclusions,
      exclusions,
      codingNotes,
      releaseId,
    };
  }
  
  /**
   * Finds the nearest ancestor (including self) whose classKind is in `targetKinds`.
   */
  function getHierarchyLevel(entity, parentCodes, hierarchyMap, targetKinds) {
    // If the entity itself is one of the targetKinds, return its title
    if (targetKinds.includes(entity.classKind)) {
      return entity.title?.['@value'] || '';
    }
    // Otherwise, move up the hierarchy
    for (let i = parentCodes.length - 1; i >= 0; i--) {
      const code = parentCodes[i];
      const parentEntity = hierarchyMap.get(code);
      if (parentEntity && targetKinds.includes(parentEntity.classKind)) {
        return parentEntity.title?.['@value'] || '';
      }
    }
    return '';
  }
  
  module.exports = {
    transformEntityToRecord,
  };
  