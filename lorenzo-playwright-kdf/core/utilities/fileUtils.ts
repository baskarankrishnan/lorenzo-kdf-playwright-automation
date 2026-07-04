import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { testCase, testStep, locatorRepository, testCasesByExcel } from './interfaceUtils';
import { config } from 'dotenv';

// Suppress dotenv output
const originalLog = console.log;
console.log = () => { };
config();
console.log = originalLog;


export function getExecutableScenarios(packName: string): testCasesByExcel {
    try {
        const plannerPath = process.env.EXECUTION_PLANNER || '';
        if (!fs.existsSync(plannerPath)) return {};

        const workbook = xlsx.readFile(plannerPath);
        const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'planner');
        if (!sheetName) return {};

        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" }) as any[];
        const filteredData = jsonData.filter(row => {
            const packValue = row[packName] || row[packName.toLowerCase()] || row[packName.toUpperCase()];
            return packValue?.toString().toLowerCase() === 'yes';
        });

        const result: testCasesByExcel = {};
        const processedFiles = new Set<string>();

        filteredData.forEach(row => {
            const module = row.Module || row.module || '';
            const excelName = row.ExcelName || row.excelName || row.excelname || '';
            const fileKey = `${module}_${excelName}`;


            if (!module || !excelName || processedFiles.has(fileKey)) return;
            processedFiles.add(fileKey);

            const filePath = `./excelFramework/testcasePlanner/${module}/${excelName}.xlsx`;
            if (!fs.existsSync(filePath)) return;

            const testCaseWorkbook = xlsx.readFile(filePath);
            const testCaseSheetName = testCaseWorkbook.SheetNames.find(name => name.toLowerCase() === 'planner');
            if (!testCaseSheetName) return;

            const testCaseData = xlsx.utils.sheet_to_json(testCaseWorkbook.Sheets[testCaseSheetName], { defval: "" }) as any[];

            const excelKey = excelName.replace(/\.xlsx$/i, '');
            result[excelKey] = { module, testCases: [] };

            testCaseData.forEach(scenario => {
                const packValue = scenario[packName] || scenario[packName.toLowerCase()] || scenario[packName.toUpperCase()];
                if (packValue?.toString().toLowerCase() !== 'yes') return;

                const testcaseId = scenario.TestcaseId || scenario.testcaseId || scenario.testcaseid || '';
                const jiraId = scenario.JiraId || scenario.jiraId || scenario.jiraid || '';
                const description = scenario.Description || scenario.description || '';
                const author = scenario.Author || scenario.author || '';
                const isDDt = scenario.IsDDT || scenario.isDDT || scenario.isddt || 'No';
                const ddtStartRow = scenario.DDTStartRow || scenario.ddtStartRow || scenario.ddtstartrow || '';
                const ddtEndRow = scenario.DDTEndRow || scenario.ddtEndRow || scenario.ddtendrow || '';

                if (testcaseId) {
                    result[excelKey].testCases.push({ testcaseId, jiraId, description, author, isDDt, ddtStartRow, ddtEndRow });
                }
            });
        });

        return result;
    } catch (error) {
        console.error(`Failed to get executable scenarios: ${error}`);
        return {};
    }
}

export function readTestCasesFromExcel(module: string, excelName: string, testCaseId: string, jiraId?: string, description?: string, author?: string): testCase {
    const filePath = module
        ? `./excelFramework/Testcases/${module}/${excelName}.xlsx`
        : `./excelFramework/Testcases/${excelName}.xlsx`;
    //const filePath = `./product/TESTHCIS_DATABASE.xlsm`;
    if (!fs.existsSync(filePath)) return {} as testCase;

    const workbook = xlsx.readFile(filePath);

    // Support both legacy (sheet named by testCaseId) and new 4-sheet format (TestExecution sheet)
    const worksheet = workbook.Sheets[testCaseId] || workbook.Sheets['TestExecution'];
    if (!worksheet) return {} as testCase;

    const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
    const testSteps: testStep[] = jsonData.map(row => ({
        stepNo: Number(row.StepNo || row.stepNo || 0),
        stepDescription: row.StepDescription || row.stepDescription || '',
        page: row.Page || row.page || '',
        element: row.Element || row.element || '',
        elementText: row.ElementText || row.elementText || '',
        actionKeyword: row.ActionKeyword || row.actionKeyword || '',
        property: row.Property || row.property || '',
        condition: row.Condition || row.condition || '',
        tableColumnNames: row.TableColumnNames || row.tableColumnNames || '',
        value: row.Values || row.value || '',
        datasetColumnNames: row.DatasetColumnName || row.datasetColumnNames || '',
        isCommented: false
    }));

    return {
        testCaseId,
        testCaseDescription: description || '',
        module,
        jiraId: jiraId || '',
        excelName,
        testSteps: processCommentedSteps(testSteps.sort((a, b) => a.stepNo - b.stepNo)),
        author: author || ''
    };
}

/**
 * Read test dataset from the TestData sheet embedded in the same workbook (4-sheet format).
 * Returns a map of columnName -> value for the given data row (1-based).
 */
export function readTestDataFromExcel(module: string, excelName: string, ddtRow: number = 1): Record<string, string> {
    const filePath = module
        ? `./excelFramework/Testcases/${module}/${excelName}.xlsx`
        : `./excelFramework/Testcases/${excelName}.xlsx`;
    if (!fs.existsSync(filePath)) return {};

    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets['TestData'];
    if (!worksheet) return {};

    const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
    // Row 1 = headers, row 2+ = data rows. ddtRow=1 means first data row.
    const dataRow = jsonData[ddtRow - 1];
    if (!dataRow) return {};

    const result: Record<string, string> = {};
    for (const key of Object.keys(dataRow)) {
        result[key] = String(dataRow[key]);
    }
    return result;
}

export function readLocatorRepository(): locatorRepository {
    const filePath = process.env.ELEMENT_REPOSITORY_PATH || '';
    const sheetName = 'elementrepository';
    if (!fs.existsSync(filePath)) return {};

    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return {};

    const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
    const repository: locatorRepository = {};

    jsonData.forEach(row => {
        const pageName = row.page || '';
        const elementName = row.element || '';
        if (!pageName || !elementName) return;

        if (!repository[pageName]) repository[pageName] = {};
        repository[pageName][elementName] = {
            testid: row.testid,
            id: row.id,
            cssselector: row.css,
            xpath: row.xpath,
            role: row.role,
            description: row.description
        };
    });

    return repository;
}

export function processCommentedSteps(testSteps: testStep[]): testStep[] {
    let inCommentBlock = false;
    testSteps.forEach(step => {
        const description = step.stepDescription.trim();
        if (description.startsWith('//')) {
            step.isCommented = true;
        } else if (description.startsWith('/*')) {
            inCommentBlock = true;
            step.isCommented = true;
        } else if (description.startsWith('*/')) {
            step.isCommented = true;
            inCommentBlock = false;
        } else if (inCommentBlock) {
            step.isCommented = true;
        }
    });
    return testSteps;
}

export function exportTestVariables(variablesData: { [key: string]: any }, exportPath: string, fileName: string): void {
    if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath, { recursive: true });
    fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(variablesData, null, 2), 'utf-8');
}

export function initializeVariables(exportPath: string, fileName: string): void {
    if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath, { recursive: true });
    const fullPath = path.join(exportPath, fileName);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

export function exportCapturedData(
    excelName: string,
    module: string,
    data: { [key: string]: any },
    lastTestId: string,
    executionTimestamp: string,
    capturedDataDir: string
): void {
    if (Object.keys(data).length === 0) {
        console.log(`⚠ No captured data for ${excelName}`);
        return;
    }

    // Ensure directory exists
    if (!fs.existsSync(capturedDataDir)) {
        fs.mkdirSync(capturedDataDir, { recursive: true });
    }

    // Create Excel file with keys as column names and values in row 1
    const excelData: any[] = [];
    const dataRow: { [key: string]: any } = {};

    for (const [key, value] of Object.entries(data)) {
        dataRow[key] = value;
    }
    excelData.push(dataRow);

    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);

    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'CapturedData');

    // Generate Excel file name
    const excelFileName = `${module}_${excelName}_${executionTimestamp}.xlsx`;
    const excelFilePath = path.join(capturedDataDir, excelFileName);

    // Write Excel file
    xlsx.writeFile(workbook, excelFilePath);

    console.log(`✓ Exported: ${excelFileName} (from ${lastTestId}: ${Object.keys(data).join(', ')})`);
}

export function exportConsoleLogs(
    testTitle: string,
    parentTitle: string,
    logs: string[],
    status: string,
    duration: number,
    executionTimestamp: string,
    consoleLogsDir: string
): void {
    if (logs.length === 0) return;

    // Ensure directory exists
    if (!fs.existsSync(consoleLogsDir)) {
        fs.mkdirSync(consoleLogsDir, { recursive: true });
    }

    // Create sanitized filename
    const testKey = `${parentTitle}_${testTitle}`;
    const sanitizedTestKey = testKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const logFileName = `${sanitizedTestKey}_${executionTimestamp}.txt`;
    const logFilePath = path.join(consoleLogsDir, logFileName);

    // Prepare log content
    const logContent = [
        `=== Console Logs for Test ===`,
        `Test: ${parentTitle} - ${testTitle}`,
        `Status: ${status}`,
        `Duration: ${duration}ms`,
        `Timestamp: ${new Date().toISOString()}`,
        `${'='.repeat(50)}`,
        '',
        ...logs,
        '',
        `${'='.repeat(50)}`,
        `End of logs`
    ].join('\n');

    fs.writeFileSync(logFilePath, logContent, 'utf-8');
}
