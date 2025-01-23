const { BFSQueue, ICDEntity, Chapter, Section, Subsection, Diagnosis } = require('../models');
const { ICD_VERSION, API_LANGUAGE } = require('../config');
const { getAccessToken } = require('./auth');
const fetchWithRetry = require('../utils/fetcher');
const logger = require('../utils/logger');
const { transformAndAssign } = require('../utils/transformations');
const pLimit = require('p-limit');

const limit = pLimit(3); // concurrency limit

/**
 * Initiate the BFS process, resume if there's existing queue.
 * rootUrl is e.g. https://id.who.int/icd/release/11/2024-01/mms
 */
async function runBFS(rootUrl) {
  // Check if the root URL exists
  const existing = await BFSQueue.findOne({ url: rootUrl });

  // Insert only if the root URL is not present
  if (!existing) {
    await BFSQueue.create({ url: rootUrl, status: 'pending' });
  } else {
    logger.info(`Root URL ${rootUrl} already exists in the queue.`);
  }

  // Optionally, revert stuck items to pending
  await BFSQueue.updateMany({ status: 'in_progress' }, { status: 'pending' });

  // Process while pending items exist
  let pendingItem = true;
  while (pendingItem) {
    pendingItem = await processNextItem();
  }
  logger.info('BFS process completed. All items processed.');
}

/**
 * Finds one pending item, mark it in_progress, fetch entity, store, enqueue children.
 */
async function processNextItem() {
  const queueItem = await BFSQueue.findOneAndUpdate(
    { status: 'pending' },
    { status: 'in_progress' },
    { new: true }
  );
  if (!queueItem) {
    return false; // no more pending items
  }

  try {
    await limit(() => processUrl(queueItem.url));
    queueItem.status = 'completed';
    await queueItem.save();
  } catch (err) {
    logger.error(`Error processing ${queueItem.url}: ${err.message}`);
    // revert to pending if needed
    queueItem.status = 'pending';
    await queueItem.save();
  }
  return true;
}

/**
 * Fetch the entity from the WHO API, store in DB if new, classify, store classification
 */
async function processUrl(url) {
  // 1. Check if entity already in DB
  let existing = await ICDEntity.findOne({ 'data.uri': url });
  if (existing) {
    // Already fetched
    await classifyAndStore(existing.data);
    return;
  }

  // 2. Fetch from WHO
  const token = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Accept-Language': API_LANGUAGE,
    'API-Version': 'v2',
  };

  const data = await fetchWithRetry(url, headers);
  if (!data) throw new Error(`No data returned for ${url}`);

  // 3. Store raw entity
  const icdEntity = await ICDEntity.create({
    code: data.code,
    data: data,
  });

  // 4. Classify and store
  await classifyAndStore(data);

  // 5. Enqueue children
  if (Array.isArray(data.child)) {
    for (const childUrl of data.child) {
      await BFSQueue.updateOne(
        { url: childUrl },
        { $setOnInsert: { url: childUrl, status: 'pending' } },
        { upsert: true }
      );
    }
  }
}

/**
 * Classify entity, store in relevant collection
 */
async function classifyAndStore(entity) {
  const record = transformAndAssign(entity);

  switch (record.type) {
    case 'CHAPTER':
      // upsert by code
      await Chapter.updateOne(
        { code: record.code },
        {
          $set: {
            chapter_id: record.chapter_id,
            code: record.code,
            description: record.description,
            version: record.version,
          },
        },
        { upsert: true }
      );
      break;

    case 'SECTION':
      await Section.updateOne(
        { code: record.code },
        {
          $set: {
            section_id: record.section_id,
            code: record.code,
            description: record.description,
          },
        },
        { upsert: true }
      );
      break;

    case 'SUBSECTION':
      await Subsection.updateOne(
        { code: record.code },
        {
          $set: {
            subsection_id: record.subsection_id,
            code: record.code,
            description: record.description,
          },
        },
        { upsert: true }
      );
      break;

    case 'DIAGNOSIS':
    default:
      await Diagnosis.updateOne(
        { code: record.code },
        {
          $set: {
            diagnosis_id: record.diagnosis_id,
            code: record.code,
            description: record.description,
            diagnosis_has_subclassification: record.diagnosis_has_subclassification,
            diagnosis_parent_id: record.diagnosis_parent_id,
            diagnosis_is_infectious: record.diagnosis_is_infectious,
          },
        },
        { upsert: true }
      );
      break;
  }
}

module.exports = {
  runBFS,
};