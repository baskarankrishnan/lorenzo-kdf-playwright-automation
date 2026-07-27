import { test } from '@playwright/test';
import * as fileUtils from '../utilities/fileUtils';
import * as dateUtils from '../utilities/dateUtils';
import { stepExecutionResult, testCaseExecutionResult, testCase, testCasesByExcel, executionContext } from '../utilities/interfaceUtils';
import { getActionKeywordFunction } from '../../product/actionregistry';
import { captureScreenshot } from '../utilities/imageUtils';
import { resolveTestVariables, resolveDatasetVariable } from '../actionkeywords/dataActions';
import { BrowserFocusTracker, resolvePageForStep } from '../actionkeywords/browserActions';
import * as databaseUtils from '../utilities/databaseUtils';
import * as pageLoaderUtils from '../utilities/pageLoaderUtils';
import { logout } from '../../product/lorenzoActions';
import * as fs from 'fs';
import * as path from 'path';

// ✅ Set execution type via environment variable instead of file
process.env.EXECUTION_TYPE = 'suite';

const packName = process.env.EXECUTION_PACK || 'Smoke';
const executionTimestamp = dateUtils.getCurrentTimeStamp('YYYYMMDDHHmm');
let executableScenarios: testCasesByExcel = {};

const plannerSource = process.env.PLANNER_REPOSITORY_SOURCE?.toLowerCase();
const packNameUpper = packName.toUpperCase();

if (plannerSource === 'db') {
    console.log('📋 Loading planner from DB cache...');

    const cacheFile = path.resolve('planner-cache.json');

    if (!fs.existsSync(cacheFile)) {
        throw new Error(`❌ planner-cache.json not found. DB planner step did not generate cache.`);
    }

    const raw = fs.readFileSync(cacheFile, 'utf-8');

    if (!raw || !raw.trim()) {
        throw new Error('❌ planner-cache.json is empty');
    }

    const parsed = JSON.parse(raw);

    if (!parsed || Object.keys(parsed).length === 0) {
        console.error('❌ planner-cache.json contains no executable scenarios');
    }

    executableScenarios = parsed;

    console.log(`✅ Planner loaded from DB cache: ${Object.keys(executableScenarios).length} files`);
}
else {
    console.log(`📋 Loading planner from Excel for pack: ${packNameUpper}`);

    executableScenarios = fileUtils.getExecutableScenarios(packNameUpper);

    if (!executableScenarios || Object.keys(executableScenarios).length === 0) {
        throw new Error(`❌ No executable scenarios found in Excel planner for pack: ${packNameUpper}`);
    }

    console.log(`✅ Planner loaded from Excel: ${Object.keys(executableScenarios).length} files`);
}



let locatorRepository;
if (process.env.LOCATOR_REPOSITORY_SOURCE === 'excel') {
    locatorRepository = fileUtils.readLocatorRepository();
} else if (process.env.LOCATOR_REPOSITORY_SOURCE === 'db') {
    // Load in test, not at module level
    locatorRepository = null; // Will be loaded per test
}
executionContext.addSuiteVariable('LOCATOR_REPOSITORY', locatorRepository);

const individualDir = process.env.INDIVIDUAL_REPORT_PATH || './reports/individualReports';
const tempReportsDir = process.env.TEMP_TEST_RESULTS_PATH || './reports/temp/testResults';
const continueOnFailure = process.env.CONTINUE_ON_FAILURE !== 'false';

if (!fs.existsSync(tempReportsDir)) fs.mkdirSync(tempReportsDir, { recursive: true });

// ✅ Store browser config in memory instead of file
let sharedBrowserConfig: {
    browserName: string;
    browserVersion: string;
    os: string;
    osVersion: string;
} | null = null;

const suiteFailureTracker = new Map<string, boolean>();

// ✅ Main test suite with beforeAll hook
test.describe('Test Suite Execution', () => {
    test.beforeAll(async () => {
        console.log('🚀 Suite setup running...');

        // Load locator repository from DB if needed
        if (process.env.LOCATOR_REPOSITORY_SOURCE === 'db') {
            locatorRepository = await databaseUtils.readLocatorRepository();
            executionContext.addSuiteVariable('LOCATOR_REPOSITORY', locatorRepository);
        } else if (process.env.LOCATOR_REPOSITORY_SOURCE === 'pages') {
            console.log('📄 Loading locators from page files...');
            const pagesDir = './pages';
            locatorRepository = await pageLoaderUtils.readLocatorRepositoryFromPages(pagesDir);
            executionContext.addSuiteVariable('LOCATOR_REPOSITORY', locatorRepository);
            console.log(`✅ Loaded ${Object.keys(locatorRepository).length} page objects from ${pagesDir}`);
        }
    });

    // Register tests for each Excel file
    for (const [excelName, excelData] of Object.entries(executableScenarios)) {
        test.describe.serial(`${excelName}`, () => {
            const { module, testCases } = excelData;
            const contextKey = `${module}_${excelName}`;
            // One folder per module/excel (NO run timestamp) so each run overwrites
            // the same individual report rather than accumulating a new copy.
            const excelReportDir = path.join(individualDir, module, `${excelName}`);
            const suiteKey = `${module}_${excelName}`;

            suiteFailureTracker.set(suiteKey, false);

            // Reset transient cross-test state after every test. The singleton executionContext
            // is shared across all tests in this serial worker; `_popupPage` (set by
            // clickAndSwitchToPopup and read by resolvePageForStep) can otherwise point at a
            // page from an already-closed context, making the NEXT test fail at startup with
            // "Target page/context/browser has been closed".
            test.afterEach(async ({ page }) => {
                // Best-effort logout so the Lorenzo single-session lock is released between tests
                // (prevents "Existing session is already open" blocking the next login). Never fails.
                try {
                    if (page && !page.isClosed()) {
                        await logout(page, { page: 'pageHome', element: 'btn_Logout', elementText: '', value: '' } as any);
                    }
                } catch { /* ignore teardown errors */ }
                (executionContext as any)._popupPage = undefined;
            });

            testCases.forEach(({ testcaseId, jiraId, description, author, isDDt, ddtStartRow, ddtEndRow }) => {
                test(`${testcaseId}`, async ({ page, context, browser }) => {

                    // ✅ Capture browser config once in memory instead of file
                    if (!sharedBrowserConfig) {
                        sharedBrowserConfig = {
                            browserName: browser.browserType().name(),
                            browserVersion: browser.version(),
                            os: process.platform,
                            osVersion: process.version
                        };
                        console.log(`📋 Browser Config Captured: ${sharedBrowserConfig.browserName} ${sharedBrowserConfig.browserVersion}`);
                    }
                    let testCase: testCase;
                    if (process.env.TESTCASE_REPOSITORY_SOURCE === 'db') {
                        testCase = await databaseUtils.getTestCaseData_DB(testcaseId);
                    } else {
                        if (!module || !excelName) {
                            throw new Error('Module and excelName are required for Excel-based test cases');
                        }
                        testCase = fileUtils.readTestCasesFromExcel(module, excelName, testcaseId, jiraId, description, author);
                    }
                    executionContext.setCurrentContext(contextKey);

                    // Start each test with a clean transient page reference so nothing from a
                    // previously-finished test (and its now-closed context) leaks into this one.
                    (executionContext as any)._popupPage = undefined;

                    // Load the TestData sheet embedded in the test case workbook so that any
                    // step with a DatasetColumnName resolves its value from it (row 1 = first
                    // data row). This replaces the need for external DS_<excel>.xlsx files.
                    const testDataMap = (module && excelName)
                        ? fileUtils.readTestDataFromExcel(module, excelName, 1)
                        : {};

                    // ✅ Initialize focus tracker
                    const focusTracker = new BrowserFocusTracker(page);

                    const stepResults: stepExecutionResult[] = [];
                    const testStartTime = new Date();
                    let testStatus = 0;
                    let stopExecution = false;

                    const suiteFailed = suiteFailureTracker.get(suiteKey) || false;
                    const shouldSkipTest = !continueOnFailure && suiteFailed;

                    if (shouldSkipTest) {
                        testStatus = 3;

                        for (const step of testCase.testSteps) {
                            const stepStartTime = new Date();
                            const stepEndTime = new Date();

                            stepResults.push({
                                stepNo: step.stepNo,
                                stepDescription: step.stepDescription,
                                stepStatus: 3,
                                page: step.page,
                                element: step.element,
                                elementText: step.elementText,
                                actionKeyword: step.actionKeyword,
                                property: step.property,
                                condition: step.condition,
                                tableColumnNames: step.tableColumnNames,
                                value: step.value,
                                datasetColumnNames: step.datasetColumnNames,
                                outcome: 3,
                                stepStartTime: stepStartTime.toISOString(),
                                stepEndTime: stepEndTime.toISOString(),
                                stepDuration: '0.00s',
                                pageActions: [],
                                screenshotPath: '',
                                returnText: 'Step skipped - Previous step/test failed',
                                stepTimestamp: stepStartTime.toISOString()
                            });
                        }
                    } else {
                        // ✅ Navigate to the application URL so the first step (login) has a
                        //    loaded page to act on. Matches the unit runner's behavior; without
                        //    this the page stays at about:blank and step 1 fails ("Page was closed").
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

                        for (const step of testCase.testSteps) {
                            const stepStartTime = new Date();
                            let outcome = 0;
                            let returnText = '';
                            let pageActions: stepExecutionResult[] = [];

                            if (step.isCommented) {
                                outcome = 2;
                                returnText = 'Step skipped (commented)';
                            } else if (stopExecution) {
                                outcome = 3;
                                returnText = 'Step not executed (previous step/test failed)';
                            } else {
                                try {
                                    const actionFunction = getActionKeywordFunction(step.actionKeyword);
                                    if (!actionFunction) throw new Error(`Action keyword not found: ${step.actionKeyword}`);

                                    if (step.elementText && typeof step.elementText === 'string') {
                                        step.elementText = resolveTestVariables(step.elementText, '  ');
                                    }

                                    step.isDDT = false;
                                    if (step.datasetColumnNames && typeof step.datasetColumnNames === 'string' && step.datasetColumnNames.trim() !== '') {
                                        const dsCol = step.datasetColumnNames.trim();
                                        if (Object.prototype.hasOwnProperty.call(testDataMap, dsCol)) {
                                            // Resolve the value from the TestData sheet in this workbook.
                                            step.isDDT = true;
                                            step.datasetColumnNames = testDataMap[dsCol];
                                        } else if (isDDt?.toLowerCase() == "yes") {
                                            // Legacy fallback: external DS_<excel>.xlsx dataset file.
                                            step.isDDT = true;
                                            step.datasetColumnNames = resolveDatasetVariable(step.datasetColumnNames, module, excelName, testcaseId, Number(ddtStartRow));
                                        }
                                    }

                                    // ✅ RESOLVE PAGE BEFORE EXECUTION using resolvePageForStep
                                    const activePage = await resolvePageForStep(step.page, focusTracker);

                                    if (!activePage || activePage.isClosed?.()) {
                                        throw new Error('No active page available for step execution');
                                    }

                                    let result;
                                    if (step.actionKeyword === 'callCommonScripts') {
                                        result = await actionFunction(activePage, step, excelReportDir, testCase.testCaseId, focusTracker);
                                    } else {
                                        result = await actionFunction(activePage, step);
                                    }

                                    if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
                                        pageActions = result.data;
                                        console.log(`📋 Extracted ${pageActions.length} pageAction steps from step ${step.stepNo}`);
                                    }

                                    if (result && typeof result === 'object' && 'code' in result) {
                                        if (result.code === 2) {
                                            // Soft-skip (e.g. conditional popup that did not appear) — do NOT fail/stop.
                                            outcome = 2;
                                            returnText = result.value || 'Step skipped (conditional)';
                                            console.log(`⏭ Step ${step.stepNo} skipped: ${returnText}`);
                                        } else if (result.code !== 0) {
                                            outcome = 1;
                                            testStatus = 1;
                                            stopExecution = true;
                                            returnText = result.value || 'Step failed';
                                            console.error(`❌ Step ${step.stepNo} failed: ${returnText}`);
                                        } else {
                                            returnText = result.value || 'Step executed successfully';
                                            console.log(`✅ Step ${step.stepNo} passed: ${returnText}`);
                                        }
                                    } else {
                                        returnText = 'Step executed successfully';
                                    }
                                } catch (error) {
                                    outcome = 1;
                                    testStatus = 1;
                                    stopExecution = true;
                                    returnText = `Step failed: ${error instanceof Error ? error.message : String(error)}`;
                                    console.error(`❌ Step ${step.stepNo} threw error: ${returnText}`);
                                }
                            }

                            const stepEndTime = new Date();
                            const duration = ((stepEndTime.getTime() - stepStartTime.getTime()) / 1000).toFixed(2);

                            const shouldCaptureScreenshot = outcome === 0 || outcome === 1;
                            let screenshotPath = '';
                            let screenshotPage;

                            const openPages = context.pages().filter(p => !p.isClosed());
                            if (openPages.length > 0) screenshotPage = openPages[openPages.length - 1];
                            if (screenshotPage && !screenshotPage.isClosed?.()) {
                                screenshotPath = await captureScreenshot(
                                    screenshotPage,
                                    `step_${step.stepNo}_${outcome === 1 ? 'error' : 'success'}`,
                                    `${excelReportDir}/screenshots/${testCase.testCaseId}`,
                                    shouldCaptureScreenshot
                                );
                            } else {
                                console.warn(`⚠️ Cannot capture screenshot - no valid page available for step ${step.stepNo}`);
                            }

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

                        if (testStatus === 1 && !continueOnFailure) {
                            suiteFailureTracker.set(suiteKey, true);
                        }
                    }

                    const testEndTime = new Date();
                    const testDuration = ((testEndTime.getTime() - testStartTime.getTime()) / 1000).toFixed(2);

                    // ✅ Use in-memory browser config instead of reading from file
                    const browserConfig = sharedBrowserConfig || {
                        browserName: '',
                        browserVersion: '',
                        os: '',
                        osVersion: ''
                    };

                    let returnText = '';
                    if (testStatus === 0) {
                        returnText = 'Test completed successfully';
                    } else if (testStatus === 3) {
                        returnText = 'Test skipped - Previous test failed';
                    } else {
                        returnText = `Test failed : ${stepResults.find(step => step.stepStatus === 1)?.returnText}`;
                    }

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
                        returnText: returnText,
                        testTimestamp: testStartTime.toISOString(),
                        browserConfig: browserConfig,
                        capturedData: executionContext.getAllTestVariables(contextKey),
                    };

                    // Write single temp file with all necessary data for Reporter
                    const tempResultFile = path.join(tempReportsDir, `${excelName}_${testcaseId}.json`);
                    fs.writeFileSync(tempResultFile, JSON.stringify({
                        excelName,
                        module,
                        testcaseId,
                        testResult,
                        testStatus,
                        excelReportDir,
                        executionTimestamp
                    }, null, 2), 'utf-8');

                    if (shouldSkipTest) {
                        test.skip();
                    }

                    if (testStatus === 1) {
                        const failedStep = stepResults.find(step => step.stepStatus === 1);
                        const errorMessage = failedStep
                            ? `Test failed at Step ${failedStep.stepNo}: ${failedStep.returnText}`
                            : 'Test failed';

                        console.error(`❌ ${testcaseId}: ${errorMessage}\n`);
                    }
                });
            });
        });
    }
});
