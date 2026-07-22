import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { generateConsolidatedReport } from './core/reporters/consolidatedReporter';
import { generateIndividualReport } from './core/reporters/individualReporter';
import { testCaseExecutionResult, consolidatedReport, stepExecutionResult, browserConfig } from './core/utilities/interfaceUtils';

// Renders BOTH reports from the real generators with mock data so they can be previewed.
test('preview reports theme', async ({ page }) => {
  const outDir = path.join(process.cwd(), 'reports', '_preview');
  const indDir = path.join(outDir, 'individualReports', 'Preview', 'LSTP_Preview_WF001');
  fs.mkdirSync(indDir, { recursive: true });

  const bc: browserConfig = { browserName: 'Chromium', browserVersion: '150.0.4078.83', os: 'win32', osVersion: '24.13.0' };
  const mkStep = (no: number, status: number, desc: string): stepExecutionResult => ({
    stepNo: no, stepDescription: desc, stepStatus: status, actionKeyword: 'clickElement',
    page: 'pageHome', element: 'btn_Find', outcome: status, stepStartTime: new Date().toISOString(),
    stepEndTime: new Date().toISOString(), stepDuration: '1.2s', screenshotPath: '', pageActions: [],
    returnText: status === 1 ? 'Element not found' : '', stepTimestamp: '202607221200'
  });
  const steps: stepExecutionResult[] = [
    mkStep(1, 0, 'Navigate to login page'),
    mkStep(2, 0, 'Enter username and password'),
    mkStep(3, 0, 'Search for patient by identifier'),
    mkStep(4, 1, 'Click Find button'),
    mkStep(5, 2, 'Commented verification step'),
    mkStep(6, 3, 'Skipped optional popup handling'),
  ];
  const tc: testCaseExecutionResult = {
    testCaseId: 'LSTP_Preview_WF001', testCaseDescription: 'Preview of the refreshed report theme',
    module: 'Preview', jiraId: 'LZO-1234', author: 'KDF Generator', excelName: 'LSTP_Preview_WF001',
    isDDT: false, testCaseStatus: 1, steps, startTime: new Date().toISOString(), endTime: new Date().toISOString(),
    duration: '12.5s', returnText: '', testTimestamp: '202607221200', browserConfig: bc,
    capturedData: { PASID: 'PASID-053283', NHSNUMBER: '845 306 7805', Surname: 'CHRISTIANSEN' }
  };

  generateIndividualReport(tc, indDir, tc.testCaseId);

  const consolidated: consolidatedReport = {
    executionPack: 'smoke', executionTimestamp: '202607221200', continueOnFailure: false, browserConfig: bc,
    executionMetrics: { totalTests: 3, passedTests: 2, failedTests: 1, skippedTests: 0, totalDuration: '563.85s', startTime: new Date().toISOString(), endTime: new Date().toISOString() },
    testResults: {
      'LSTP_Preview_WF001': { module: 'Preview', 'LSTP_Preview_WF001': tc } as any,
      'LSTP_Registration_WF001': { module: 'Registration', 'LSTP_Registration_WF001': { ...tc, testCaseId: 'LSTP_Registration_WF001', module: 'Registration', excelName: 'LSTP_Registration_WF001', testCaseStatus: 0, steps: [mkStep(1, 0, 'ok'), mkStep(2, 0, 'ok')] } } as any,
      'LSTP_Theatres_WF001': { module: 'Theatre Management', 'LSTP_Theatres_WF001': { ...tc, testCaseId: 'LSTP_Theatres_WF001', module: 'Theatre Management', excelName: 'LSTP_Theatres_WF001', testCaseStatus: 3, steps: [mkStep(1, 3, 'skipped')] } } as any,
    }
  };
  generateConsolidatedReport(consolidated, outDir, '202607221200');
  console.log('PREVIEW_CONSOLIDATED=' + path.join(outDir, 'smoke_ConsolidatedReport.html'));
  console.log('PREVIEW_INDIVIDUAL=' + path.join(indDir, 'LSTP_Preview_WF001.html'));

  await page.goto('file:///' + path.join(indDir, 'LSTP_Preview_WF001.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'debug-report-individual.png', fullPage: true });
  await page.goto('file:///' + path.join(outDir, 'smoke_ConsolidatedReport.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'debug-report-consolidated.png', fullPage: true });
});
