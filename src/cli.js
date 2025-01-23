// src/cli.js
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const { 
  CLIENT_ID, 
  CLIENT_SECRET, 
  ICD_VERSION, 
  API_LANGUAGE, 
  OUTPUT_FORMAT, 
  OUTPUT_FILE 
} = require('./config');
const { dumpIcdData } = require('./services/icdService');
const { initCsvWriter } = require('./utils/csvWriter');
const { JSONWriter } = require('./utils/jsonWriter');

const program = new Command();

program
  .name('icd11-dumper')
  .description('CLI to dump ICD-11 data in CSV or JSON format.')
  .version('1.0.0');

program
  .command('dump')
  .description('Fetch ICD-11 data and output to CSV or JSON.')
  .option('--format <type>', 'Output format: csv or json', OUTPUT_FORMAT)
  .option('--output <filename>', 'Output filename', OUTPUT_FILE)
  .option('--language <lang>', 'Language code', API_LANGUAGE)
  .action(async (options) => {
    const format = options.format || 'csv';
    const outFile = options.output || OUTPUT_FILE;

    logger.info(
      `Starting ICD-11 dump in ${format.toUpperCase()} format to ${outFile}...`
    );
    logger.info(`Using clientId=${CLIENT_ID}, version=${ICD_VERSION}.`);

    try {
      if (format === 'csv') {
        // CSV approach remains chunk-based
        const csvWriter = initCsvWriter(outFile);
        await runCsvDump(csvWriter);
      } else if (format === 'json') {
        // Stream-based JSON approach
        await runJsonDump(outFile);
      } else {
        logger.error('Unsupported format. Use --format csv or --format json.');
      }
    } catch (error) {
      logger.error(`Error during dump: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Dump in CSV format (unchanged chunk approach).
 */
async function runCsvDump(csvWriter) {
  const recordsBuffer = [];

  async function onRecord(record) {
    recordsBuffer.push(record);
    if (recordsBuffer.length >= 500) {
      await csvWriter.writeRecords(recordsBuffer);
      recordsBuffer.length = 0;
    }
  }

  await dumpIcdData({
    onRecord,
    onEnd: async () => {
      if (recordsBuffer.length > 0) {
        await csvWriter.writeRecords(recordsBuffer);
      }
      logger.info('ICD dump to CSV complete.');
    },
  });
}

/**
 * Dump in JSON format (stream-based).
 */
async function runJsonDump(outFile) {
  // We create 4 JSON files or a single big one?
  // If single, we can just stream the records. If 4 separate, handle accordingly.
  // For demonstration, let's do a SINGLE file streaming.

  const fileStream = new JSONWriter(path.resolve(outFile));

  // We'll write each record as a chunk
  async function onRecord(record) {
    fileStream.write(record);
  }

  await dumpIcdData({
    onRecord,
    onEnd: () => {
      fileStream.end(); // finalize the JSON array
      logger.info('ICD dump to JSON complete.');
    },
  });
}

program.parseAsync(process.argv);

module.exports = program;