import { test, expect } from '@playwright/test';
import { parseMedicationChartInputs, isMedicationChartValueMatch, getTableVerificationInputs, getKendoComboBoxSelectionValue } from './lorenzoActions';

test('parses current date and medication name from dynamic chart parameters', () => {
  const step = {
    stepNo: 1,
    stepDescription: 'Verify medication chart',
    page: 'Medication administration chart',
    element: 'Medication row',
    elementText: 'ibuprofen - tablet',
    actionKeyword: 'verifymedicationchart',
    property: '',
    tableColumnNames: 'CurrentDate|MedicationName',
    value: '07-Jul-2026|ibuprofen - tablet',
    datasetColumnNames: ''
  };

  const parsed = parseMedicationChartInputs(step as any);

  expect(parsed.currentDate).toBe('07-Jul-2026');
  expect(parsed.medicationName).toBe('ibuprofen - tablet');
});

test('matches medication chart values despite extra whitespace and casing', () => {
  expect(isMedicationChartValueMatch('ibuprofen - tablet', 'IBUPROFEN - TABLET')).toBe(true);
  expect(isMedicationChartValueMatch(' 07-Jul-2026 ', '07-Jul-2026')).toBe(true);
  expect(isMedicationChartValueMatch('ibuprofen', 'ibuprofen - tablet')).toBe(true);
});

test('uses datasetColumnNames for table verification when DDT provides the value', () => {
  const step = {
    stepNo: 1,
    stepDescription: 'Verify record in table',
    page: 'Prescriptions',
    element: 'Prescription table',
    actionKeyword: 'verifyrecordintable',
    tableColumnNames: 'PrescriptionName',
    value: '',
    datasetColumnNames: 'Amoxicillin',
    isDDT: true
  };

  const parsed = getTableVerificationInputs(step as any);

  expect(parsed.requiredColumns).toEqual(['PrescriptionName']);
  expect(parsed.expectedValues).toEqual(['Amoxicillin']);
});

test('uses datasetColumnNames for Kendo combobox selection when provided', () => {
  const step = {
    stepNo: 1,
    stepDescription: 'Select Kendo combobox',
    page: 'Prescriptions',
    element: 'Medication type',
    actionKeyword: 'selectkendocombobox',
    value: '',
    datasetColumnNames: 'Amoxicillin',
    isDDT: true
  };

  expect(getKendoComboBoxSelectionValue(step as any)).toBe('Amoxicillin');
});
