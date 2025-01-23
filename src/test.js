const fs = require('fs').promises;
const path = require('path');
const pLimit = require('p-limit');
const ProgressBar = require('progress');

const { getAccessToken } = require('./services/auth');
const fetchWithRetry = require('./utils/fetcher');
const logger = require('./utils/logger');
const { ICD_VERSION, API_LANGUAGE } = require('./config');

class ICD11DataExtractor {
    constructor(rootUrl, concurrencyLimit = 5) {
        this.rootUrl = rootUrl;
        this.limit = pLimit(concurrencyLimit);
        this.hierarchyMap = new Map();
        
        // Data collections
        this.chapters = [];
        this.sections = [];
        this.subsections = [];
        this.diagnoses = [];
        
        // Tracking IDs
        this.chapterIdCounter = 1;
        this.sectionIdCounter = 1;
        this.subsectionIdCounter = 1;
        this.diagnosisIdCounter = 1;
    }

    async extractHierarchicalData() {
        const progressBar = new ProgressBar('Processing [:bar] :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 30,
            total: 10000
        });

        const queue = [this.rootUrl];
        const processedUrls = new Set();

        while (queue.length > 0) {
            const url = queue.shift();
            
            // Prevent processing the same URL multiple times
            if (processedUrls.has(url)) continue;
            processedUrls.add(url);

            await this.limit(async () => {
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

                    // Process the entity based on its classification
                    await this.processEntity(entity);

                    // Enqueue child entities
                    if (entity.child && entity.child.length > 0) {
                        queue.push(...entity.child);
                    }

                    progressBar.tick();
                } catch (err) {
                    logger.error(`Failed to process ${url}: ${err.message}`);
                }
            });
        }

        // Save extracted data to JSON files
        await this.saveExtractedData();
    }

    async processEntity(entity) {
        switch (entity.classKind) {
            case 'chapter':
                this.processChapter(entity);
                break;
            case 'section':
            case 'block':
                this.processSection(entity);
                break;
            case 'subsection':
            case 'category':
                this.processSubsection(entity);
                break;
            default:
                this.processDiagnosis(entity);
        }
    }

    processChapter(entity) {
        const chapter = {
            chapter_id: this.chapterIdCounter++,
            chapter_description: entity.title?.['@value'] || '',
            chapter_version: ICD_VERSION,
            chapter_code: entity.code,
            chapter_uri: entity.uri
        };
        this.chapters.push(chapter);
    }

    processSection(entity) {
        // Find parent chapter
        const parentChapter = this.findParentChapter(entity);
        
        const section = {
            section_id: this.sectionIdCounter++,
            chapter_id: parentChapter?.chapter_id || null,
            section_description: entity.title?.['@value'] || '',
            section_code: entity.code,
            section_uri: entity.uri
        };
        this.sections.push(section);
    }

    processSubsection(entity) {
        // Find parent chapter and section
        const parentChapter = this.findParentChapter(entity);
        const parentSection = this.findParentSection(entity);

        const subsection = {
            subsection_id: this.subsectionIdCounter++,
            chapter_id: parentChapter?.chapter_id || null,
            section_id: parentSection?.section_id || null,
            description: entity.title?.['@value'] || '',
            subsection_code: entity.code,
            subsection_uri: entity.uri
        };
        this.subsections.push(subsection);
    }

    processDiagnosis(entity) {
        // Find parent hierarchy
        const parentChapter = this.findParentChapter(entity);
        const parentSection = this.findParentSection(entity);
        const parentSubsection = this.findParentSubsection(entity);
        const parentDiagnosis = this.findParentDiagnosis(entity);

        const diagnosis = {
            diagnosis_id: this.diagnosisIdCounter++,
            chapter_id: parentChapter?.chapter_id || null,
            section_id: parentSection?.section_id || null,
            subsection_id: parentSubsection?.subsection_id || null,
            diagnosis_code: entity.code,
            description: entity.title?.['@value'] || '',
            definition: entity.definition?.['@value'] || '',
            diagnosis_has_subclassification: !!entity.child?.length,
            diagnosis_parent_id: parentDiagnosis?.diagnosis_id || null,
            diagnosis_is_infectious: this.checkInfectiousDiagnosis(entity),
            synonyms: entity.synonym?.map(s => s['@value']) || [],
            inclusions: entity.inclusion?.map(i => i['@value']) || [],
            exclusions: entity.exclusion?.map(e => e['@value']) || [],
            coding_notes: entity.codingNote?.['@value'] || '',
            uri: entity.uri
        };
        this.diagnoses.push(diagnosis);
    }

    findParentChapter(entity) {
        return this.chapters.find(chapter => chapter.chapter_code === this.extractParentCode(entity, 'chapter'));
    }

    findParentSection(entity) {
        return this.sections.find(section => section.section_code === this.extractParentCode(entity, ['section', 'block']));
    }

    findParentSubsection(entity) {
        return this.subsections.find(subsection => subsection.subsection_code === this.extractParentCode(entity, ['subsection', 'category']));
    }

    findParentDiagnosis(entity) {
        return this.diagnoses.find(diagnosis => diagnosis.diagnosis_code === this.extractParentCode(entity));
    }

    extractParentCode(entity, targetKinds = null) {
        if (!entity.parent) return null;

        for (const parentUrl of entity.parent) {
            const parentEntity = Array.from(this.hierarchyMap.values()).find(
                (v) => (v.uri === parentUrl || v.index === parentUrl)
            );

            if (parentEntity) {
                // If target kinds specified, check classification
                if (targetKinds && Array.isArray(targetKinds)) {
                    if (targetKinds.includes(parentEntity.classKind)) {
                        return parentEntity.code;
                    }
                } else {
                    return parentEntity.code;
                }
            }
        }
        return null;
    }

    checkInfectiousDiagnosis(entity) {
        // Implement logic to determine if a diagnosis is infectious
        // This might involve checking specific keywords, chapters, or using a predefined list
        const infectiousKeywords = ['infection', 'infectious', 'virus', 'bacteria', 'pathogen'];
        const description = entity.title?.['@value']?.toLowerCase() || '';
        
        return infectiousKeywords.some(keyword => description.includes(keyword));
    }

    async saveExtractedData() {
        const outputDir = path.resolve(__dirname, 'output');
        await fs.mkdir(outputDir, { recursive: true });

        const dataToSave = [
            { name: 'chapters', data: this.chapters },
            { name: 'sections', data: this.sections },
            { name: 'subsections', data: this.subsections },
            { name: 'diagnoses', data: this.diagnoses }
        ];

        for (const { name, data } of dataToSave) {
            const filePath = path.join(outputDir, `${name}.json`);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            logger.info(`Saved ${name} to ${filePath}`);
        }
    }
}

async function runExtractor() {
    const rootUrl = `https://id.who.int/icd/release/11/${ICD_VERSION}/mms`;
    const extractor = new ICD11DataExtractor(rootUrl);
    
    try {
        await extractor.extractHierarchicalData();
        logger.info('ICD-11 data extraction complete.');
    } catch (error) {
        logger.error(`Extraction failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { ICD11DataExtractor, runExtractor };