

import { test, chromium, Browser, BrowserContext, Page } from "@playwright/test";
import * as fileUtils from '../utilities/fileUtils';
import * as databaseUtils from '../utilities/databaseUtils';
import * as pageLoaderUtils from '../utilities/pageLoaderUtils';
import { stepExecutionResult, testCaseExecutionResult, testCase, executionContext } from '../utilities/interfaceUtils';
import { getActionKeywordFunction } from '../../product/actionregistry';
import { resolveTestVariables, resolveDatasetVariable } from '../actionkeywords/dataActions';
import { BrowserFocusTracker, resolvePageForStep } from '../actionkeywords/browserActions';
import { getPageDefinition } from '../../product/pageRegistry';
import { generateIndividualReport } from '../reporters/individualReporter';
import * as dateUtils from '../utilities/dateUtils';
import { captureScreenshot } from '../utilities/imageUtils';
import * as fs from 'fs';
import * as path from 'path';

// ✅ Unit test specific configuration for step filtering
const RunMode = {
    testCaseId: 'LSTP_TaskMgmt_FloorPlan_WF001',
    mode: 'RANGE', // 'RANGE' | 'SINGLE' | 'ALL'
    stepRange: {
        start: 1,
        end: 182,
    },
    singleStep: 59,
    options: {
        continueOnFailure: false,
        pauseBetweenSteps: 0
    }
};

// ✅ Hardcoded Test Case Configuration
const TEST_CONFIG = {
    module: 'TaskMgmt_FloorPlan',
    excelName: 'LSTP_TaskMgmt_FloorPlan_WF001',
    testcaseId: RunMode.testCaseId,
    jiraId: 'LSTP_TaskMgmt_FloorPlan_WF001',
    description: 'End-to-end inpatient workflow',
    author: 'KDF Generator',
    isDDT: 'yes',
    ddtStartRow: 1,
    ddtEndRow: 1
};

// ✅ Reporting paths (used to generate the individual report + temp file for the consolidated reporter)
const executionTimestamp = dateUtils.getCurrentTimeStamp('YYYYMMDDHHmm');
const reportDir = path.join(process.env.INDIVIDUAL_REPORT_PATH || './reports/individualReports', `${TEST_CONFIG.module}`, `${TEST_CONFIG.excelName}_${TEST_CONFIG.testcaseId}_${executionTimestamp}`);
const tempReportsDir = process.env.TEMP_TEST_RESULTS_PATH || './reports/temp/testResults';

test.describe('Unit Test Case Runner', () => {
    let browser: Browser;
    let context: BrowserContext;
    let executionStartTime: Date;

    test.setTimeout(3600000); // 1 hour

    test.beforeAll(async () => {
        // ✅ LOAD LOCATOR REPOSITORY HERE (inside beforeAll)
        if (process.env.LOCATOR_REPOSITORY_SOURCE === 'excel') {
            executionContext.addSuiteVariable('LOCATOR_REPOSITORY', fileUtils.readLocatorRepository());
        } else if (process.env.LOCATOR_REPOSITORY_SOURCE === 'db') {
            const repo = await databaseUtils.readLocatorRepository();
            executionContext.addSuiteVariable('LOCATOR_REPOSITORY', repo);
        } else if (process.env.LOCATOR_REPOSITORY_SOURCE === 'pages') {
            console.log('📄 Loading locators from page files...');
            const pagesDir = './pages';
            const repo = await pageLoaderUtils.readLocatorRepositoryFromPages(pagesDir);
            executionContext.addSuiteVariable('LOCATOR_REPOSITORY', repo);
            console.log(`✅ Loaded ${Object.keys(repo).length} page objects from ${pagesDir}`);
            
            // DIAGNOSTIC: Show pageFindandbook elements
            if (repo['pageFindandbook']) {
                const elements = Object.keys(repo['pageFindandbook']);
                console.log(`🔍 pageFindandbook has ${elements.length} elements: ${elements.join(', ')}`);
            } else {
                console.log(`⚠️ pageFindandbook NOT FOUND in repository!`);
            }
        }

        // ✅ Unit test specific: Connect to existing Edge via CDP, or auto-launch Edge
        const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
        try {
            console.log('🔌 Attempting to connect to browser via CDP on port 9222...');
            browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
            console.log('✅ Connected to existing Edge via CDP');
        } catch {
            console.log('⚠️ No CDP session found. Launching Edge automatically...');
            browser = await chromium.launch({
                executablePath: EDGE_PATH,
                headless: false,
                args: [
                    '--disable-web-security',
                    '--ignore-certificate-errors',
                    '--start-maximized',
                    '--no-first-run',
                    '--no-default-browser-check'
                ]
            });
            console.log('✅ Edge launched successfully');
        }

        // Get existing contexts or create new one
        const contexts = browser.contexts();
        if (contexts.length > 0) {
            context = contexts[0];
            console.log(`✅ Using existing browser context`);
        } else {
            context = await browser.newContext({
                ignoreHTTPSErrors: true,
                viewport: { width: 1920, height: 1080 },
                bypassCSP: true,
                javaScriptEnabled: true,
                acceptDownloads: true,
            });
            console.log(`✅ Created new browser context`);
        }

        console.log(`\n=== Unit Test Configuration ===`);
        console.log(`Test Case ID: ${TEST_CONFIG.testcaseId}`);
        console.log(`Module: ${TEST_CONFIG.module}`);
        console.log(`Excel: ${TEST_CONFIG.excelName}`);
        console.log(`Jira ID: ${TEST_CONFIG.jiraId}`);
        console.log(`Author: ${TEST_CONFIG.author}`);
        console.log(`DDT: ${TEST_CONFIG.isDDT}`);
        console.log(`Run Mode: ${RunMode.mode}`);
        if (RunMode.mode === 'RANGE') {
            console.log(`Step Range: ${RunMode.stepRange.start} - ${RunMode.stepRange.end}`);
        } else if (RunMode.mode === 'SINGLE') {
            console.log(`Single Step: ${RunMode.singleStep}`);
        }
        console.log(`Continue on Failure: ${RunMode.options.continueOnFailure}`);
        console.log(`Pause Between Steps: ${RunMode.options.pauseBetweenSteps}ms`);
        console.log('================================\n');
    });

    test.only(`${TEST_CONFIG.testcaseId}`, async () => {
        executionStartTime = new Date();
        const testStartTime = new Date();
        const contextKey = `${TEST_CONFIG.module}_${TEST_CONFIG.excelName}`;

        console.log('\n=== Unit Test Execution Started ===\n');

        // ✅ Read test case
        let testCase: testCase;
        if (process.env.TESTCASE_REPOSITORY_SOURCE === 'db') {
            testCase = await databaseUtils.getTestCaseData_DB(TEST_CONFIG.testcaseId);
        } else {
            testCase = fileUtils.readTestCasesFromExcel(
                TEST_CONFIG.module,
                TEST_CONFIG.excelName,
                TEST_CONFIG.testcaseId,
                TEST_CONFIG.jiraId,
                TEST_CONFIG.description,
                TEST_CONFIG.author
            );
        }
        executionContext.setCurrentContext(contextKey);

        // ✅ Unit test specific: Use existing page or create new one
        const pages = context.pages();
        let page: Page;

        if (pages.length > 0) {
            page = pages[0];
            console.log(`📄 Using existing page: ${page.url()}`);

            // Clear any existing state
            try {
                await page.evaluate(() => {
                    localStorage.clear();
                    sessionStorage.clear();
                });
            } catch (e) {
                // Page might not be on a valid domain yet
            }
        } else {
            page = await context.newPage();
            console.log(`📄 Created new page`);
        }

        // ✅ Configure page for better stability
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(30000);

        // ✅ Add error handling
        page.on('pageerror', error => {
            console.error(`⚠️ Page error: ${error.message}`);
        });

        page.on('requestfailed', request => {
            console.warn(`⚠️ Request failed: ${request.url()} - ${request.failure()?.errorText}`);
        });

        // ✅ Initialize focus tracker
        const focusTracker = new BrowserFocusTracker(page, browser);

        // ✅ Unit test specific: Filter steps based on run mode
        let stepsToExecute = testCase.testSteps;
        switch (RunMode.mode.toUpperCase()) {
            case 'RANGE':
                stepsToExecute = testCase.testSteps.filter(step =>
                    step.stepNo >= RunMode.stepRange.start && step.stepNo <= RunMode.stepRange.end
                );
                break;
            case 'SINGLE':
                stepsToExecute = testCase.testSteps.filter(step => step.stepNo === RunMode.singleStep);
                break;
            default:
                throw new Error(`Invalid RunMode: ${RunMode.mode}. Use 'RANGE', 'SINGLE', or 'ALL'`);
        }

        if (stepsToExecute.length === 0) {
            throw new Error(`No steps found for execution mode '${RunMode.mode}'`);
        }

        console.log(`📋 Executing ${stepsToExecute.length} steps (Mode: ${RunMode.mode})\n`);

        // ✅ Auto-navigate to app URL if page is blank (no CDP session was attached)
        if (page.url() === 'about:blank') {
            const appUrl = process.env.URL || process.env.APP_URL || '';
            if (appUrl) {
                console.log(`🌐 Auto-navigating to app URL: ${appUrl}`);
                await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
                await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
            } else {
                console.warn(`⚠️ Page is blank and no URL configured in .env (URL or APP_URL). Set URL= in .env`);
            }
        }

        const stepResults: stepExecutionResult[] = [];
        let testStatus = 0;
        let stopExecution = false;

        // ✅ Execute steps
        for (const step of stepsToExecute) {
            const stepStartTime = new Date();
            let outcome = 0;
            let returnText = '';
            let pageActions: stepExecutionResult[] = [];

            // ✅ Handle commented steps
            if (step.isCommented) {
                outcome = 2;
                returnText = 'Step skipped (commented)';
                console.log(`⊘ Step ${step.stepNo}: ${step.stepDescription} [SKIPPED]`);
            } else if (stopExecution) {
                outcome = 3;
                returnText = 'Step not executed (previous step failed)';
                console.log(`⊘ Step ${step.stepNo}: ${step.stepDescription} [NOT RUN]`);
            } else {
                try {
                    console.log(`▶ Step ${step.stepNo}: ${step.stepDescription}`);

                    // ✅ Get action function
                    const actionFunction = getActionKeywordFunction(step.actionKeyword);
                    if (!actionFunction) throw new Error(`Action keyword not found: ${step.actionKeyword}`);

                    // ✅ Resolve variables
                    if (step.elementText && typeof step.elementText === 'string') {
                        step.elementText = resolveTestVariables(step.elementText, '  ');
                    }

                    // ✅ Handle DDT — supports both external DS_ dataset files and
                    //    embedded TestData sheet in the same workbook (4-sheet format)
                    step.isDDT = false;
                    if (TEST_CONFIG.isDDT?.toLowerCase() === 'yes') {
                        if (step.datasetColumnNames && typeof step.datasetColumnNames === 'string') {
                            step.isDDT = true;
                            // Try embedded TestData sheet first
                            const inlineData = fileUtils.readTestDataFromExcel(
                                TEST_CONFIG.module,
                                TEST_CONFIG.excelName,
                                Number(TEST_CONFIG.ddtStartRow)
                            );
                            const colName = step.datasetColumnNames.trim();
                            if (inlineData[colName] !== undefined) {
                                step.datasetColumnNames = String(inlineData[colName]);
                            } else {
                                // Fall back to external DS_ dataset file
                                step.datasetColumnNames = resolveDatasetVariable(
                                    step.datasetColumnNames,
                                    TEST_CONFIG.module,
                                    TEST_CONFIG.excelName,
                                    TEST_CONFIG.testcaseId,
                                    Number(TEST_CONFIG.ddtStartRow)
                                );
                            }
                        }
                    }

                    // ✅ RESOLVE PAGE BEFORE EXECUTION using resolvePageForStep
                    // Detect transient pages (not in registry) — use short timeout + soft-skip on failure
                    const _isTransientPage = !!(step.page && step.page.trim() !== '' && !getPageDefinition(step.page));
                    const _savedCondition = step.condition;
                    if (_isTransientPage && !step.condition) {
                        (step as any).condition = '__transient__';
                    }

                    const activePage = await resolvePageForStep(step.page, focusTracker);

                    if (!activePage || activePage.isClosed()) {
                        if (_isTransientPage) {
                            (step as any).condition = _savedCondition;
                            outcome = 2;
                            returnText = 'Transient page not available, step skipped';
                            console.warn(`  ⚠️ TRANSIENT PAGE SKIPPED: ${step.page} not open, skipping step ${step.stepNo}`);
                            // Jump to result storage — do not execute action
                            const stepEndTimeEarly = new Date();
                            //stepResults.push({ stepNo: step.stepNo, stepDescription: step.stepDescription, stepStatus: outcome, page: step.page, element: step.element, elementText: step.elementText, actionKeyword: step.actionKeyword, property: step.property, condition: step.condition, tableColumnNames: step.tableColumnNames, value: step.value, datasetColumnNames: step.datasetColumnNames, stepStartTime: stepStartTime.toISOString(), stepEndTime: stepEndTimeEarly.toISOString(),stepDuration: '0.00', returnText });
                            stepResults.push({stepNo: step.stepNo,stepDescription: step.stepDescription,stepStatus: outcome,outcome: outcome,page: step.page,element: step.element,elementText: step.elementText,actionKeyword: step.actionKeyword,property: step.property,condition: step.condition,tableColumnNames: step.tableColumnNames,value: step.value,datasetColumnNames: step.datasetColumnNames,stepStartTime: stepStartTime.toISOString(),stepEndTime: stepEndTimeEarly.toISOString(),stepDuration: '0.00',screenshotPath: '',pageActions: [],returnText: returnText,stepTimestamp: new Date().toISOString()});
                            
                            continue;
                        }
                        throw new Error('No active page available for step execution');
                    }

                    console.log(`  🎯 Executing on: ${await activePage.title()} (${activePage.url()})`);

                    // ✅ Execute action
                    let result;
                    if (step.actionKeyword === 'callCommonScripts') {
                        // Pass focusTracker to callCommonScripts
                        result = await actionFunction(activePage, step, '', testCase.testCaseId, focusTracker);
                    } else {
                        result = await actionFunction(activePage, step);
                    }

                    // ✅ Extract pageActions if present
                    if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
                        pageActions = result.data;
                        console.log(`  📋 Extracted ${pageActions.length} pageAction steps`);
                    }

                    // Restore saved condition after action
                    if (_isTransientPage) (step as any).condition = _savedCondition;

                    // ✅ Check result
                    const isOptional = ['optional', '__transient__'].includes(String(step.condition || '').toLowerCase());
                    const isTransientStep = _isTransientPage;
                    if (result && typeof result === 'object' && 'code' in result) {
                        if (result.code !== 0) {
                            if (isOptional || isTransientStep) {
                                outcome = 2; // skipped
                                returnText = result.value || (isTransientStep ? 'Transient page step skipped' : 'Optional step skipped (element not found)');
                                console.warn(`  ⚠️ ${isTransientStep ? 'TRANSIENT' : 'OPTIONAL'} STEP SKIPPED: ${returnText}`);
                            } else {
                                outcome = 1;
                                testStatus = 1;
                                if (!RunMode.options.continueOnFailure) {
                                    stopExecution = true;
                                }
                                returnText = result.value || 'Step failed';
                                console.error(`  ❌ FAILED: ${returnText}`);
                            }
                        } else {
                            returnText = result.value || 'Step executed successfully';
                            console.log(`  ✅ PASSED: ${returnText}`);
                        }
                    } else {
                        returnText = 'Step executed successfully';
                        console.log(`  ✅ PASSED`);
                    }

                } catch (error) {
                    const isOptional = ['optional', '__transient__'].includes(String(step.condition || '').toLowerCase());
                    const isTransientCatch = !!(step.page && step.page.trim() !== '' && !getPageDefinition(step.page));
                    if (isOptional || isTransientCatch) {
                        outcome = 2; // skipped
                        returnText = `${isTransientCatch ? 'Transient' : 'Optional'} step skipped: ${error instanceof Error ? error.message : String(error)}`;
                        console.warn(`  ⚠️ ${isTransientCatch ? 'TRANSIENT' : 'OPTIONAL'} STEP SKIPPED: ${returnText}`);
                    } else {
                        outcome = 1;
                        testStatus = 1;
                        if (!RunMode.options.continueOnFailure) {
                            stopExecution = true;
                        }
                        returnText = `Step failed: ${error instanceof Error ? error.message : String(error)}`;
                        console.error(`  ❌ ERROR: ${returnText}`);
                    }
                }
            }

            const stepEndTime = new Date();
            const duration = ((stepEndTime.getTime() - stepStartTime.getTime()) / 1000).toFixed(2);

            // ✅ Capture screenshot for executed steps (pass/fail), matching single/suite runners.
            //    Wrapped so a screenshot failure never breaks step execution.
            let screenshotPath = '';
            if (outcome === 0 || outcome === 1) {
                try {
                    const openPages = context.pages().filter(p => !p.isClosed());
                    if (openPages.length > 0) {
                        const screenshotPage = openPages[openPages.length - 1];
                        screenshotPath = await captureScreenshot(
                            screenshotPage,
                            `step_${step.stepNo}_${outcome === 1 ? 'error' : 'success'}`,
                            `${reportDir}/screenshots/${TEST_CONFIG.testcaseId}`,
                            true
                        );
                    }
                } catch (ssErr) {
                    console.warn(`  ⚠️ Screenshot capture failed for step ${step.stepNo}: ${ssErr instanceof Error ? ssErr.message : String(ssErr)}`);
                }
            }

            // ✅ Store step result
            stepResults.push({
                stepNo: step.stepNo,
                stepDescription: step.stepDescription,
                stepStatus: outcome,
                page: step.page,
                element: step.element,
                elementText: step.elementText,
                actionKeyword: step.actionKeyword,
                property: step.property,
                condition: step.condition,
                tableColumnNames: step.tableColumnNames,
                value: step.value,
                datasetColumnNames: step.datasetColumnNames,
                outcome,
                stepStartTime: stepStartTime.toISOString(),
                stepEndTime: stepEndTime.toISOString(),
                stepDuration: `${duration}`,
                pageActions: pageActions,
                screenshotPath: screenshotPath,
                returnText,
                stepTimestamp: stepStartTime.toISOString()
            });

            // ✅ Unit test specific: Pause between steps if configured
            if (RunMode.options.pauseBetweenSteps > 0) {
                console.log(`  ⏸️  Pausing for ${RunMode.options.pauseBetweenSteps}ms...`);
                await new Promise(resolve => setTimeout(resolve, RunMode.options.pauseBetweenSteps));
            }
        }

        const testEndTime = new Date();
        const testDuration = ((testEndTime.getTime() - testStartTime.getTime()) / 1000).toFixed(2);

        // ✅ Get captured data
        const capturedData = executionContext.getAllTestVariables(contextKey);

        // ✅ Print summary
        const passedSteps = stepResults.filter(s => s.stepStatus === 0).length;
        const failedSteps = stepResults.filter(s => s.stepStatus === 1).length;
        const skippedSteps = stepResults.filter(s => s.stepStatus === 2).length;
        const notRunSteps = stepResults.filter(s => s.stepStatus === 3).length;

        console.log('\n=== Unit Test Execution Summary ===');
        console.log(`Test Case: ${TEST_CONFIG.testcaseId}`);
        console.log(`Module: ${TEST_CONFIG.module}`);
        console.log(`Excel: ${TEST_CONFIG.excelName}`);
        console.log(`Run Mode: ${RunMode.mode}`);
        if (RunMode.mode === 'RANGE') {
            console.log(`Steps Executed: ${RunMode.stepRange.start} - ${RunMode.stepRange.end}`);
        } else if (RunMode.mode === 'SINGLE') {
            console.log(`Step Executed: ${RunMode.singleStep}`);
        }
        console.log(`Status: ${testStatus === 0 ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Total Steps: ${stepResults.length}`);
        console.log(`Passed: ${passedSteps}`);
        console.log(`Failed: ${failedSteps}`);
        console.log(`Skipped: ${skippedSteps}`);
        console.log(`Not Run: ${notRunSteps}`);
        console.log(`Duration: ${testDuration}s`);

        if (capturedData && Object.keys(capturedData).length > 0) {
            console.log(`\n📦 Captured Variables:`);
            Object.entries(capturedData).forEach(([key, value]) => {
                console.log(`  📌 ${key}: ${JSON.stringify(value)}`);
            });
        }
        console.log('===================================\n');

        // ✅ Generate reports (individual HTML + temp file for the consolidated reporter).
        //    Wrapped in try/catch so report generation can never mask/break the actual run.
        try {
            const testResult: testCaseExecutionResult = {
                testCaseId: testCase.testCaseId,
                testCaseDescription: testCase.testCaseDescription,
                module: testCase.module,
                jiraId: testCase.jiraId,
                author: testCase.author,
                excelName: testCase.excelName,
                testCaseStatus: testStatus,
                steps: stepResults,
                startTime: testStartTime.toISOString(),
                endTime: testEndTime.toISOString(),
                duration: `${testDuration}s`,
                returnText: testStatus === 0 ? 'Test completed successfully' : `Test failed: ${stepResults.find(s => s.stepStatus === 1)?.returnText}`,
                testTimestamp: testStartTime.toISOString(),
                browserConfig: {
                    browserName: browser.browserType().name(),
                    browserVersion: browser.version(),
                    os: process.platform,
                    osVersion: process.version
                },
                capturedData: capturedData
            };

            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
            generateIndividualReport(testResult, reportDir, TEST_CONFIG.testcaseId);
            console.log(`📄 Individual report: ${path.join(reportDir, `${TEST_CONFIG.testcaseId}.html`)}`);

            if (!fs.existsSync(tempReportsDir)) fs.mkdirSync(tempReportsDir, { recursive: true });
            const tempResultFile = path.join(tempReportsDir, `${TEST_CONFIG.excelName}_${TEST_CONFIG.testcaseId}.json`);
            fs.writeFileSync(tempResultFile, JSON.stringify({
                excelName: TEST_CONFIG.excelName,
                module: TEST_CONFIG.module,
                testcaseId: TEST_CONFIG.testcaseId,
                testResult,
                testStatus,
                excelReportDir: reportDir,
                executionTimestamp
            }, null, 2), 'utf-8');
        } catch (reportErr) {
            console.warn(`⚠️ Report generation failed (run result unaffected): ${reportErr instanceof Error ? reportErr.message : String(reportErr)}`);
        }

        // ✅ Fail test if any step failed (unless continueOnFailure is enabled)
        if (testStatus === 1 && !RunMode.options.continueOnFailure) {
            const failedStep = stepResults.find(step => step.stepStatus === 1);
            const errorMessage = failedStep
                ? `Test failed at Step ${failedStep.stepNo}: ${failedStep.returnText}`
                : 'Test failed';
            console.error(`❌ ${TEST_CONFIG.testcaseId}: ${errorMessage}\n`);
            throw new Error(errorMessage);
        }
    });

    test.afterAll(async () => {
        console.log('\n✅ Unit test execution completed\n');
        // Note: Don't close browser/context as it's externally managed via CDP
    });
});
