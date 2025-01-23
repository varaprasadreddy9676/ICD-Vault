const { connectDB } = require('./utils/db');
const program = require('./cli');

async function main() {
  await connectDB();
  // The CLI parse will handle commands like 'fetch'
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});