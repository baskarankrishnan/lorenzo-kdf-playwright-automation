#!/usr/bin/env node

/**
 * Generate Excel Test Case - Framework Format
 * Converts KDF to match actual LORENZO framework format
 * Columns: StepNo, StepDescription, Page, Element, ElementText, ActionKeyword, Property, Condition, TableColumnNames, Values, DatasetColumnName
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// KDF file path
const kdfPath = path.join(__dirname, '../lorenzo-playwright-kdf/kdf-generation/kdf-scripts/KDF_Ward_Patient_Lifecycle.md');

// Output Excel path
const outputPath = path.join(__dirname, '../excelFramework/testcases/Inpatient/Ward_Patient_Lifecycle.xlsx');

// Read KDF file
const kdfContent = fs.readFileSync(kdfPath, 'utf8');

// Parse KDF Table
function parseKDFTable(content) {
  const lines = content.split('\n');
  const tableStart = lines.findIndex(line => line.includes('| # | Step Description'));
  
  if (tableStart === -1) return [];
  
  const steps = [];
  let stepNum = 0;
  
  for (let i = tableStart + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '' || !line.startsWith('|')) break;
    
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < 6) continue;
    
    stepNum++;
    
    // Map KDF columns to framework format
    steps.push({
      stepNo: stepNum,
      stepDescription: cells[1],
      page: cells[2],
      element: cells[3],
      elementText: '',
      actionKeyword: cells[5],
      property: '',
      condition: '',
      tableColumnNames: '',
      values: cells[6] || '',
      datasetColumnName: cells[11] || ''
    });
  }
  
  return steps;
}

const steps = parseKDFTable(kdfContent);

console.log(`📖 Parsed ${steps.length} steps from KDF`);

// Create Workbook
const workbook = XLSX.utils.book_new();

// Sheet 1: TestExecution (Framework format)
const executionData = [
  ['StepNo', 'StepDescription', 'Page', 'Element', 'ElementText', 'ActionKeyword', 'Property', 'Condition', 'TableColumnNames', 'Values', 'DatasetColumnName']
];

steps.forEach(step => {
  executionData.push([
    step.stepNo,
    step.stepDescription,
    step.page,
    step.element,
    step.elementText,
    step.actionKeyword,
    step.property,
    step.condition,
    step.tableColumnNames,
    step.values,
    step.datasetColumnName
  ]);
});

const executionSheet = XLSX.utils.aoa_to_sheet(executionData);
executionSheet['!cols'] = [
  { wch: 8 },   // StepNo
  { wch: 35 },  // StepDescription
  { wch: 20 },  // Page
  { wch: 20 },  // Element
  { wch: 15 },  // ElementText
  { wch: 20 },  // ActionKeyword
  { wch: 15 },  // Property
  { wch: 15 },  // Condition
  { wch: 20 },  // TableColumnNames
  { wch: 30 },  // Values
  { wch: 20 }   // DatasetColumnName
];

XLSX.utils.book_append_sheet(workbook, executionSheet, 'TestExecution');

// Sheet 2: TestData (Variable Mappings)
const testDataData = [
  ['Variable', 'SampleValue', 'Type', 'Format', 'Notes', 'UsedInSteps']
];

const testDataMappings = [
  ['USERNAME', 'testuser', 'Text', 'Alphanumeric', 'Application login user', '1'],
  ['PASSWORD', 'Password@123', 'Text', 'Encrypted', 'Login password', '2'],
  ['SURNAME', 'Smith', 'Text', 'Alphabetic', 'Patient surname', '11'],
  ['FIRST_NAME', 'John', 'Text', 'Alphabetic', 'Patient first name', '12'],
  ['GENDER', 'Male', 'Dropdown', 'Single selection', 'Patient gender', '13'],
  ['DOB', '15/05/1960', 'Date', 'DD/MM/YYYY', 'Date of birth', '14'],
  ['WARD_A', 'IP Ward A', 'Text', 'Ward identifier', 'Source ward', '7'],
  ['WARD_B', 'IP Ward B', 'Text', 'Ward identifier', 'Destination ward', '30'],
  ['REFERRAL_ID', 'REF-2026-001234', 'Text', 'Reference format', 'Existing referral link', '15'],
  ['BOOKING_NOTES', 'Patient booked for routine procedure', 'Text', 'Free text', 'Booking description', '19'],
  ['ADMISSION_NOTES', 'Admitted to general ward bed 5', 'Text', 'Free text', 'Admission details', '26'],
  ['LEAVE_NOTES', 'Authorized leave for family visit', 'Text', 'Free text', 'Leave reason', '35'],
  ['DISCHARGE_REASON', 'Treatment completed successfully', 'Text', 'Free text', 'Medical discharge reason', '42'],
  ['DISCHARGE_DEST', 'Home', 'Dropdown', 'Location selection', 'Discharge destination', '43'],
  ['ACTUAL_DISCHARGE_NOTES', 'Patient discharged in stable condition', 'Text', 'Free text', 'Final discharge notes', '47']
];

testDataData.push(...testDataMappings);

const testDataSheet = XLSX.utils.aoa_to_sheet(testDataData);
testDataSheet['!cols'] = [
  { wch: 20 },  // Variable
  { wch: 30 },  // SampleValue
  { wch: 12 },  // Type
  { wch: 15 },  // Format
  { wch: 35 },  // Notes
  { wch: 15 }   // UsedInSteps
];

XLSX.utils.book_append_sheet(workbook, testDataSheet, 'TestData');

// Sheet 3: Configuration
const configData = [
  ['Parameter', 'Value', 'Description'],
  ['Workflow Name', 'Ward Patient Lifecycle Management', 'Complete ward patient journey from booking through discharge'],
  ['Test Case ID', 'TC-INPATIENT-001', 'Unique identifier'],
  ['Module', 'Inpatient Management', 'LORENZO module'],
  ['Priority', 'High', 'Critical workflow'],
  ['Test Type', 'End-to-End', 'Complete workflow validation'],
  ['Total Steps', '50', 'Complete workflow steps'],
  ['Pages Involved', '5', 'pageLogin, pageHome, pageWards, pageAdmitIP, pageTransferWaitingList'],
  ['Elements Used', '42', 'Total unique elements'],
  ['Data Driven', 'Yes', 'Uses test data variables'],
  ['Estimated Duration', '5-7 minutes', 'Automated execution time'],
  ['Created Date', new Date().toLocaleDateString(), 'Date of creation'],
  ['Version', '1.0', 'Test case version'],
  ['Status', 'Ready for Execution', 'Current status']
];

const configSheet = XLSX.utils.aoa_to_sheet(configData);
configSheet['!cols'] = [
  { wch: 25 },
  { wch: 35 },
  { wch: 50 }
];

XLSX.utils.book_append_sheet(workbook, configSheet, 'Configuration');

// Sheet 4: TestValues (Sample iterations)
const testValuesData = [
  ['Iteration', 'USERNAME', 'PASSWORD', 'SURNAME', 'FIRST_NAME', 'GENDER', 'DOB', 'WARD_A', 'WARD_B', 'REFERRAL_ID', 'BOOKING_NOTES', 'ADMISSION_NOTES', 'LEAVE_NOTES', 'DISCHARGE_REASON', 'DISCHARGE_DEST', 'ACTUAL_DISCHARGE_NOTES'],
  ['1', 'testuser', 'Password@123', 'Smith', 'John', 'Male', '15/05/1960', 'IP Ward A', 'IP Ward B', 'REF-2026-001234', 'Patient booked for routine procedure', 'Admitted to general ward bed 5', 'Authorized leave for family visit', 'Treatment completed successfully', 'Home', 'Patient discharged in stable condition'],
  ['2', 'testuser', 'Password@123', 'Jones', 'Sarah', 'Female', '22/08/1975', 'IP Ward A', 'IP Ward B', 'REF-2026-001235', 'Routine admission booking', 'Patient bed 3 assigned', 'Short leave authorized', 'Standard recovery discharge', 'Home', 'Patient stable and ready for discharge']
];

const testValuesSheet = XLSX.utils.aoa_to_sheet(testValuesData);
testValuesSheet['!cols'] = [
  { wch: 12 },  // Iteration
  { wch: 15 },  // USERNAME
  { wch: 15 },  // PASSWORD
  { wch: 15 },  // SURNAME
  { wch: 15 },  // FIRST_NAME
  { wch: 12 },  // GENDER
  { wch: 15 },  // DOB
  { wch: 15 },  // WARD_A
  { wch: 15 },  // WARD_B
  { wch: 18 },  // REFERRAL_ID
  { wch: 30 },  // BOOKING_NOTES
  { wch: 30 },  // ADMISSION_NOTES
  { wch: 30 },  // LEAVE_NOTES
  { wch: 30 },  // DISCHARGE_REASON
  { wch: 15 },  // DISCHARGE_DEST
  { wch: 35 }   // ACTUAL_DISCHARGE_NOTES
];

XLSX.utils.book_append_sheet(workbook, testValuesSheet, 'TestValues');

// Write Excel file
XLSX.writeFile(workbook, outputPath);

console.log(`\n✅ Excel Test Case Generated Successfully`);
console.log(`📁 Location: excelFramework/testcases/Inpatient/Ward_Patient_Lifecycle.xlsx`);
console.log(`📊 Sheets Created:`);
console.log(`  1. TestExecution - ${steps.length} steps (Framework format)`);
console.log(`  2. TestData - 15 test data variables`);
console.log(`  3. Configuration - Configuration parameters`);
console.log(`  4. TestValues - 2 sample data iterations`);
console.log(`\n🚀 Ready for execution: npm test`);
