import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('Inspect Referral Accepted Date element', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to Lorenzo
  await page.goto('http://dxcappchne8097a.cscidp.net/webclient_sso');
  
  // Wait for login (you'd need credentials)
  await page.waitForTimeout(2000);
  
  console.log('Browser opened. Please manually navigate to Step 54 page and press Enter in terminal...');
  console.log('Current URL:', page.url());
  
  // Wait for 30 seconds to let user manually get to the page
  await page.waitForTimeout(30000);
  
  // Now inspect the page for date fields
  const dateElements = await page.$$eval('[id*="DP"]', (els: any[]) => 
    els.map(el => ({
      id: el.id,
      type: el.type || el.tagName,
      title: el.title,
      placeholder: el.placeholder,
      xpath: generateXPath(el)
    }))
  );
  
  // Also check for any input elements in dialog
  const allInputs = await page.$$eval('input[type="text"], input:not([type])', (els: any[]) =>
    els.map(el => ({
      id: el.id,
      name: el.name,
      title: el.title,
      placeholder: el.placeholder,
      value: el.value,
      class: el.className,
      xpath: generateXPath(el)
    }))
  );
  
  // Check for img elements near "Finish" or date-related
  const allImages = await page.$$eval('img', (els: any[]) =>
    els.map(el => ({
      id: el.id,
      alt: el.alt,
      title: el.title,
      src: el.src,
      onclick: el.onclick ? 'yes' : 'no'
    }))
  );
  
  const report = `
=== DATE FIELD INSPECTION ===
Timestamp: ${new Date().toISOString()}
URL: ${page.url()}

=== DP* Input Elements ===
${JSON.stringify(dateElements, null, 2)}

=== All Text Input Elements ===
${JSON.stringify(allInputs.slice(0, 20), null, 2)}

=== All IMG Elements ===
${JSON.stringify(allImages.slice(0, 15), null, 2)}
`;
  
  console.log(report);
  fs.writeFileSync('debug-element-report.txt', report);
  
  await context.close();
});

function generateXPath(element: any) {
  if (element.id !== '')
    return "//*[@id='" + element.id + "']";
  if (element.name !== '')
    return "//" + element.tagName.toLowerCase() + "[@name='" + element.name + "']";
  if (element.className !== '')
    return "//" + element.tagName.toLowerCase() + "[@class='" + element.className + "']";
  return "//" + element.tagName.toLowerCase();
}
