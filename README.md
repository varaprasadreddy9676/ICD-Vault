
# ICD-Valut

A Node.js CLI tool to recursively fetch ICD-11 codes from the WHO API and dump them in CSV or JSON format.

## Features

- Fetch ICD-11 codes and all children
- Customizable output format
- Concurrency control
- Restartable / robust fetch with retries
- Logs, linting, and testing

## Getting Started

1. **Clone** the repository.
2. **Install dependencies**: `npm install`.
3. **Create a `.env` file** with your WHO API credentials:
   ```ini
   CLIENT_ID=your-client-id
   CLIENT_SECRET=your-client-secret
   ICD_VERSION=2024-01
   API_LANGUAGE=en
   OUTPUT_FORMAT=csv
   OUTPUT_FILE=icd11_dump.csv

	4.	Run: npm run cli -- dump or node src/cli.js dump.

Available Commands
	•	npm run cli -- dump – Dump ICD-11 to CSV/JSON based on .env config or CLI flags.

License

MIT
