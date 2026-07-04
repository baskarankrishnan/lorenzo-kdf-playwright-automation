import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { locatorRepository, testCase, testStep, testCasesByExcel } from './interfaceUtils';
import path from 'path';
import fs from 'fs';
dotenv.config();


// Version utility function
export function getDBVersion(): string {
    const version = process.env.VERSION;

    switch (version) {
        case '08044303.0007800.UKI':
            return 'v2';
        default:
            return 'v1';
    }
}

// Main function to get element repository - SYNCHRONOUS
export async function getElementRepository(): Promise<locatorRepository> {
    const dbVersion = getDBVersion();
    const queryText = `
        SELECT 
            page, 
            element, 
            testid, 
            id, 
            css, 
            xpath, 
            role, 
            text 
        FROM public.elementrepository_${dbVersion}
        ORDER BY page, element
        LIMIT ALL
    `;

    // Create a new client for this synchronous operation
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        // Connect synchronously
        await client.connect();
        console.log('Connected to PostgreSQL database for repository fetch');
        
        // Execute query synchronously
        const result = await client.query(queryText);
        const rows = result.rows;
        
        console.log(`Fetched ${rows.length} element repository entries from database`);
        
        const repository: locatorRepository = {};

        for (const row of rows) {
            const page = row.page?.trim();
            const element = row.element?.trim();

            if (!page || !element) continue;

            if (!repository[page]) {
                repository[page] = {};
            }

            repository[page][element] = {
                testid: row.testid || undefined,
                id: row.id || undefined,
                cssselector: row.css || undefined,
                xpath: row.xpath || undefined,
                role: row.role || undefined,
                description: row.text || undefined
            };
        }

        return repository;
    } catch (error) {
        console.error('Error fetching element repository:', error);
        throw error;
    } finally {
        // Always close the connection
        if (client) {
            client.end();
            console.log('Repository fetch connection closed');
        }
    }
}

// Helper to resolve a Promise<locatorRepository> to a concrete locatorRepository
export async function resolveRepositoryFromPromise(repoPromise: Promise<locatorRepository>): Promise<locatorRepository> {
    try {
        const repo = await repoPromise;
        return repo;
    } catch (error) {
        console.error('Error resolving repository promise:', error);
        return {};
    }
}

// For backward compatibility - now async (returns a resolved locatorRepository)
export async function readLocatorRepository(): Promise<locatorRepository> {
    return await resolveRepositoryFromPromise(getElementRepository());
}

// Async connection functions for other async operations
export async function query(sql: string, params?: any[]): Promise<any> {
    const client = await createDbConnection();
    try {
        const result = await client.query(sql, params);
        return result.rows;
    } finally {
        await client.end();
    }
}

async function createDbConnection(): Promise<Client> {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
    
    await client.connect();
    console.log('Connected to PostgreSQL database');
    return client;
}

export async function getTestCaseData_DB(testCaseId: string): Promise<testCase> {
    const dbVersion = getDBVersion();
    const sqlQuery = `
        SELECT 
            stepno, 
            stepdescription, 
            page, 
            element, 
            elementtext, 
            actionkeyword, 
            property, 
            condition, 
            tablecolumnnames, 
            values, 
            datasetcolumnname 
        FROM public.testcasemaster_${dbVersion} 
        WHERE testcaseid = $1
        ORDER BY stepno
    `;

    try {
        // Import the query function to avoid naming conflict
        const rows = await query(sqlQuery, [testCaseId]);
        console.log(`Fetched ${rows.length} steps for test case: ${testCaseId} from database`);
        
        let inCommentBlock = false;
        let testCaseMetadata: Partial<testCase> = {};
        const testSteps: testStep[] = [];

        for (const row of rows) {
            const stepDescription = row.stepdescription || "";
            let isCommented = false;
            let isDDT = false;

            // Check for multi-line comment start
            if (stepDescription.trim().startsWith('/*')) {
                inCommentBlock = true;
                isCommented = true;
            }
            // Check for multi-line comment end
            else if (stepDescription.trim().startsWith('*/')) {
                isCommented = true;
                inCommentBlock = false;
            }
            // Check if inside comment block
            else if (inCommentBlock) {
                isCommented = true;
            }
            // Check for single line comment
            else if (stepDescription.trim().startsWith('//')) {
                isCommented = true;
            }

            // Check for test case metadata in step descriptions
            if (stepDescription.trim().toUpperCase().startsWith('TESTCASEID:')) {
                testCaseMetadata.testCaseId = stepDescription.split(':')[1]?.trim() || testCaseId;
                isCommented = true; // Mark metadata steps as commented
            } else if (stepDescription.trim().toUpperCase().startsWith('DESCRIPTION:')) {
                testCaseMetadata.testCaseDescription = stepDescription.split(':').slice(1).join(':').trim();
                isCommented = true;
            } else if (stepDescription.trim().toUpperCase().startsWith('MODULE:')) {
                testCaseMetadata.module = stepDescription.split(':')[1]?.trim();
                isCommented = true;
            } else if (stepDescription.trim().toUpperCase().startsWith('JIRA:')) {
                testCaseMetadata.jiraId = stepDescription.split(':')[1]?.trim();
                isCommented = true;
            } else if (stepDescription.trim().toUpperCase().startsWith('AUTHOR:')) {
                testCaseMetadata.author = stepDescription.split(':')[1]?.trim();
                isCommented = true;
            } else if (stepDescription.trim().toUpperCase().startsWith('EXCEL:')) {
                testCaseMetadata.excelName = stepDescription.split(':')[1]?.trim();
                isCommented = true;
            }

            // Check if this step is DDT (Data Driven Test)
            if (row.datasetcolumnname && row.datasetcolumnname.trim() !== '') {
                isDDT = true;
            }

            const testStep: testStep = {
                stepNo: row.stepno || 0,
                stepDescription: stepDescription,
                page: row.page || '',
                element: row.element || '',
                elementText: row.elementtext || '',
                actionKeyword: row.actionkeyword || '',
                property: row.property || '',
                condition: row.condition || '',
                tableColumnNames: row.tablecolumnnames || '',
                value: row.values || '', // Changed from 'values' to 'value' to match interface
                datasetColumnNames: row.datasetcolumnname || '', // Changed from 'datasetColumnName' to 'datasetColumnNames'
                isCommented: isCommented,
                isDDT: isDDT
            };

            testSteps.push(testStep);
        }

        // Count commented and DDT steps
        const commentedSteps = testSteps.filter(s => s.isCommented).length;
        const ddtSteps = testSteps.filter(s => s.isDDT).length;
        
        console.log(`Processed ${testSteps.length} steps (Commented: ${commentedSteps}, DDT: ${ddtSteps})`);

        // Create the final testCase object
        const testCaseData: testCase = {
            testCaseId: testCaseMetadata.testCaseId || testCaseId,
            testCaseDescription: testCaseMetadata.testCaseDescription || '',
            module: testCaseMetadata.module || '',
            jiraId: testCaseMetadata.jiraId || '',
            author: testCaseMetadata.author || '',
            excelName: testCaseMetadata.excelName || '',
            isDDT: ddtSteps > 0,
            testSteps: testSteps
        };

        return testCaseData;
    } catch (error) {
        console.error('Error fetching test case data:', error);
        throw error;
    }
}

// Helper function to get PageAction steps from database
export async function getPageActionStepsFromDB(excelName: string, sheetName: string): Promise<testStep[]> {
    const dbVersion = getDBVersion();
    const sqlQuery = `
        SELECT 
            stepno, 
            stepdescription, 
            page, 
            element, 
            elementtext, 
            actionkeyword, 
            property, 
            condition, 
            tablecolumnnames, 
            values, 
            datasetcolumnname 
        FROM public.pageaction_${dbVersion}
        WHERE excelname = $1 AND sheetname = $2
        ORDER BY stepno
    `;

    const rows = await query(sqlQuery, [excelName, sheetName]);

    if (!rows || rows.length === 0) {
        throw new Error(`No PageAction steps found in database for ${excelName} - ${sheetName}`);
    }

    let inCommentBlock = false;
    const pageActionSteps: testStep[] = [];

    for (const row of rows) {
        const stepDescription = row.stepdescription || "";
        let isCommented = false;
        let isDDT = false;

        // Check for multi-line comment start
        if (stepDescription.trim().startsWith('/*')) {
            inCommentBlock = true;
            isCommented = true;
        }
        // Check for multi-line comment end
        else if (stepDescription.trim().startsWith('*/')) {
            isCommented = true;
            inCommentBlock = false;
        }
        // Check if inside comment block
        else if (inCommentBlock) {
            isCommented = true;
        }
        // Check for single line comment
        else if (stepDescription.trim().startsWith('//')) {
            isCommented = true;
        }

        // Check if this step is DDT (Data Driven Test)
        if (row.datasetcolumnname && row.datasetcolumnname.trim() !== '') {
            isDDT = true;
        }

        const testStep: testStep = {
            stepNo: row.stepno || 0,
            stepDescription: stepDescription,
            page: row.page || '',
            element: row.element || '',
            elementText: row.elementtext || '',
            actionKeyword: row.actionkeyword || '',
            property: row.property || '',
            condition: row.condition || '',
            tableColumnNames: row.tablecolumnnames || '',
            value: row.values || '',
            datasetColumnNames: row.datasetcolumnname || '',
            isCommented: isCommented,
            isDDT: isDDT
        };

        pageActionSteps.push(testStep);
    }

    return pageActionSteps;
}

export async function readExecutableScenarios(packName: string): Promise<testCasesByExcel> {
    try {
        console.log(`📋 Fetching executable scenarios for pack: ${packName}`);
       
        // Get the pack column name based on input (smoke or regression)
        const packColumn = packName.toLowerCase();
       
        // First, get all modules and excel files marked for this pack from testexecutionplanner
        const plannerQuery = `
            SELECT
                module,
                excelname,
                testcaseid
            FROM public.testexecutionplanner
            WHERE ${packColumn} = 'Yes'
            ORDER BY module, excelname
        `;
 
        const plannerRows = await query(plannerQuery);
       
        if (!plannerRows || plannerRows.length === 0) {
            console.log(`⚠️ No test execution planner entries found for pack: ${packName}`);
            return {};
        }
 
        console.log(`✅ Found ${plannerRows.length} planner entries for pack: ${packName}`);
 
        const result: testCasesByExcel = {};
        const processedFiles = new Set<string>();
 
        // Group by module and excelname for efficient processing
        const groupedByExcel = plannerRows.reduce((acc: any, row: any) => {
            const module = row.module?.trim() || '';
            const excelName = row.excelname?.trim() || '';
           
            if (!module || !excelName) return acc;
           
            const fileKey = `${module}_${excelName}`;
           
            if (!acc[fileKey]) {
                acc[fileKey] = {
                    module,
                    excelName,
                    count: 0
                };
            }
           
            acc[fileKey].count++;
            return acc;
        }, {});
 
        // Process each excel file
        for (const fileKey in groupedByExcel) {
            const { module, excelName } = groupedByExcel[fileKey];
           
            if (processedFiles.has(fileKey)) continue;
            processedFiles.add(fileKey);
           
            console.log(`🔍 Processing: ${module}/${excelName}`);
           
            // Get ALL test cases for this module and excelname from testcaseplanner
            const testCasePlannerQuery = `
                SELECT
                    module,
                    excelname,
                    testcaseid,
                    jiraid,
                    jiradescription,
                    bugid,
                    isddt,
                    ddtstartno,
                    ddtendno,
                    tailoredby,
                    testplankey,
                    testexecutionkey,
                    posttojira
                FROM public.testcaseplanner
                WHERE module = $1
                AND excelname = $2
                ORDER BY testcaseid
            `;
           
            const testCaseRows = await query(testCasePlannerQuery, [module, excelName]);
           
            if (!testCaseRows || testCaseRows.length === 0) {
                console.log(`⚠️ No test cases found in testcaseplanner for ${module}/${excelName}`);
                continue;
            }
           
            const excelKey = excelName.replace(/\.xlsx$/i, '');
            result[excelKey] = {
                module,
                testCases: []
            };
           
            testCaseRows.forEach((row: any) => {
                const testcaseId = row.testcaseid?.trim() || '';
                const jiraId = row.jiraid?.trim() || '';
                const description = row.jiradescription?.trim() || '';
                const author = row.tailoredby?.trim() || '';
                const isDDt = (row.isddt?.toString().toLowerCase() === 'yes' ||
                             row.isddt?.toString().toLowerCase() === 'true' ||
                             row.isddt === true) ? 'Yes' : 'No';
                const ddtStartRow = row.ddtstartno?.toString() || '';
                const ddtEndRow = row.ddtendno?.toString() || '';
               
                if (testcaseId) {
                    result[excelKey].testCases.push({
                        testcaseId,
                        jiraId,
                        description,
                        author,
                        isDDt,  
                        ddtStartRow,
                        ddtEndRow
                    });
                }
            });
           
            console.log(`✅ Loaded ${result[excelKey].testCases.length} test cases from ${module}/${excelName}`);
        }
       
        const totalTestCases = Object.values(result).reduce((sum, excel) => sum + excel.testCases.length, 0);
        console.log(`🎉 Total ${totalTestCases} test cases loaded from ${Object.keys(result).length} Excel files`);
       
        return result;
       
    } catch (error) {
        console.error(`❌ Failed to get executable scenarios from database: ${error}`);
        return {};
    }
}
 

export async function getExecutableScenarios(packName: string): Promise<testCasesByExcel> {
    return await resolveExecutableScenariosFromPromise(readExecutableScenarios(packName));
}

// Helper to resolve a Promise<testCasesByExcel> to a concrete testCasesByExcel
export async function resolveExecutableScenariosFromPromise(
    scenariosPromise: Promise<testCasesByExcel>
): Promise<testCasesByExcel> {
    try {
        const scenarios = await scenariosPromise;
        return scenarios;
    } catch (error) {
        console.error('Error resolving executable scenarios promise:', error);
        return {};
    }
}

export default async function globalSetup() {
  try {
    if (process.env.PLANNER_REPOSITORY_SOURCE !== 'db') {
      console.log('📋 Planner source is not DB. Skipping DB preload.');
      return;
    }

    const packName = process.env.EXECUTION_PACK || '';

    console.log('📋 Preloading planner from DB for pack:', packName);

    const scenarios = await readExecutableScenarios(packName);

    const cachePath = path.join(process.cwd(), 'planner-cache.json');

    fs.writeFileSync(cachePath, JSON.stringify(scenarios, null, 2));

    console.log('✅ Planner cached before test discovery');

  } catch (err) {
    console.error('❌ Global setup DB preload failed:', err);
    throw err; // important → fail fast
  }
}