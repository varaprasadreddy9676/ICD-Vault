const { Command } = require('commander');
const logger = require('./utils/logger');
const {
  CLIENT_ID,
  CLIENT_SECRET,
  ICD_VERSION,
  API_LANGUAGE,
  OUTPUT_FORMAT,
  OUTPUT_FILE,
} = require('./config');
const { dumpIcdData } = require('./services/icdService');
const { initCsvWriter } = require('./utils/csvWriter');
const fs = require('fs');
const path = require('path');

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
    // Extract CLI arguments
    const format = options.format || 'csv';
    const outFile = options.output || OUTPUT_FILE;

    logger.info(
      `Starting ICD-11 dump in ${format.toUpperCase()} format to ${outFile}...`
    );
    logger.info(`Using clientId=${CLIENT_ID}, version=${ICD_VERSION}.`);

    try {
      if (format === 'csv') {
        const csvWriter = initCsvWriter(outFile);
        await runCsvDump(csvWriter);
      } else if (format === 'json') {
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
 * Dump in CSV format.
 */
async function runCsvDump(csvWriter) {
  const recordsBuffer = [];

  // Called every time we process an entity
  async function onRecord(record) {
    recordsBuffer.push(record);

    // Write in chunks to save memory
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
 * Dump in JSON format.
 */
async function runJsonDump(outFile) {
  const fileStream = fs.createWriteStream(path.resolve(outFile), { flags: 'w' });
  fileStream.write('['); // JSON array start

  let firstRecord = true;

  await dumpIcdData({
    onRecord: async (record) => {
      if (!firstRecord) fileStream.write(',');
      fileStream.write(JSON.stringify(record, null, 2));
      firstRecord = false;
    },
    onEnd: () => {
      fileStream.write(']'); // JSON array end
      fileStream.end();
      logger.info('ICD dump to JSON complete.');
    },
  });
}

// Parse the CLI arguments
program.parseAsync(process.argv);

module.exports = program;