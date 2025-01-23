ICD Value

ICD Data Extractor is a CLI tool designed to fetch, process, and export hierarchical ICD (International Classification of Diseases) data from the WHO API. It supports customizable output formats (CSV or JSON) and provides a robust, scalable mechanism to handle large datasets with minimal effort.

Table of Contents
	1.	Features
	2.	Why This Approach?
	3.	Design Approach
	4.	How It Works
	5.	Installation
	6.	Usage
	7.	Configuration
	8.	Folder Structure
	9.	Future Scope
	10.	License

Features
	•	Fetch all ICD data, including:
	•	Codes
	•	Titles
	•	Definitions
	•	Parent-child relationships
	•	Synonyms, inclusions, and exclusions
	•	Export data in CSV or JSON formats.
	•	Supports multiple languages for ICD data.
	•	Concurrency control for efficient data fetching.
	•	Robust error handling with retry logic.
	•	Progress tracking with real-time updates.

Why This Approach?

1. Scalability

The ICD dataset is hierarchical and extensive, with thousands of nodes. To handle this:
	•	Breadth-First Search (BFS) is used for traversing the hierarchy. This approach ensures the tool processes one level at a time, reducing memory overhead compared to a recursive Depth-First Search (DFS).
	•	Concurrency control with libraries like p-limit enables fetching multiple entities simultaneously without overwhelming the WHO API.

2. Resilience

API requests can fail due to network issues, rate limits, or server downtime. The tool includes:
	•	Retry logic with exponential backoff, ensuring that transient errors don’t halt the process.
	•	A hierarchy map to track processed entities and avoid duplication.

3. Extensibility
	•	Adding support for new ICD versions (e.g., ICD-12, ICD-13) requires minimal changes, thanks to the centralized configuration and modular design.
	•	The tool is designed to allow integration with databases, web UIs, or other formats in the future.

4. User-Friendliness
	•	A CLI-first approach ensures users can interact with the tool easily.
	•	Options like --format and --output provide flexibility.
	•	Real-time progress tracking improves user experience.

Design Approach

1. Command-Line Interface (CLI)
	•	Built using the commander library for parsing commands and arguments.
	•	Supports commands like dump with options to specify:
	•	Output format (csv or json).
	•	Output file name.
	•	Language for ICD data.

2. Modular Structure
	•	Authentication (auth.js): Handles OAuth token retrieval for WHO API access.
	•	Data Fetching (icdService.js):
	•	Uses BFS to fetch ICD entities recursively.
	•	Handles API requests with retry and backoff logic.
	•	Transformation (transformations.js):
	•	Converts raw API responses into a structured format.
	•	Maps fields like synonyms, exclusions, and hierarchy levels.
	•	Output Writing (csvWriter.js, JSON Streaming):
	•	Writes processed data incrementally to minimize memory usage.
	•	Supports both CSV and JSON formats.

3. Error Handling and Logging
	•	Logs every action and error for transparency and debugging.
	•	Automatically retries failed requests.

4. Configuration
	•	Centralized in a .env file or passed as CLI options.
	•	Includes API credentials, ICD version, and default settings.

How It Works

Step 1: User Command

The user invokes the CLI with a command like:

node src/cli.js dump --format csv --output icd_data.csv

Step 2: Authentication
	•	The tool authenticates with the WHO API using client credentials (auth.js).
	•	An access token is retrieved and cached.

Step 3: Data Fetching
	•	The root ICD entity (/mms) is fetched.
	•	Each entity is processed, and its child entities are recursively fetched using BFS.

Step 4: Data Transformation
	•	Raw API data is transformed into a structured format with fields like:
	•	Code, title, definition
	•	Parent code, hierarchy levels
	•	Synonyms, inclusions, exclusions

Step 5: Data Output
	•	Processed records are written incrementally to the specified format:
	•	CSV: Records are written in chunks to minimize memory usage.
	•	JSON: Data is streamed to a file for efficiency.

Installation
	1.	Clone the repository:

git clone https://github.com/your-repo/icd-data-extractor.git
cd icd-data-extractor


	2.	Install dependencies:

npm install


	3.	Create a .env file with your API credentials:

CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
ICD_VERSION=2024-01
API_LANGUAGE=en
OUTPUT_FORMAT=csv
OUTPUT_FILE=icd11_dump.csv

Usage

Dump ICD Data

Export ICD data to a file:

node src/cli.js dump --format json --output icd_data.json

Available Options
	•	--format: Specify the output format (csv or json).
	•	--output: Specify the output file name.
	•	--language: Specify the language for ICD data (default: en).

Configuration

Environment Variables

Configure the tool using a .env file:

CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
ICD_VERSION=2024-01
API_LANGUAGE=en
OUTPUT_FORMAT=csv
OUTPUT_FILE=icd11_dump.csv

Folder Structure

icd-data-extractor/
├── .env                # Configuration file
├── package.json        # Project metadata and dependencies
├── src/
│   ├── cli.js          # Command-line interface
│   ├── config/
│   │   └── index.js    # Centralized configuration
│   ├── services/
│   │   ├── auth.js     # API authentication
│   │   └── icdService.js # Data fetching logic
│   ├── utils/
│   │   ├── csvWriter.js # CSV output utility
│   │   ├── fetcher.js   # HTTP fetch with retry logic
│   │   ├── logger.js    # Logging utility
│   │   └── transformations.js # Data transformation logic
│   └── index.js        # Main entry point
└── README.md           # Project documentation

Future Scope
	1.	Support for New ICD Versions
	•	Easily update ICD_VERSION to fetch data for newer releases like ICD-12 or ICD-13.
	2.	Database Integration
	•	Store ICD data in relational or NoSQL databases for efficient querying.
	3.	Web Interface
	•	Develop a browser-based UI for browsing and searching ICD data locally.
	4.	Incremental Updates
	•	Fetch only the differences between two ICD releases.
	5.	Error Reporting
	•	Generate detailed error reports for failed API requests.

License

This project is licensed under the MIT License.

This README provides all the necessary information to understand, use, and extend the project. Let me know if you need more details!