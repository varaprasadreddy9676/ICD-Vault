
// src/index.js
const program = require('./cli');

async function main() {
  // Parse CLI commands
  program.parse(process.argv);
}

main().catch((err) => {
  // If there's any uncaught error, log and exit
  console.error('Fatal error:', err);
  process.exit(1);
});
