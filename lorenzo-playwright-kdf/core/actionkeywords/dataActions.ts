import { Page } from "@playwright/test";
import { testStep, executionContext, Outcome, stepExecutionResult, NetworkContext} from "../utilities/interfaceUtils";
import { getCurrentTimeStamp, formatDateTime, adjustDate } from "../utilities/dateUtils";
import { captureScreenshot } from "../utilities/imageUtils";
import { BrowserFocusTracker } from "./browserActions";
import { getPageActionStepsFromDB } from "../utilities/databaseUtils";
import { getActionKeywordFunction } from '../../product/actionregistry';
import { resolvePageForStep }  from './browserActions';
import { substituteVariables, extractVariables, validateVariables } from "../utilities/variableSubstitution";
import { VariableManager } from "../utilities/variableManager";
import path from "path";
import fs from "fs";

export function resolveTestVariables(value: string, logPrefix: string = ''): string {
    if (!value || typeof value !== 'string') {
        return value;
    }

    const originalValue = value;
    let processedValue = originalValue;

    // First, use enhanced variable substitution for built-in variables
    processedValue = substituteVariables(processedValue);

    // Then, resolve stored variables from variableManager
    const varManager = executionContext.getVariableManager();
    if (varManager) {
        processedValue = varManager.substitute(processedValue);
    }

    // Finally, use legacy resolution from executionContext
    processedValue = processedValue.replace(/_(\w+)/g, (match, varName) => {
        const fullVarName = `_${varName}`;
        if (executionContext.hasVariable(fullVarName)) {
            const resolvedValue = executionContext.getVariableValue(fullVarName);
            console.log(`${logPrefix}🔄 Resolved ${fullVarName} = ${resolvedValue}`);
            return resolvedValue;
        }
        return match;
    });

    if (originalValue !== processedValue) {
        console.log(`${logPrefix}🔄 Variable resolved: "${originalValue}" → "${processedValue}"`);
    }

    return processedValue;
}

export function resolveDatasetVariable(
    datasetColumnName: string,
    moduleName: string,
    excelName: string,
    sheetName: string,
    ddtRow: number = 1
): string {
    try {
        if (!datasetColumnName?.trim()) return '';

        const datasetPath = excelName.startsWith('Action')
            ? path.join(`./product/datasets/${process.env.PRODUCT_NAME}/pageActions`, `DS_${excelName}.xlsx`)
            : path.join(`./product/datasets/${process.env.PRODUCT_NAME}/testCases`, moduleName, `DS_${excelName}.xlsx`);

        if (!fs.existsSync(datasetPath)) return datasetColumnName;

        const xlsx = require('xlsx');
        const workbook = xlsx.readFile(datasetPath);
        if (!workbook.Sheets[sheetName]) return datasetColumnName;

        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" }) as any[];
        if (!jsonData?.length) return datasetColumnName;

        const dataRow = jsonData.find(row => Number(row['S.No'] || row['SNo']) === ddtRow);
        if (!dataRow) return datasetColumnName;

        if (datasetColumnName.includes('|')) {
            return datasetColumnName.split('|')
                .map(col => String(dataRow[col.trim()] || col.trim()))
                .join('|');
        }

        return String(dataRow[datasetColumnName.trim()] || datasetColumnName);

    } catch (error) {
        console.error(`  ❌ Failed to resolve dataset variable: ${error}`);
        return datasetColumnName;
    }
}

export async function setVariable(page: Page, step: testStep): Promise<Outcome> {
    try {
        const valueString = step.value || '';
        const valueArray = valueString.split('|');

        const varName = valueArray[0].trim();
        let value = '';

        for (let i = 1; i < valueArray.length; i++) {
            const part = valueArray[i].trim();
            const resolvedPart = resolveTestVariables(part);
            value = (i === 1) ? resolvedPart : value + resolvedPart;
        }

        const finalVarName = varName.startsWith('_') ? varName : `_${varName}`;
        executionContext.addVariable(finalVarName, value);

        console.log(`  💾 Set variable: ${finalVarName} = "${value}"`);

        return {
            code: 0,
            value: `Variable ${finalVarName} set to "${value}"`
        };
    } catch (error) {
        console.error(`  ❌ Failed to set variable: ${error}`);
        return {
            code: 1,
            value: `Failed to set variable: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function getCurrentDateTime(page: Page, step: testStep): Promise<Outcome> {
    try {
        const parts = step.value.split('|').map(s => s.trim()).filter(Boolean);

        let result: string;
        let finalKey: string;

        if (parts.length === 2) {
            const [expFormat, key] = parts;
            result = getCurrentTimeStamp(expFormat);
            finalKey = key.startsWith('_') ? key : `_${key}`;
        } else if (parts.length === 3) {
            const [baseDate, offset, expFormat] = parts;
            const adjustedDate = adjustDate(baseDate, offset, true);
            result = formatDateTime(adjustedDate, expFormat);
            finalKey = '_Currentdate';
        } else if (parts.length === 4) {
            const [baseDate, offset, expFormat, key] = parts;
            const adjustedDate = adjustDate(baseDate, offset, true);
            result = formatDateTime(adjustedDate, expFormat);
            finalKey = key.startsWith('_') ? key : `_${key}`;
        } else {
            throw new Error('Invalid parameters for getCurrentDateTime. Expected format: expFormat|varName or baseDate|offset|expFormat[|varName]');
        }

        executionContext.addVariable(finalKey, result);

        console.log(`  📅 Current date/time stored in ${finalKey}: ${result}`);

        return {
            code: 0,
            value: `Current date/time stored in ${finalKey}: ${result}`
        };
    }
    catch (error) {
        console.error(`  ❌ Failed to get current date/time: ${error}`);
        return {
            code: 1,
            value: `Failed to get current date/time: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function getPastDateTime(page: Page, step: testStep): Promise<Outcome> {
    try {
        const valueArray = step.value.split('|').map(s => s.trim());

        if (valueArray.length !== 4) {
            return {
                code: 1,
                value: `Invalid parameter count. Expected 4 (baseDate|offset|expFormat|varName), got ${valueArray.length}`
            };
        }

        const [baseDate, offset, expFormat, varName] = valueArray;

        const adjustedDate = adjustDate(baseDate, offset, false);
        const formattedDate = formatDateTime(adjustedDate, expFormat);

        const finalKey = varName.startsWith('_') ? varName : `_${varName}`;
        executionContext.addVariable(finalKey, formattedDate);

        console.log(`  📅 Past date/time stored in ${finalKey}: ${formattedDate}`);

        return {
            code: 0,
            value: `Past date/time stored in ${finalKey}: ${formattedDate}`
        };
    } catch (error) {
        console.error(`  ❌ Failed to get past date/time: ${error}`);
        return {
            code: 1,
            value: `Failed to get past date/time: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function getFutureDateTime(page: Page, step: testStep): Promise<Outcome> {
    try {

        const valueArray = step.value.split('|').map(s => s.trim());

        if (valueArray.length !== 4) {
            return {
                code: 1,
                value: `Invalid parameter count. Expected 4 (baseDate|offset|expFormat|varName), got ${valueArray.length}`
            };
        }

        const [baseDate, offset, expFormat, varName] = valueArray;

        const adjustedDate = adjustDate(baseDate, offset, true);
        const formattedDate = formatDateTime(adjustedDate, expFormat);

        const finalKey = varName.startsWith('_') ? varName : `_${varName}`;
        executionContext.addVariable(finalKey, formattedDate);

        console.log(`  📅 Future date/time stored in ${finalKey}: ${formattedDate}`);

        return {
            code: 0,
            value: `Future date/time stored in ${finalKey}: ${formattedDate}`
        };
    } catch (error) {
        console.error(`  ❌ Failed to get future date/time: ${error}`);
        return {
            code: 1,
            value: `Failed to get future date/time: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function getUniqueValue(page: Page, step: testStep): Promise<Outcome> {
    try {
        const varName = step.value.trim();

        if (!varName) {
            return {
                code: 1,
                value: 'Variable name is required'
            };
        }

        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const uniqueValue = `${month}${year}${hours}${minutes}${seconds}`;

        const finalKey = varName.startsWith('_') ? varName : `_${varName}`;
        executionContext.addVariable(finalKey, uniqueValue);

        console.log(`  🔢 Generated unique value: ${finalKey} = "${uniqueValue}"`);

        return {
            code: 0,
            value: `Unique value stored in ${finalKey}: ${uniqueValue}`
        };
    } catch (error) {
        console.error(`  ❌ Failed to generate unique value: ${error}`);
        return {
            code: 1,
            value: `Failed to generate unique value: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function toLowerCase(page: Page, step: testStep): Promise<Outcome> {
    try {
        const resolvedValue = resolveTestVariables(step.value);
        const [inputValue, outputVar] = resolvedValue.split('|').map(s => s.trim());

        if (!inputValue || !outputVar) {
            return {
                code: 1,
                value: 'Invalid parameters. Expected format: input|outputVar'
            };
        }

        const result = inputValue.toLowerCase();
        const finalKey = outputVar.startsWith('_') ? outputVar : `_${outputVar}`;
        executionContext.addVariable(finalKey, result);

        console.log(`  🔡 Converted to lowercase: ${finalKey} = "${result}"`);

        return {
            code: 0,
            value: `Lowercase value stored in ${finalKey}: ${result}`
        };
    } catch (error) {
        console.error(`  ❌ Failed to convert to lowercase: ${error}`);
        return {
            code: 1,
            value: `Failed to convert to lowercase: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function toUpperCase(page: Page, step: testStep): Promise<Outcome> {
    try {
        const resolvedValue = resolveTestVariables(step.value);
        const [inputValue, outputVar] = resolvedValue.split('|').map(s => s.trim());

        if (!inputValue || !outputVar) {
            return {
                code: 1,
                value: 'Invalid parameters. Expected format: input|outputVar'
            };
        }

        const result = inputValue.toUpperCase();
        const finalKey = outputVar.startsWith('_') ? outputVar : `_${outputVar}`;
        executionContext.addVariable(finalKey, result);

        console.log(`  🔠 Converted to uppercase: ${finalKey} = "${result}"`);

        return {
            code: 0,
            value: `Uppercase value stored in ${finalKey}: ${result}`
        };
    } catch (error) {
        console.error(`  ❌ Failed to convert to uppercase: ${error}`);
        return {
            code: 1,
            value: `Failed to convert to uppercase: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function trim(page: Page, step: testStep): Promise<Outcome> {
    try {
        const resolvedValue = resolveTestVariables(step.value);
        const [inputValue, outputVar] = resolvedValue.split('|').map(s => s.trim());

        if (!inputValue || !outputVar) {
            return {
                code: 1,
                value: 'Invalid parameters. Expected format: input|outputVar'
            };
        }

        const result = inputValue.trim();
        const finalKey = outputVar.startsWith('_') ? outputVar : `_${outputVar}`;
        executionContext.addVariable(finalKey, result);

        console.log(`  ✂️ Trimmed value: ${finalKey} = "${result}"`);

        return {
            code: 0,
            value: `Trimmed value stored in ${finalKey}: ${result}`
        };
    } catch (error) {
        console.error(`  ❌ Failed to trim: ${error}`);
        return {
            code: 1,
            value: `Failed to trim: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function concatenate(page: Page, step: testStep): Promise<Outcome> {
    try {
        const resolvedValue = resolveTestVariables(step.value);
        const parts = resolvedValue.split('|');

        if (parts.length < 2) {
            return {
                code: 1,
                value: 'Invalid parameters. Expected format: value1|value2|...|outputVar (minimum 2 parts)'
            };
        }

        const outputVar = parts[parts.length - 1].trim();

        if (!outputVar) {
            return {
                code: 1,
                value: 'Output variable name cannot be empty'
            };
        }

        const valuesToConcat = parts.slice(0, -1);
        const result = valuesToConcat
            .map(part => {
                const trimmed = part.trim();
                return trimmed === '' ? ' ' : trimmed;
            })
            .join('');

        const finalKey = outputVar.startsWith('_') ? outputVar : `_${outputVar}`;
        executionContext.addVariable(finalKey, result);

        console.log(`  🔗 Concatenated values: ${finalKey} = "${result}"`);

        return {
            code: 0,
            value: `Concatenated value stored in ${finalKey}: ${result}`
        };
    } catch (error) {
        console.error(`  ❌ Failed to concatenate: ${error}`);
        return {
            code: 1,
            value: `Failed to concatenate: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function getSubString(page: Page, step: testStep): Promise<Outcome> {
    try {
        const resolvedValue = resolveTestVariables(step.value);
        const [input, startRaw, lengthRaw, outputVar] = resolvedValue.split('|').map(s => s.trim());

        if (!input || !startRaw || !outputVar) {
            return {
                code: 1,
                value: 'Invalid parameters. Expected format: input|start|length|outputVar'
            };
        }

        if (!input) {
            return {
                code: 1,
                value: `Input text is empty or missing`
            };
        }

        let startPos: number;
        if (startRaw.toLowerCase() === 'last') {
            startPos = input.length;
        } else {
            startPos = parseInt(startRaw, 10) - 1;
        }

        let substring: string;
        if (!lengthRaw) {
            substring = startRaw.toLowerCase() === 'last'
                ? input.substring(startPos - 1)
                : input.substring(startPos);
        } else {
            const charLen = parseInt(lengthRaw, 10);
            substring = startRaw.toLowerCase() === 'last'
                ? input.substring(startPos - charLen, startPos)
                : input.substring(startPos, startPos + charLen);
        }

        const finalKey = outputVar.startsWith('_') ? outputVar : `_${outputVar}`;
        executionContext.addVariable(finalKey, substring);

        console.log(`  ✂️ Extracted substring: ${finalKey} = "${substring}"`);

        return {
            code: 0,
            value: `Substring stored in ${finalKey}: ${substring}`
        };
    } catch (error) {
        console.error(`  ❌ Failed to get substring: ${error}`);
        return {
            code: 1,
            value: `Failed to get substring: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function callCommonScripts(
    page: Page,
    actualTestCaseStep: testStep,
    screenshotBasePath?: string,
    testCaseId?: string,
    focusTracker?: BrowserFocusTracker
): Promise<Outcome> {
    try {
        const actualStepNo = actualTestCaseStep.stepNo;
        console.log(`  🔄 Starting PageActions execution for test step ${actualStepNo}...`);
 
        if (!actualTestCaseStep.value) {
            return {
                code: 1,
                value: 'Values parameter is required. Format: sheetName|excelName',
                data: []
            };
        }
 
        const [sheetName, excelName] = actualTestCaseStep.value.split('|').map(s => s.trim());
 
        if (!sheetName || !excelName) {
            return {
                code: 1,
                value: 'Invalid parameters. Expected format: sheetName|excelName',
                data: []
            };
        }
 
        console.log(`  📋 Executing PageActions: Sheet '${sheetName}' from Excel '${excelName}'`);
 
        let pageActionSteps: testStep[] = [];
 
        // Determine source of PageActions (Excel or Database)
        const pageActionSource = process.env.LOCATOR_REPOSITORY_SOURCE || 'excel';
 
        if (pageActionSource.toLowerCase() === 'db' || pageActionSource.toLowerCase() === 'database') {
            // Get PageActions from database
            try {
                pageActionSteps = await getPageActionStepsFromDB(excelName, sheetName);
                console.log(`  ✅ Loaded ${pageActionSteps.length} PageAction steps from database (${excelName} - ${sheetName})`);
            } catch (dbError) {
                console.error(`  ❌ Failed to load PageActions from database: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
                console.log(`  🔄 Falling back to Excel file...`);
               
                // Fall back to Excel
                pageActionSteps = await getPageActionStepsFromExcel(excelName, sheetName);
                console.log(`  ✅ Loaded ${pageActionSteps.length} PageAction steps from Excel (${excelName} - ${sheetName})`);
            }
        } else {
            // Default: Get PageActions from Excel
            pageActionSteps = await getPageActionStepsFromExcel(excelName, sheetName);
            console.log(`  ✅ Loaded ${pageActionSteps.length} PageAction steps from Excel (${excelName} - ${sheetName})`);
        }
 
        if (!pageActionSteps || pageActionSteps.length === 0) {
            console.error(`  ❌ No PageAction steps found for ${excelName} - ${sheetName}`);
            return {
                code: 1,
                value: `No PageAction steps found for ${excelName} - ${sheetName}`,
                data: []
            };
        }
 
        let isMLCommented = false;
        let overallStatus = 0;
        const pageActionStepResults: stepExecutionResult[] = [];
        let stopExecution = false;
 
        for (let i = 0; i < pageActionSteps.length; i++) {
            const pageActionStep = pageActionSteps[i];
            const pageActionStepStartTime = new Date();
 
            const stepDescription = pageActionStep.stepDescription.trim();
            let outcome = 0;
            let returnText = '';
 
            console.log(`    ➡️  PageAction Step ${actualStepNo}.${pageActionStep.stepNo}: ${stepDescription || 'No description'}`);
 
            if (stepDescription.startsWith('/*')) {
                isMLCommented = true;
                pageActionStep.isCommented = true;
            }
 
            if (stepDescription.startsWith('*/')) {
                isMLCommented = false;
                pageActionStep.isCommented = true;
            }
 
            const isSingleLineCommented = stepDescription.startsWith('//');
 
            if (isSingleLineCommented || isMLCommented) {
                outcome = 2;
                returnText = 'Step skipped (commented)';
                pageActionStep.isCommented = true;
                console.log(`    ⏭️  Step skipped (commented)`);
            } else if (stopExecution) {
                outcome = 3;
                returnText = 'Step not executed (previous PageAction step failed)';
                console.log(`    ⏭️  Step not executed (previous step failed)`);
            } else if (!pageActionStep.actionKeyword || pageActionStep.actionKeyword.trim() === '') {
                outcome = 2;
                returnText = 'Step skipped (no action keyword)';
                console.log(`    ⏭️  Step skipped (no action keyword)`);
            } else {
                try {
                    console.log(`    🔄 Executing: ${pageActionStep.actionKeyword}`);
 
                    if (pageActionStep.elementText && typeof pageActionStep.elementText === 'string') {
                        pageActionStep.elementText = resolveTestVariables(pageActionStep.elementText, '    ');
                    }
 
                    pageActionStep.isDDT = false;
                    if (pageActionStep.datasetColumnNames && typeof pageActionStep.datasetColumnNames === 'string') {
                        pageActionStep.isDDT = true;
                        pageActionStep.datasetColumnNames = resolveDatasetVariable(
                            pageActionStep.datasetColumnNames,
                            '',
                            excelName,
                            sheetName,
                            1
                        );
                    }
 
                    const actionFunction = getActionKeywordFunction(pageActionStep.actionKeyword);
                    if (!actionFunction) {
                        throw new Error(`Action keyword not found: ${pageActionStep.actionKeyword}`);
                    }
 
                    let activePage: Page;
                    if (focusTracker) {
                        activePage = await resolvePageForStep(pageActionStep.page, focusTracker);
                    } else {
                        activePage = page;
                    }
 
                    if (!activePage || activePage.isClosed()) {
                        throw new Error('No active page available for PageAction step execution');
                    }
 
                    console.log(`    🔍 Resolved page: ${activePage.url() || 'Initial Page'}`);
 
                    const result = await actionFunction(activePage, pageActionStep);
 
                    if (result && typeof result === 'object' && 'code' in result) {
                        if (result.code !== 0) {
                            outcome = 1;
                            overallStatus = 1;
                            stopExecution = true;
                            returnText = result.value || 'PageAction step failed';
                            console.error(`    ❌ PageAction Step ${actualStepNo}.${pageActionStep.stepNo} failed: ${returnText}`);
                        } else {
                            returnText = result.value || 'PageAction step executed successfully';
                            console.log(`    ✅ PageAction Step ${actualStepNo}.${pageActionStep.stepNo} passed`);
                        }
                    } else {
                        returnText = 'PageAction step executed successfully';
                        console.log(`    ✅ PageAction Step ${actualStepNo}.${pageActionStep.stepNo} passed`);
                    }
 
                } catch (stepError: any) {
                    outcome = 1;
                    overallStatus = 1;
                    stopExecution = true;
                    returnText = `PageAction step failed: ${stepError instanceof Error ? stepError.message : String(stepError)}`;
                    console.error(`    ❌ PageAction Step ${actualStepNo}.${pageActionStep.stepNo} threw error: ${returnText}`);
                }
            }
 
            const pageActionStepEndTime = new Date();
            const duration = ((pageActionStepEndTime.getTime() - pageActionStepStartTime.getTime()) / 1000).toFixed(2);
 
            let screenshotPath = '';
            if (screenshotBasePath && testCaseId && (outcome === 0 || outcome === 1)) {
                if (focusTracker) {
                    const openPages = focusTracker.getAllPages();
                    if (openPages.length > 0) {
                        const screenshotPage = openPages[openPages.length - 1];
                        if (!screenshotPage.isClosed()) {
                            try {
                                screenshotPath = await captureScreenshot(
                                    screenshotPage,
                                    `step_${actualStepNo}(${pageActionStep.stepNo})_${outcome === 1 ? 'error' : 'success'}`,
                                    `${screenshotBasePath}/screenshots/${testCaseId}`,
                                    true
                                );
                            } catch (screenshotError) {
                                console.warn(`    ⚠️ Cannot capture screenshot - page was closed during capture`);
                            }
                        }
                    }
                }
            }
 
            const pageActionStepResult: stepExecutionResult = {
                stepNo: pageActionStep.stepNo,
                stepDescription: pageActionStep.stepDescription,
                stepStatus: outcome,
                page: pageActionStep.page,
                element: pageActionStep.element,
                elementText: pageActionStep.elementText,
                actionKeyword: pageActionStep.actionKeyword,
                property: pageActionStep.property,
                condition: pageActionStep.condition,
                tableColumnNames: pageActionStep.tableColumnNames,
                value: pageActionStep.value,
                datasetColumnNames: pageActionStep.datasetColumnNames,
                outcome: outcome,
                stepStartTime: pageActionStepStartTime.toISOString(),
                stepEndTime: pageActionStepEndTime.toISOString(),
                stepDuration: `${duration}s`,
                screenshotPath: screenshotPath,
                pageActions: [],
                returnText: returnText,
                stepTimestamp: pageActionStepStartTime.toISOString()
            };
 
            pageActionStepResults.push(pageActionStepResult);
        }
 
        if (overallStatus === 0) {
            const successMessage = `PageActions '${sheetName}' from '${excelName}' executed successfully (${pageActionStepResults.length} steps)`;
            console.log(`  🎉 ${successMessage}`);
            return {
                code: 0,
                value: successMessage,
                data: pageActionStepResults
            };
        } else {
            const failedStep = pageActionStepResults.find(s => s.stepStatus === 1);
            const failureMessage = `PageActions '${sheetName}' failed at step ${actualStepNo}.${failedStep?.stepNo || 'unknown'}`;
            console.error(`  ❌ ${failureMessage}`);
            return {
                code: 1,
                value: failureMessage,
                data: pageActionStepResults
            };
        }
 
    } catch (error) {
        const errorMessage = `Failed to execute PageActions: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`  ❌ ${errorMessage}`);
        return {
            code: 1,
            value: errorMessage,
            data: []
        };
    }
}
 
export async function parseJsonData(page: Page, step: testStep): Promise<Outcome> {
    try {
        if (!step.value) {
            throw new Error('Value field is required for parseJsonData action');
        }

        const parts = step.value.split('|').map(s => s.trim());
        if (parts.length < 3) {
            throw new Error('Value must contain: sourceVariable | propertyName | outputVariable');
        }

        const [sourceVar, propertyName, outputVar] = parts;

        const prefixedSourceVar = sourceVar.startsWith('_') ? sourceVar : `_${sourceVar}`;
        const finalOutputVar = outputVar.startsWith('_') ? outputVar : `_${outputVar}`;

        const sourceData = executionContext.getVariableValue(prefixedSourceVar);
        if (!sourceData) {
            throw new Error(`No data found in variable: ${prefixedSourceVar}`);
        }

        console.log(`  🔍 Extracting property "${propertyName}" from ${prefixedSourceVar}`);

        let parsedData: any;
        if (typeof sourceData === 'string') {
            try {
                parsedData = JSON.parse(sourceData);
            } catch (parseError) {
                throw new Error(`Failed to parse JSON from ${prefixedSourceVar}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            }
        } else if (typeof sourceData === 'object') {
            parsedData = sourceData;
        } else {
            throw new Error(`Source variable ${prefixedSourceVar} is neither a JSON string nor an object`);
        }

        let extractedValue: any;

        if (propertyName.includes('.')) {
            const keys = propertyName.split('.');
            extractedValue = parsedData;
            for (const key of keys) {
                if (extractedValue === null || extractedValue === undefined) {
                    extractedValue = undefined;
                    break;
                }
                extractedValue = extractedValue[key];
            }
        } else {
            extractedValue = parsedData[propertyName];
        }

        if (extractedValue === undefined) {
            console.warn(`  ⚠️ Property "${propertyName}" not found in ${prefixedSourceVar}. Setting to empty string.`);
            extractedValue = '';
        } else if (extractedValue === null) {
            console.log(`  ℹ️ Property "${propertyName}" is null in ${prefixedSourceVar}. Preserving as null.`);
        }

        executionContext.addVariable(finalOutputVar, extractedValue);

        const valueDisplay = typeof extractedValue === 'object'
            ? JSON.stringify(extractedValue, null, 2).substring(0, 200) + '...'
            : String(extractedValue);

        console.log(`  ✅ Extracted "${propertyName}" = "${valueDisplay}" and stored in ${finalOutputVar}`);

        return {
            code: 0,
            value: `Successfully extracted "${propertyName}" and stored in ${finalOutputVar}`
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Failed to extract JSON property: ${errorMessage}`);
        return {
            code: 1,
            value: `Failed to extract JSON property: ${errorMessage}`
        };
    }
}

export async function getRandomValue(page: Page, step: testStep): Promise<Outcome> {
    try {
        if (!step.value) {
            return {
                code: 1,
                value: 'Values field is required for getRandomValue action'
            };
        }

        const resolvedValue = resolveTestVariables(step.value);
        const parts = resolvedValue.split('|').map(part => part.trim());

        if (parts.length < 2) {
            return {
                code: 1,
                value: 'Values must contain at least input type and parameter separated by |'
            };
        }

        const input = parts[0].toLowerCase();
        const parameter = parts[1].toLowerCase();
        const outputVar = parts[2] || '';

        let result: string;
        const { faker } = require('@faker-js/faker');

        switch (input) {
            case 'surname':
                result = faker.person.lastName();
                break;

            case 'forename':
                result = faker.person.firstName();
                break;

            case 'dob':
                const age = parseInt(parameter) || 30;
                const birthDate = faker.date.birthdate({
                    min: age,
                    max: age,
                    mode: 'age'
                });
                result = formatDateTime(birthDate, 'DD/MM/YYYY');
                break;

            case 'phonenumber':
                result = faker.phone.number();
                break;

            case 'comments':
                const length = parseInt(parameter) || 100;
                result = faker.lorem.paragraphs(Math.ceil(length / 100)).substring(0, length);
                break;

            case 'email':
                result = faker.internet.email();
                break;

            case 'address':
                if (parameter === 'street') {
                    result = faker.location.streetAddress();
                } else if (parameter === 'city') {
                    result = faker.location.city();
                } else if (parameter === 'postcode' || parameter === 'uk') {
                    result = faker.location.zipCode('??# #??');
                } else {
                    result = faker.location.streetAddress(true);
                }
                break;

            case 'company':
                result = faker.company.name();
                break;

            case 'nino':
                const letters = faker.string.alpha({ length: 2, casing: 'upper' });
                const numbers = faker.string.numeric(6);
                const lastLetter = faker.string.alpha({ 
                    length: 1, 
                    casing: 'upper', 
                    exclude: ['D', 'F', 'I', 'Q', 'U', 'V'] 
                });
                result = `${letters}${numbers}${lastLetter}`;
                break;

            case 'unique':
            default:
                const randomString = faker.string.alphanumeric(parseInt(parameter) || 10);
                const timestamp = Date.now();
                result = `${randomString}_${timestamp}`;
                break;
        }

        if (outputVar) {
            const finalVarName = outputVar.startsWith('_') ? outputVar : `_${outputVar}`;
            executionContext.addVariable(finalVarName, result);
            console.log(`  🔀 Generated random ${input} and stored in ${finalVarName}: "${result}"`);
        } else {
            console.log(`  🔀 Generated random ${input}: "${result}"`);
        }

        return {
            code: 0,
            value: `Successfully generated random ${input}: "${result}"`
        };

    } catch (error) {
        console.error(`  ❌ Failed to generate random value: ${error instanceof Error ? error.message : String(error)}`);
        return {
            code: 1,
            value: `Failed to generate random value: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

const networkCaptureContexts = new Map<Page, NetworkContext>();

function getNetworkContext(page: Page): NetworkContext {
    
  if (!networkCaptureContexts.has(page)) {
    networkCaptureContexts.set(page, {
      capturedData: [],
      isActive: false,
      filter: { urlPattern: '', method: '' },
      responseHandler: null
    });
  }
  return networkCaptureContexts.get(page)!;
}

export async function startCapturingNetworkData(page: Page, step: testStep): Promise<Outcome> {
  try {
    // Validate Values field
    if (!step.value) {
      throw new Error('Values field is required for startCapturingNetworkData action');
    }

    const parts = step.value.split('|').map(part => part.trim());
    if (parts.length < 1) {
      throw new Error('Values must contain at least URL pattern');
    }

    const urlPattern = parts[0];
    const method = parts[1] || ''; // Optional method filter

    // Get or create isolated context for this page
    const context = getNetworkContext(page);

    console.log(`[Worker ${process.pid || 'N/A'}] Starting network capture for URL pattern: "${urlPattern}", Method: "${method || 'ANY'}"`);

    // Reset captured data for this context
    context.capturedData = [];
    context.isActive = true;
    context.filter = { urlPattern, method };

    // Remove any existing handler for this page
    if (context.responseHandler) {
      page.off('requestfinished', context.responseHandler);
    }

    // Create new handler for this page's context
    context.responseHandler = async (request) => {
      try {
        const requestUrl = request.url();
        const requestMethod = request.method();

        // Check if the request matches our criteria
        if (requestUrl.includes(urlPattern) && (!method || requestMethod === method.toUpperCase())) {
          console.log(`[Worker ${process.pid || 'N/A'}] Match found! Capturing request: ${requestMethod} ${requestUrl}`);

          const response = await request.response();
          if (response) {
            const responseData = {
              url: requestUrl,
              method: requestMethod,
              status: response.status(),
              statusText: response.statusText(),
              headers: response.headers(),
              requestHeaders: request.headers(),
              postData: request.postData(),
              timing: request.timing(),
              timestamp: new Date().toISOString(),
              body: null as any
            };

            // Try to get response body
            try {
              const body = await response.body();
              const contentType = response.headers()['content-type'] || '';

              if (contentType.includes('application/json')) {
                responseData.body = JSON.parse(body.toString());
              } else {
                responseData.body = body.toString();
              }
            } catch (bodyError) {
              console.warn('Could not parse response body:', bodyError instanceof Error ? bodyError.message : String(bodyError));
              responseData.body = null;
            }

            // Add to this context's captured data array
            context.capturedData.push(responseData);
            console.log(`[Worker ${process.pid || 'N/A'}] Network data captured successfully. Total captures for this page: ${context.capturedData.length}`);
          }
        }
      } catch (error) {
        console.error('Error in network request handler:', error instanceof Error ? error.message : String(error));
      }
    };

    // Attach the handler to requestfinished event for this page
    page.on('requestfinished', context.responseHandler);
    console.log(`[Worker ${process.pid || 'N/A'}] Network capture started. Listening for: "${urlPattern}" with method: "${method || 'ANY'}"`);

    return {
      code: 0,
      value: `Network capture started for URL pattern: "${urlPattern}"`
    };
  } catch (error) {
    console.error(`Failed to start capturing network data:`, error);
    return {
      code: 1,
      value: `Failed to start capturing network data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function stopCapturingNetworkData(page: Page, step: testStep): Promise<Outcome> {
  try {
    const outputVar = step.value?.trim() || '';

    // Get the context for this page
    const context = getNetworkContext(page);

    console.log(`[Worker ${process.pid || 'N/A'}] Stopping network capture. Output variable: ${outputVar}`);

    if (!context.isActive) {
      console.warn('Network capture was not active for this page');
      return {
        code: 0,
        value: 'Network capture was not active'
      };
    }

    // Create a promise that resolves when we've captured at least one matching request
    const waitForCapture = new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (context.capturedData.length > 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100); // Check every 100ms

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });

    // Wait for at least one capture or timeout
    await waitForCapture;

    // Additional wait for any pending responses to complete
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('Network idle timeout - continuing anyway');
    }

    // Remove the response handler for this page
    if (context.responseHandler) {
      page.off('requestfinished', context.responseHandler);
      context.responseHandler = null;
    }

    context.isActive = false;
    console.log(`[Worker ${process.pid || 'N/A'}] Total network responses captured for this page: ${context.capturedData.length}`);

    // Store captured data in global variables
    if (outputVar) {
      const finalVarName = outputVar.startsWith('_') ? outputVar : `_${outputVar}`;

      if (context.capturedData.length === 1) {
        executionContext.addVariable(finalVarName, context.capturedData[0]);
        console.log(`Single response stored in ${finalVarName}`);
      } else {
        executionContext.addVariable(finalVarName, context.capturedData);
        console.log(`${context.capturedData.length} responses stored in ${finalVarName}`);
      }

      if (context.capturedData.length > 0) {
        console.log('Sample captured data:', JSON.stringify({
          url: context.capturedData[0].url,
          method: context.capturedData[0].method,
          status: context.capturedData[0].status,
          hasBody: !!context.capturedData[0].body
        }, null, 2));
      }
    }

    // Clean up the context for this page if page is being closed
    page.once('close', () => {
      networkCaptureContexts.delete(page);
      console.log(`[Worker ${process.pid || 'N/A'}] Cleaned up network capture context for closed page`);
    });

    return {
      code: 0,
      value: `Network capture stopped. Captured ${context.capturedData.length} responses`
    };
  } catch (error) {
    console.error(`Failed to stop capturing network data:`, error);
    return {
      code: 1,
      value: `Failed to stop capturing network data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function parseNetworkJsonData(page: Page, step: testStep): Promise<Outcome> {
  try {
    // Validate Values field
    if (!step.value) {
      throw new Error('Values field is required for parseNetworkJsonData action');
    }

    // Parse input parameters: sourceVar|jsonPath|outputVar
    const parts = step.value.split('|').map(s => s.trim());
    if (parts.length < 3) {
      throw new Error('Values must contain: sourceVariable|jsonPath|outputVariable');
    }

    const [sourceVar, jsonPath, outputVar] = parts;
    console.log(`[Worker ${process.pid || 'N/A'}] Parsing network JSON data from ${sourceVar} using path: ${jsonPath}`);

    // Get the source data using the framework's global variable system
    const prefixedSourceVar = sourceVar.startsWith('_') ? sourceVar : `_${sourceVar}`;
    const sourceData = executionContext.getVariableValue(prefixedSourceVar);

    if (!sourceData) {
      throw new Error(`No data found in variable: ${prefixedSourceVar}`);
    }

    // Helper function to get value from object using dot notation or array notation
    const getValueByPath = (obj: any, path: string): any => {
      // Handle array notation like "data[0].id" or "items[2].name"
      const arrayPattern = /(\w+)\[(\d+)\]/g;
      const normalizedPath = path.replace(arrayPattern, '$1.$2');

      // Split path and traverse
      const keys = normalizedPath.split('.');
      let current = obj;

      for (const key of keys) {
        if (current === null || current === undefined) {
          return undefined;
        }

        // Handle array index
        if (/^\d+$/.test(key)) {
          current = current[parseInt(key)];
        } else {
          current = current[key];
        }
      }

      return current;
    };

    // Helper function to search for a value recursively
    const findValueRecursively = (obj: any, searchKey: string): Array<{ path: string, value: any }> => {
      const results: Array<{ path: string, value: any }> = [];

      const search = (current: any, path: string = ''): void => {
        if (current && typeof current === 'object') {
          for (const key in current) {
            const newPath = path ? `${path}.${key}` : key;

            if (key === searchKey) {
              results.push({
                path: newPath,
                value: current[key]
              });
            }

            if (typeof current[key] === 'object') {
              search(current[key], newPath);
            }
          }
        }
      };

      search(obj);
      return results;
    };

    let result: any;

    // Determine the data to parse
    let dataToparse: any;
    if (Array.isArray(sourceData)) {
      // If source is an array of responses, use the first one's body
      dataToparse = sourceData[0]?.body || sourceData[0];
    } else if (sourceData.body) {
      // If source has a body property (single response), use it
      dataToparse = sourceData.body;
    } else {
      // Otherwise use the source directly
      dataToparse = sourceData;
    }

    // Ensure we have valid JSON data
    if (typeof dataToparse === 'string') {
      try {
        dataToparse = JSON.parse(dataToparse);
      } catch (e) {
        throw new Error(`Failed to parse JSON string: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Handle different JSON path patterns
    if (!jsonPath || jsonPath === '*' || jsonPath === '.') {
      // Return entire object
      result = dataToparse;

    } else if (jsonPath.startsWith('$')) {
      // JSONPath syntax (basic support)
      const path = jsonPath.substring(1).replace(/^\.*/, '');
      result = getValueByPath(dataToparse, path);

    } else if (jsonPath.includes('=')) {
      // Search syntax: key=value (find all objects where key equals value)
      const [searchKey, searchValue] = jsonPath.split('=').map(s => s.trim());
      result = [];

      const searchArray = (arr: any[]): any[] => {
        return arr.filter(item => {
          if (typeof item === 'object' && item !== null) {
            return String(getValueByPath(item, searchKey)) === searchValue;
          }
          return false;
        });
      };

      if (Array.isArray(dataToparse)) {
        result = searchArray(dataToparse);
      } else {
        // Search in nested arrays
        const findArrays = (obj: any): void => {
          for (const key in obj) {
            if (Array.isArray(obj[key])) {
              const matches = searchArray(obj[key]);
              if (matches.length > 0) {
                result = result.concat(matches);
              }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              findArrays(obj[key]);
            }
          }
        };
        findArrays(dataToparse);
      }

    } else if (jsonPath.startsWith('find:')) {
      // Find all occurrences of a key
      const keyToFind = jsonPath.substring(5).trim();
      const findings = findValueRecursively(dataToparse, keyToFind);
      result = findings.length === 1 ? findings[0].value : findings;

    } else if (jsonPath.includes(',')) {
      // Multiple paths - return an object with all values
      const paths = jsonPath.split(',').map(s => s.trim());
      result = {};
      paths.forEach(path => {
        const key = path.split('.').pop() || path; // Use last part as key
        result[key] = getValueByPath(dataToparse, path);
      });

    } else {
      // Simple dot notation path
      result = getValueByPath(dataToparse, jsonPath);
    }

    // Store the result using the framework's global variable system
    const finalOutputVar = outputVar.startsWith('_') ? outputVar : `_${outputVar}`;
    executionContext.addVariable(finalOutputVar, result);
    console.log(`[Worker ${process.pid || 'N/A'}] Parsed value stored in ${finalOutputVar}:`,
      typeof result === 'object' ?
        JSON.stringify(result, null, 2).substring(0, 200) + '...' :
        result);

    // Log summary
    if (result !== undefined && result !== null) {
      const resultType = Array.isArray(result) ? `array[${result.length}]` : typeof result;
      console.log(`Successfully parsed JSON data. Result type: ${resultType}`);
    } else {
      console.log(`No value found for path: ${jsonPath}`);
    }

    return {
      code: 0,
      value: `Successfully parsed JSON data from ${sourceVar}`
    };

  } catch (error) {
    console.error(`Error parsing JSON data: ${error instanceof Error ? error.message : String(error)}`);
    return {
      code: 1,
      value: `Error parsing JSON data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
// Helper function to get PageAction steps from Excel (existing logic)
async function getPageActionStepsFromExcel(excelName: string, sheetName: string): Promise<testStep[]> {
    const pageActionsDir = './excelFramework/PageActions';
    const excelFilePath = path.join(pageActionsDir, `${excelName}.xlsx`);
    //const excelFilePath = `./product/TESTHCIS_DATABASE.xlsm`;
    if (!fs.existsSync(excelFilePath)) {
        throw new Error(`PageActions file not found at: ${excelFilePath}`);
    }
 
    const xlsx = require('xlsx');
    let workbook: any;
   
    try {
        workbook = xlsx.readFile(excelFilePath);
    } catch (error) {
        throw new Error(`Failed to read Excel file: ${excelFilePath} - ${error instanceof Error ? error.message : String(error)}`);
    }
 
    if (!workbook.Sheets[sheetName]) {
        const availableSheets = workbook.SheetNames.join(', ');
        throw new Error(`Sheet "${sheetName}" not found in Excel file: ${excelName}. Available sheets: ${availableSheets}`);
    }
 
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
 
    if (!jsonData || jsonData.length === 0) {
        throw new Error(`No PageAction steps found in sheet "${sheetName}"`);
    }
 
    const pageActionSteps: testStep[] = [];
 
    for (let i = 0; i < jsonData.length; i++) {
        const pageActionData = jsonData[i];
 
        const pageActionStep: testStep = {
            stepNo: pageActionData.StepNo || pageActionData.stepNo || (i + 1),
            stepDescription: pageActionData.StepDescription || pageActionData.stepDescription || '',
            page: pageActionData.Page || pageActionData.page || '',
            element: pageActionData.Element || pageActionData.element || '',
            elementText: pageActionData.ElementText || pageActionData.elementText || '',
            actionKeyword: pageActionData.ActionKeyword || pageActionData.actionKeyword || '',
            property: pageActionData.Property || pageActionData.property || '',
            condition: pageActionData.Condition || pageActionData.condition || '',
            tableColumnNames: pageActionData.TableColumnNames || pageActionData.tableColumnNames || '',
            value: pageActionData.Values || pageActionData.value || '',
            datasetColumnNames: pageActionData.DatasetColumnName || pageActionData.datasetColumnNames || '',
            isCommented: false
        };
 
        pageActionSteps.push(pageActionStep);
    }
 
    return pageActionSteps;
}
 
 