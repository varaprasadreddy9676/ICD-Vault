
// src/services/icdService.js
const pLimit = require('p-limit');
const ProgressBar = require('progress');
const logger = require('../utils/logger');
const fetchWithRetry = require('../utils/fetcher');
const { transformEntityToRecord } = require('../utils/transformations');
const { getAccessToken } = require('./auth');
const { ICD_VERSION, API_LANGUAGE } = require('../config');

// For example, set concurrency limit to 5
const limit = pLimit(5);

async function fetchIcdData({
  rootUrl,
  hierarchyMap,
  onEntityProcessed,
  progressBar,
}) {
  // BFS queue
  const queue = [rootUrl];
  while (queue.length > 0) {
    const url = queue.shift();
    // Enqueue an async task within concurrency limit
    await limit(async () => {
      try {
        const accessToken = await getAccessToken();
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Accept-Language': API_LANGUAGE,
          'API-Version': 'v2',
        };
        const entity = await fetchWithRetry(url, headers);

        // If no data returned, skip
        if (!entity) return;

        // Save in map
        hierarchyMap.set(entity.code, entity);

        // Notify consumer (to transform and write to CSV/JSON)
        await onEntityProcessed(entity);

        // Enqueue children
        if (entity.child && entity.child.length > 0) {
          for (const childUrl of entity.child) {
            queue.push(childUrl);
          }
        }

        // Update progress
        progressBar.tick();
      } catch (err) {
        logger.error(`Failed to process ${url} : ${err.message}`);
      }
    });
  }
}

async function dumpIcdData({ onRecord, onEnd }) {
  // Initialize progress bar
  const progressBar = new ProgressBar('Processing [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total: 10000, // initial guess; you can dynamically update in BFS if needed
  });

  const hierarchyMap = new Map();

  // We'll define how each entity is processed
  async function onEntityProcessed(entity) {
    // Identify parents by walking the BFS queue or store them in the hierarchy map
    // In BFS, we can’t easily track "parents" as in DFS, so we do a small trick:
    // we keep track of each parent code inside the entity if needed or
    // we rely on hierarchyMap to figure it out later. For simplicity:
    const parentCodes = deriveParentCodes(entity, hierarchyMap);
    const record = transformEntityToRecord(
      entity,
      parentCodes,
      hierarchyMap,
      ICD_VERSION
    );
    await onRecord(record);
  }

  // Start BFS from the root URL @@ move this to .env
  const rootUrl = `https://id.who.int/icd/release/11/${ICD_VERSION}/mms`;

  // Kick off BFS
  await fetchIcdData({
    rootUrl,
    hierarchyMap,
    onEntityProcessed,
    progressBar,
  });

  // All done
  if (onEnd) onEnd();
}

/**
 * Derive parent codes in BFS:
 * In the official WHO API, each child entity has a "parent" array,
 * but sometimes it might not be present. We can attempt to read from
 * the property "parent" if available, or skip if not.
 */
function deriveParentCodes(entity, hierarchyMap) {
  if (!entity.parent) return [];
  // parent can be an array of parent URLs. We only handle the first one for example:
  // We'll look up that parent's code from the hierarchyMap if already fetched.
  // This approach might or might not work depending on the order BFS fetches data.
  return entity.parent
    .map((parentUrl) => {
      // parentUrl: "https://id.who.int/icd/entity/xxxxx"
      // If we have that entity in the map, read its code
      const parentEntity = Array.from(hierarchyMap.values()).find(
        (v) => v.uri === parentUrl || v.index === parentUrl
      );
      return parentEntity ? parentEntity.code : null;
    })
    .filter(Boolean);
}

module.exports = {
  dumpIcdData,
};
