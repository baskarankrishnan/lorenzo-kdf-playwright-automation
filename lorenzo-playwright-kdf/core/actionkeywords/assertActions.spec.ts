import { test, expect } from '@playwright/test';
import { verifyProperty } from './assertActions';
import { executionContext } from '../utilities/interfaceUtils';

test('verifyProperty exists=false waits briefly for a disappearing element', async ({ page }) => {
  executionContext.addSuiteVariable('LOCATOR_REPOSITORY', {
    testPage: {
      target: { xpath: '//*[@id="target"]' }
    }
  } as any);

  await page.setContent('<div id="target">hello</div>');

  page.evaluate(() => {
    setTimeout(() => {
      const target = document.getElementById('target');
      target?.remove();
    }, 600);
  }).catch(() => undefined);

  const result = await verifyProperty(page, {
    stepNo: 1,
    stepDescription: 'Verify target disappears',
    page: 'testPage',
    element: 'target',
    elementText: '',
    actionKeyword: 'verifyProperty',
    property: 'exists',
    condition: '',
    tableColumnNames: '',
    value: 'false',
    datasetColumnNames: ''
  });

  expect(result.code).toBe(0);
  expect(result.value).toContain('Successfully verified property');
});
