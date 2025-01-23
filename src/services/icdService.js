// src/services/icdService.js
const pLimit = require('p-limit');
const ProgressBar = require('progress');
const logger = require('../utils/logger');
const fetchWithRetry = require('../utils/fetcher');
const { getAccessToken } = require('./auth');
const { ICD_VERSION, API_LANGUAGE } = require('../config');

// Import new transformation functions
const { 
  classifyAndFlatten,       // new approach 
  validateClassification,   // optional 
  reconcileAmbiguousEntities 
} = require('../utils/transformations');

// Concurrency limit
const limit = pLimit(5);

async function dumpIcdData({ onRecord, onEnd }) {
  // BFS fetch: gather everything
  const allEntities = await fetchAllIcdEntities();

  // classification + flatten
  const classification = classifyAndFlatten(allEntities);

  // Optional validation
  validateClassification(classification);

  // Optional reconciliation
  reconcileAmbiguousEntities(classification);

  // Now we have 4 arrays: chapters, sections, subsections, diagnoses
  // Each is an array of final “records” the user wants

  // We can unify them or pass them individually
  // If you want a single “ICD record” stream, unify them
  const combinedRecords = [
    ...classification.chapters,
    ...classification.sections,
    ...classification.subsections,
    ...classification.diagnoses
  ];

  // Stream them out to the final onRecord consumer
  for (const record of combinedRecords) {
    await onRecord(record);
  }

  if (onEnd) onEnd();
}

async function fetchAllIcdEntities() {
  const progressBar = new ProgressBar('Fetching [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total: 10000 // rough guess
  });

  const entityMap = new Map();
  const rootUrl = `https://id.who.int/icd/release/11/${ICD_VERSION}/mms`;
  const queue = [rootUrl];

  while (queue.length > 0) {
    const url = queue.shift();
    await limit(async () => {
      try {
        const accessToken = await getAccessToken();
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Accept-Language': API_LANGUAGE,
          'API-Version': 'v2'
        };
        const entity = await fetchWithRetry(url, headers);

        if (!entity) return;

        // Store
        if (!entityMap.has(entity.code)) {
          entityMap.set(entity.code, entity);

          // Enqueue children
          if (Array.isArray(entity.child)) {
            for (const childUrl of entity.child) {
              queue.push(childUrl);
            }
          }
        }
        progressBar.tick();
      } catch (err) {
        logger.error(`Failed to process ${url}: ${err.message}`);
      }
    });
  }

  return entityMap; 
}

module.exports = {
  dumpIcdData,
};