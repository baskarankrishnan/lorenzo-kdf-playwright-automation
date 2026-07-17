import type { Reporter, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import * as dateUtils from '../utilities/dateUtils';
import { consolidatedReport, browserConfig } from '../utilities/interfaceUtils';
import { exportCapturedData, exportConsoleLogs } from '../utilities/fileUtils';
import { generateConsolidatedReport } from './consolidatedReporter';
import { generateIndividualReport } from './individualReporter';

class ConsolidatedReporter implements Reporter {
    private packName: string;
    private executionTimestamp: string;
    private suiteStartTime: Date;
    private testConsoleLogs: Map<string, string[]>;
    private continueOnFailure: boolean;
    private isSingleTestExecution: boolean = false;

    constructor() {
        this.packName = process.env.EXECUTION_PACK || 'smoke';
        this.executionTimestamp = dateUtils.getCurrentTimeStamp('YYYYMMDDHHmm');
        this.suiteStartTime = new Date();
        this.testConsoleLogs = new Map();
        this.continueOnFailure = process.env.CONTINUE_ON_FAILURE !== 'false';
    }

    onBegin(config: any, suite: any) {
        // ✅ Check execution type from environment variable instead of file
        const executionType = process.env.EXECUTION_TYPE || 'suite';

        if (executionType === 'single') {
            this.isSingleTestExecution = true;
            return;
        }

        console.log('\n=== Test Suite Execution Started ===');
    }

    onTestBegin(test: any) {
        if (this.isSingleTestExecution) return;

        const testKey = `${test.parent?.title}_${test.title}`;
        this.testConsoleLogs.set(testKey, []);
    }

    onStdOut(chunk: string | Buffer, test?: any) {
        if (this.isSingleTestExecution) return;

        if (test) {
            const testKey = `${test.parent?.title}_${test.title}`;
            const logs = this.testConsoleLogs.get(testKey) || [];
            logs.push(chunk.toString());
            this.testConsoleLogs.set(testKey, logs);
        }
    }

    onStdErr(chunk: string | Buffer, test?: any) {
        if (this.isSingleTestExecution) return;

        if (test) {
            const testKey = `${test.parent?.title}_${test.title}`;
            const logs = this.testConsoleLogs.get(testKey) || [];
            logs.push(`[ERROR] ${chunk.toString()}`);
            this.testConsoleLogs.set(testKey, logs);
        }
    }

    onTestEnd(test: any, result: any) {
        if (this.isSingleTestExecution) return;

        const status = result.status === 'passed' ? '✓' : result.status === 'skipped' ? '⊘' : '✗';
        console.log(`${status} Finished: ${test.parent?.title} - ${test.title} (${result.duration}ms)`);

        const testKey = `${test.parent?.title}_${test.title}`;
        const logs = this.testConsoleLogs.get(testKey) || [];

        if (logs.length > 0) {
            const consoleLogsDir = './reports/logs';
            exportConsoleLogs(
                test.title,
                test.parent?.title || '',
                logs,
                result.status,
                result.duration,
                this.executionTimestamp,
                consoleLogsDir
            );
        }
    }

    onEnd(result: FullResult) {
        // ✅ Single test execution: individual report + captured data are already
        //    produced directly by the single runner. Here we additionally build the
        //    consolidated summary report from the single temp result file.
        if (this.isSingleTestExecution) {
            console.log('\n✅ Single test execution completed. Individual report generated.\n');
            this.generateConsolidatedForSingle();
            return;
        }

        const tempReportsDir = process.env.TEMP_TEST_RESULTS_PATH || '';
        const consolidatedDir = process.env.CONSOLIDATED_REPORT_PATH || '';
        const capturedDataDir = process.env.CAPTURED_DATA_PATH || '';
        const consoleLogsDir = process.env.CONSOLE_LOGS_PATH || '';

        // Ensure directories exist
        if (!fs.existsSync(consolidatedDir)) {
            fs.mkdirSync(consolidatedDir, { recursive: true });
        }
        if (!fs.existsSync(capturedDataDir)) {
            fs.mkdirSync(capturedDataDir, { recursive: true });
        }

        // Initialize consolidated report structure
        const consolidatedResults: consolidatedReport = {
            executionPack: this.packName,
            executionTimestamp: this.executionTimestamp,
            continueOnFailure: this.continueOnFailure,
            browserConfig: {} as browserConfig,
            executionMetrics: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                skippedTests: 0,
                totalDuration: '0s',
                startTime: this.suiteStartTime.toISOString(),
                endTime: ''
            },
            testResults: {}
        };

        // ✅ Browser config will be extracted from first test result instead of separate file
        let browserConfigCaptured = false;

        // Track captured data by excel (last test wins)
        const capturedDataByExcel = new Map<string, {
            module: string;
            data: { [key: string]: any };
            lastTimestamp: string;
            lastTestId: string;
        }>();

        // Process all temp test result files
        if (fs.existsSync(tempReportsDir)) {
            const tempFiles = fs.readdirSync(tempReportsDir)
                .filter(f => f.endsWith('.json'));

            console.log(`\n=== Processing ${tempFiles.length} test result files ===`);

            tempFiles.forEach(file => {
                const filePath = path.join(tempReportsDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                // ✅ Extract browser config from first test result
                if (!browserConfigCaptured && data.testResult && data.testResult.browserConfig) {
                    consolidatedResults.browserConfig = data.testResult.browserConfig;
                    browserConfigCaptured = true;
                    console.log(`📋 Browser Config: ${consolidatedResults.browserConfig.browserName} ${consolidatedResults.browserConfig.browserVersion}`);
                }

                // Initialize excel entry if not exists
                if (!consolidatedResults.testResults[data.excelName]) {
                    consolidatedResults.testResults[data.excelName] = { module: data.module };
                }

                // Add test result to consolidated report
                consolidatedResults.testResults[data.excelName][data.testcaseId] = data.testResult;

                // Generate individual HTML report
                if (data.testResult && data.excelReportDir) {
                    // Create directory if needed
                    if (!fs.existsSync(data.excelReportDir)) {
                        fs.mkdirSync(data.excelReportDir, { recursive: true });
                    }
                    generateIndividualReport(data.testResult, data.excelReportDir, data.testcaseId);
                    console.log(`✅ Generated individual report: ${data.excelReportDir}/${data.testcaseId}.html`);

                    // Delete JSON file after HTML generation
                    const jsonFilePath = path.join(data.excelReportDir, `${data.testcaseId}.json`);
                    if (fs.existsSync(jsonFilePath)) {
                        fs.unlinkSync(jsonFilePath);
                    }
                }

                // Track captured data (skip skipped tests)
                if (data.testStatus !== 3 && data.testResult && data.testResult.capturedData) {
                    const testTimestamp = data.testResult.testTimestamp || data.testResult.startTime;

                    if (!capturedDataByExcel.has(data.excelName)) {
                        capturedDataByExcel.set(data.excelName, {
                            module: data.module,
                            data: data.testResult.capturedData,
                            lastTimestamp: testTimestamp,
                            lastTestId: data.testcaseId
                        });
                    } else {
                        const excelData = capturedDataByExcel.get(data.excelName)!;
                        if (testTimestamp > excelData.lastTimestamp) {
                            excelData.data = data.testResult.capturedData;
                            excelData.lastTimestamp = testTimestamp;
                            excelData.lastTestId = data.testcaseId;
                        }
                    }
                }

                // Update metrics
                consolidatedResults.executionMetrics.totalTests++;
                if (data.testStatus === 0) {
                    consolidatedResults.executionMetrics.passedTests++;
                } else if (data.testStatus === 3) {
                    consolidatedResults.executionMetrics.skippedTests++;
                } else {
                    consolidatedResults.executionMetrics.failedTests++;
                }
            });
        }

        // Export captured data to Excel files
        console.log(`\n=== Captured Data Summary (Last Test Per Excel) ===`);
        for (const [excelName, { module, data, lastTestId }] of capturedDataByExcel.entries()) {
            console.log(`${excelName} (from ${lastTestId}): ${Object.keys(data).length} variables`);
        }

        console.log('\n=== Creating Captured Data Excel Files ===');
        for (const [excelName, { module, data, lastTestId }] of capturedDataByExcel.entries()) {
            exportCapturedData(excelName, module, data, lastTestId, this.executionTimestamp, capturedDataDir);
        }

        // Finalize execution metrics
        const suiteEndTime = new Date();
        const suiteDuration = ((suiteEndTime.getTime() - this.suiteStartTime.getTime()) / 1000).toFixed(2);
        consolidatedResults.executionMetrics.endTime = suiteEndTime.toISOString();
        consolidatedResults.executionMetrics.totalDuration = `${suiteDuration}s`;

        // Generate consolidated HTML report
        console.log('\n=== Generating Consolidated HTML Report ===');
        generateConsolidatedReport(consolidatedResults, consolidatedDir, this.executionTimestamp);

        // Print execution summary
        console.log('\n=== Execution Summary ===');
        console.log(`Continue On Failure: ${this.continueOnFailure}`);
        console.log(`Total Tests: ${consolidatedResults.executionMetrics.totalTests}`);
        console.log(`Passed: ${consolidatedResults.executionMetrics.passedTests}`);
        console.log(`Failed: ${consolidatedResults.executionMetrics.failedTests}`);
        console.log(`Skipped: ${consolidatedResults.executionMetrics.skippedTests}`);
        console.log(`Duration: ${suiteDuration}s`);
        console.log(`HTML Report: ${path.join(consolidatedDir, `${this.packName}_${this.executionTimestamp}.html`)}`);

        if (fs.existsSync(consoleLogsDir)) {
            const logFiles = fs.readdirSync(consoleLogsDir).filter(f => f.endsWith('.txt'));
            console.log(`\n=== Console Logs Summary ===`);
            console.log(`Total log files: ${logFiles.length}`);
            console.log(`Location: ${consoleLogsDir}`);
        }

        // Print test results by module
        console.log('\n=== Test Results by Module ===');
        for (const [excelName, results] of Object.entries(consolidatedResults.testResults)) {
            const testCaseKeys = Object.keys(results).filter(k => k !== 'module');
            const passedCount = testCaseKeys.filter(k => typeof results[k] === 'object' && results[k].testCaseStatus === 0).length;
            const failedCount = testCaseKeys.filter(k => typeof results[k] === 'object' && results[k].testCaseStatus === 1).length;
            const skippedCount = testCaseKeys.filter(k => typeof results[k] === 'object' && results[k].testCaseStatus === 3).length;

            console.log(`${excelName}: ${testCaseKeys.length} tests (✓ ${passedCount} | ✗ ${failedCount} | ⊘ ${skippedCount}) - ${testCaseKeys.join(', ')}`);
        }

        // Clean up temp files
        if (fs.existsSync(tempReportsDir)) {
            fs.readdirSync(tempReportsDir).forEach(file => {
                fs.unlinkSync(path.join(tempReportsDir, file));
            });
            console.log('\n✅ Temp files cleanup completed');
        }
    }

    /**
     * Build the consolidated summary report for a SINGLE test execution.
     * Isolated from the suite path so it cannot affect suite behavior.
     * Reads the temp result file written by the single runner and emits only the
     * consolidated HTML (individual report + captured data are already generated
     * by the single runner itself, so they are intentionally not repeated here).
     */
    private generateConsolidatedForSingle() {
        const tempReportsDir = process.env.TEMP_TEST_RESULTS_PATH || '';
        const consolidatedDir = process.env.CONSOLIDATED_REPORT_PATH || '';

        if (!consolidatedDir) {
            console.warn('⚠️ CONSOLIDATED_REPORT_PATH not set - skipping consolidated report for single run');
            return;
        }
        if (!fs.existsSync(consolidatedDir)) {
            fs.mkdirSync(consolidatedDir, { recursive: true });
        }

        const consolidatedResults: consolidatedReport = {
            executionPack: this.packName,
            executionTimestamp: this.executionTimestamp,
            continueOnFailure: this.continueOnFailure,
            browserConfig: {} as browserConfig,
            executionMetrics: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                skippedTests: 0,
                totalDuration: '0s',
                startTime: this.suiteStartTime.toISOString(),
                endTime: ''
            },
            testResults: {}
        };

        let browserConfigCaptured = false;

        if (fs.existsSync(tempReportsDir)) {
            const tempFiles = fs.readdirSync(tempReportsDir).filter(f => f.endsWith('.json'));
            console.log(`\n=== Processing ${tempFiles.length} test result file(s) for consolidated report ===`);

            tempFiles.forEach(file => {
                const filePath = path.join(tempReportsDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                if (!browserConfigCaptured && data.testResult && data.testResult.browserConfig) {
                    consolidatedResults.browserConfig = data.testResult.browserConfig;
                    browserConfigCaptured = true;
                }

                if (!consolidatedResults.testResults[data.excelName]) {
                    consolidatedResults.testResults[data.excelName] = { module: data.module };
                }
                consolidatedResults.testResults[data.excelName][data.testcaseId] = data.testResult;

                consolidatedResults.executionMetrics.totalTests++;
                if (data.testStatus === 0) {
                    consolidatedResults.executionMetrics.passedTests++;
                } else if (data.testStatus === 3) {
                    consolidatedResults.executionMetrics.skippedTests++;
                } else {
                    consolidatedResults.executionMetrics.failedTests++;
                }
            });
        }

        const runEndTime = new Date();
        const runDuration = ((runEndTime.getTime() - this.suiteStartTime.getTime()) / 1000).toFixed(2);
        consolidatedResults.executionMetrics.endTime = runEndTime.toISOString();
        consolidatedResults.executionMetrics.totalDuration = `${runDuration}s`;

        console.log('\n=== Generating Consolidated HTML Report (single run) ===');
        generateConsolidatedReport(consolidatedResults, consolidatedDir, this.executionTimestamp);
        console.log(`HTML Report: ${path.join(consolidatedDir, `${this.packName}_${this.executionTimestamp}.html`)}`);

        // Clean up temp files created for the single run
        if (fs.existsSync(tempReportsDir)) {
            fs.readdirSync(tempReportsDir).forEach(file => {
                fs.unlinkSync(path.join(tempReportsDir, file));
            });
            console.log('\n✅ Temp files cleanup completed');
        }
    }
}

export default ConsolidatedReporter;
