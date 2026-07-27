import { test } from '@playwright/test';
import * as fileUtils from '../utilities/fileUtils';
import * as dateUtils from '../utilities/dateUtils';
import { stepExecutionResult, testCaseExecutionResult, testCase, executionContext } from '../utilities/interfaceUtils';
import { getActionKeywordFunction } from '../../product/actionregistry';
import { captureScreenshot } from '../utilities/imageUtils';
import { generateIndividualReport } from '../reporters/individualReporter';
import { resolveTestVariables, resolveDatasetVariable } from '../actionkeywords/dataActions';
import { BrowserFocusTracker, resolvePageForStep } from '../actionkeywords/browserActions';
import * as databaseUtils from '../utilities/databaseUtils';
import * as pageLoaderUtils from '../utilities/pageLoaderUtils';
import { logout } from '../../product/lorenzoActions';
import * as fs from 'fs';
import * as path from 'path';

// ✅ Test Case Configuration
const TEST_CONFIG = {
    module: 'Contacts',
    excelName: 'LSTP_Contacts_WF001',
    testcaseId: 'LSTP_Contacts_WF001',
    jiraId: '',
    description: '',
    author: '',
    isDDT: 'no',
    ddtStartRow: 0,
    ddtEndRow: 0
};

process.env.EXECUTION_TYPE = 'single';

const executionTimestamp = dateUtils.getCurrentTimeStamp('YYYYMMDDHHmm');
const reportDir = path.join(process.env.INDIVIDUAL_REPORT_PATH || './reports/individualReports', `${TEST_CONFIG.module}`, `${TEST_CONFIG.excelName}_${TEST_CONFIG.testcaseId}_${executionTimestamp}`);
const capturedDataDir = path.join(process.env.ROOT_REPORT_PATH || './reports', 'capturedData');
const tempReportsDir = process.env.TEMP_TEST_RESULTS_PATH || './reports/temp/testResults';

// Initialize directories
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
if (!fs.existsSync(capturedDataDir)) fs.mkdirSync(capturedDataDir, { recursive: true });
if (!fs.existsSync(tempReportsDir)) fs.mkdirSync(tempReportsDir, { recursive: true });

test.describe('Test Case Runner', () => {
    test.setTimeout(3600000); // 1 hour

    // Best-effort logout after every test so the Lorenzo single-session lock is released and the
    // next run isn't blocked by an "Existing session is already open" dialog. Never fails the test.
    test.afterEach(async ({ page }) => {
        try {
            if (page && !page.isClosed()) {
                await logout(page, { page: 'pageHome', element: 'btn_Logout', elementText: '', value: '' } as any);
            }
        } catch { /* ignore teardown errors */ }
    });

    test(`${TEST_CONFIG.testcaseId}`, async ({ page, context, browser }) => { // fixtures

        const testStartTime = new Date();
        const contextKey = `${TEST_CONFIG.module}_${TEST_CONFIG.excelName}`;

        // ✅ LOAD LOCATOR REPOSITORY HERE (inside test)
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
        }

        console.log('\n=== Test Case Configuration ===');
        console.log(`Test Case: ${TEST_CONFIG.testcaseId}`);
        console.log(`Module: ${TEST_CONFIG.module}`);
        console.log(`Excel: ${TEST_CONFIG.excelName}`);
        console.log('================================\n');

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

        // Start with a clean transient page reference (matches testSuiteRunner) so nothing
        // from a prior context leaks into resolvePageForStep.
        (executionContext as any)._popupPage = undefined;

        // Load embedded TestData sheet for DatasetColumnName resolution (row 1 = first data row).
        const testDataMap = fileUtils.readTestDataFromExcel(TEST_CONFIG.module, TEST_CONFIG.excelName, 1);

        // ✅ Initialize focus tracker
        const focusTracker = new BrowserFocusTracker(page);

        const stepResults: stepExecutionResult[] = [];
        let testStatus = 0;
        let stopExecution = false;

        console.log(`📋 Executing ${testCase.testSteps.length} steps\n`);

        // ✅ Navigate to the application URL so the first step (login) has a loaded page
        //    to act on. Matches testSuiteRunner/unitRunner; without this the page stays at
        //    about:blank and step 1 fails ("Page was closed").
        if (page.url() === 'about:blank') {
            const appUrl = process.env.URL || process.env.APP_URL || '';
            if (appUrl) {
                console.log(`🌐 Navigating to app URL: ${appUrl}`);
                await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
                await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
            } else {
                console.warn('⚠️ No app URL configured (.env URL or APP_URL) - first step may fail');
            }
        }

        // ✅ Execute steps
        for (const step of testCase.testSteps) {
            const stepStartTime = new Date();
            let outcome = 0;
            let returnText = '';
            let pageActions: stepExecutionResult[] = [];

            // ✅ Handle commented steps
            if (step.isCommented) {
                outcome = 2;
                returnText = 'Step skipped (commented)';
            } else if (stopExecution) {
                outcome = 3;
                returnText = 'Step not executed (previous step failed)';
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

                    // ✅ Handle DDT — resolve DatasetColumnName from the embedded TestData
                    //    sheet (4-sheet workbook); fall back to external DS_ file if configured.
                    step.isDDT = false;
                    if (step.datasetColumnNames && typeof step.datasetColumnNames === 'string' && step.datasetColumnNames.trim() !== '') {
                        const dsCol = step.datasetColumnNames.trim();
                        if (Object.prototype.hasOwnProperty.call(testDataMap, dsCol)) {
                            step.isDDT = true;
                            step.datasetColumnNames = testDataMap[dsCol];
                        } else if (TEST_CONFIG.isDDT?.toLowerCase() === 'yes') {
                            step.isDDT = true;
                            step.datasetColumnNames = resolveDatasetVariable(
                                step.datasetColumnNames,
                                TEST_CONFIG.module,
                                TEST_CONFIG.excelName,
                                TEST_CONFIG.testcaseId,
                                Number(TEST_CONFIG.ddtStartRow)
                            );
                        }
                    }

                    // ✅ RESOLVE PAGE BEFORE EXECUTION
                    const activePage = await resolvePageForStep(step.page, focusTracker);

                    if (!activePage || activePage.isClosed()) {
                        throw new Error('No active page available for step execution');
                    }

                    console.log(`  🎯 Executing on: ${await activePage.title()} (${activePage.url()})`);

                    // ✅ Execute action
                    let result;
                    if (step.actionKeyword === 'callCommonScripts') {
                        result = await actionFunction(activePage, step, reportDir, testCase.testCaseId, focusTracker);
                    } else {
                        result = await actionFunction(activePage, step);
                    }

                    // ✅ Extract pageActions if present
                    if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
                        pageActions = result.data;
                    }

                    // ✅ Check result
                    if (result && typeof result === 'object' && 'code' in result) {
                        if (result.code === 2) {
                            // Soft-skip (e.g. conditional popup that did not appear) — do NOT fail/stop.
                            outcome = 2;
                            returnText = result.value || 'Step skipped (conditional)';
                            console.log(`  ⏭ SKIPPED: ${returnText}`);
                        } else if (result.code !== 0) {
                            outcome = 1;
                            testStatus = 1;
                            stopExecution = true;
                            returnText = result.value || 'Step failed';
                            console.error(`  ❌ FAILED: ${returnText}`);
                        } else {
                            returnText = result.value || 'Step executed successfully';
                            console.log(`  ✅ PASSED: ${returnText}`);
                        }
                    } else {
                        returnText = 'Step executed successfully';
                        console.log(`  ✅ PASSED`);
                    }

                } catch (error) {
                    outcome = 1;
                    testStatus = 1;
                    stopExecution = true;
                    returnText = `Step failed: ${error instanceof Error ? error.message : String(error)}`;
                    console.error(`  ❌ ERROR: ${returnText}`);
                }
            }

            const stepEndTime = new Date();
            const duration = ((stepEndTime.getTime() - stepStartTime.getTime()) / 1000).toFixed(2);

            // ✅ Capture screenshot
            let screenshotPath = '';
            if (outcome === 0 || outcome === 1) {
                const openPages = context.pages().filter(p => !p.isClosed());
                if (openPages.length > 0) {
                    const screenshotPage = openPages[openPages.length - 1];
                    screenshotPath = await captureScreenshot(
                        screenshotPage,
                        `step_${step.stepNo}_${outcome === 1 ? 'error' : 'success'}`,
                        `${reportDir}/screenshots/${testCase.testCaseId}`,
                        true
                    );
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
                stepDuration: `${duration}s`,
                pageActions: pageActions,
                screenshotPath: screenshotPath,
                returnText,
                stepTimestamp: stepStartTime.toISOString()
            });
        }

        const testEndTime = new Date();
        const testDuration = ((testEndTime.getTime() - testStartTime.getTime()) / 1000).toFixed(2);

        // ✅ Get captured data
        const capturedData = executionContext.getAllTestVariables(contextKey);

        // ✅ Create test result
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
            returnText: testStatus === 0 ? 'Test completed successfully' : `Test failed: ${stepResults.find(step => step.stepStatus === 1)?.returnText}`,
            testTimestamp: testStartTime.toISOString(),
            browserConfig: {
                browserName: browser.browserType().name(),
                browserVersion: browser.version(),
                os: process.platform,
                osVersion: process.version
            },
            capturedData: capturedData
        };

        // ✅ Generate individual HTML report
        generateIndividualReport(testResult, reportDir, TEST_CONFIG.testcaseId);

        // ✅ Write temp result file so the consolidated reporter can build a summary report
        //    (existing individual report + captured data export above are preserved as-is)
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

        // ✅ Export captured data to Excel
        if (capturedData && Object.keys(capturedData).length > 0) {
            console.log(`\n📊 Exporting ${Object.keys(capturedData).length} captured variables to Excel...`);
            fileUtils.exportCapturedData(
                TEST_CONFIG.excelName,
                TEST_CONFIG.module,
                capturedData,
                TEST_CONFIG.testcaseId,
                executionTimestamp,
                capturedDataDir
            );
        }

        // ✅ Summary
        const passedSteps = stepResults.filter(s => s.stepStatus === 0).length;
        const failedSteps = stepResults.filter(s => s.stepStatus === 1).length;
        const skippedSteps = stepResults.filter(s => s.stepStatus === 2).length;
        const notRunSteps = stepResults.filter(s => s.stepStatus === 3).length;

        console.log('\n=== Test Case Execution Summary ===');
        console.log(`Test Case: ${TEST_CONFIG.testcaseId}`);
        console.log(`Status: ${testStatus === 0 ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Total Steps: ${stepResults.length}`);
        console.log(`Passed: ${passedSteps}`);
        console.log(`Failed: ${failedSteps}`);
        console.log(`Skipped: ${skippedSteps}`);
        console.log(`Not Run: ${notRunSteps}`);
        console.log(`Duration: ${testDuration}s`);
        console.log(`HTML Report: ${reportDir}/${TEST_CONFIG.testcaseId}.html`);
        console.log('===================================\n');

        // ✅ Fail test if any step failed
        if (testStatus === 1) {
            const failedStep = stepResults.find(step => step.stepStatus === 1);
            const errorMessage = failedStep
                ? `Test failed at Step ${failedStep.stepNo}: ${failedStep.returnText}`
                : 'Test failed';
            throw new Error(errorMessage);
        }
    });
});
