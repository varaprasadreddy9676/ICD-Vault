const { Command } = require('commander');
const logger = require('./utils/logger');
const { runBFS } = require('./services/icdService');
const { ICD_VERSION } = require('./config');

const program = new Command();

program
  .name('icd11-dumper')
  .description('CLI to dump ICD-11 data into MongoDB and classify in separate collections.')
  .version('1.0.0');

program
  .command('fetch')
  .description('Fetch ICD-11 data into MongoDB using BFS.')
  .action(async () => {
    try {
      const rootUrl = `https://id.who.int/icd/release/11/${ICD_VERSION}/mms`;
      logger.info(`Starting BFS from root: ${rootUrl}`);
      await runBFS(rootUrl);
      logger.info('BFS completed successfully!');
    } catch (err) {
      logger.error(`Failed BFS fetch: ${err.message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);

module.exports = program;