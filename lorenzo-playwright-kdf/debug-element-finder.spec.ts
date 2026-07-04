import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

test('Debug: Find dte_ReferralAcceptedDateTime after Finish now', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to Lorenzo
    await page.goto('http://dxcappchne8097a.cscidp.net/webclient_sso', { waitUntil: 'networkidle' });
    
    console.log('🔍 Page loaded. Inspecting for login...');
    
    // Wait for page to stabilize
    await page.waitForTimeout(3000);
    
    // Get all input elements on current page
    const inputs = await page.$$eval('input', (els: any[]) => 
      els.map(el => ({
        id: el.id || 'none',
        name: el.name || 'none',
        type: el.type || 'text',
        title: el.title || 'none',
        placeholder: el.placeholder || 'none',
        value: el.value || '',
        class: el.className || 'none',
        visible: el.offsetParent !== null
      }))
    );
    
    // Get all elements with DP in ID (Lorenzo date pickers)
    const dpElements = await page.$$eval('[id*="DP"]', (els: any[]) =>
      els.map(el => ({
        id: el.id,
        tagName: el.tagName,
        type: el.type || 'N/A',
        title: el.title,
        class: el.className,
        visible: el.offsetParent !== null,
        xpath: `//[${el.id}]`,
        html: el.outerHTML.substring(0, 150)
      }))
    );
    
    // Get all elements with VC in ID (field controls)
    const vcElements = await page.$$eval('[id*="VC"]', (els: any[]) =>
      els.map(el => ({
        id: el.id,
        tagName: el.tagName,
        type: el.type || 'N/A',
        title: el.title,
        class: el.className,
        visible: el.offsetParent !== null,
        html: el.outerHTML.substring(0, 150)
      }))
    );
    
    const report = `
=== ELEMENT INSPECTION REPORT ===
Generated: ${new Date().toISOString()}
URL: ${page.url()}
Page Title: ${await page.title()}

=== ALL INPUT ELEMENTS (Total: ${inputs.length}) ===
${JSON.stringify(inputs.slice(0, 30), null, 2)}

=== ELEMENTS WITH "DP" IN ID (Date Pickers - Total: ${dpElements.length}) ===
${JSON.stringify(dpElements, null, 2)}

=== ELEMENTS WITH "VC" IN ID (Field Controls - Total: ${vcElements.length}) ===
${JSON.stringify(vcElements, null, 2)}

=== RECOMMENDED XPATHS ===
1. By VC33 ID + DP_TB_Text class:
   //input[@id='DP_VC33' and @class='DP_TB_Text']

2. By VC33 ID only:
   //input[@id='DP_VC33']

3. By ID containing VC:
   //input[contains(@id, 'VC')]

4. By class DP_TB_Text:
   //input[@class='DP_TB_Text']

=== NEXT STEPS ===
Run the unit test to Step 56, then check the browser console for element visibility at that point.
`;

    console.log(report);
    fs.writeFileSync('element-inspection-report.txt', report);
    
    // Also try to get iframes content if present
    const iframes = await page.$$('iframe');
    console.log(`Found ${iframes.length} iframes on page`);
    
    if (iframes.length > 0) {
      const frameReport = `
=== IFRAME INSPECTION ===
Total iframes: ${iframes.length}

Attempting to inspect iframe contents...
Note: Cross-origin iframes cannot be inspected directly.
`;
      fs.appendFileSync('element-inspection-report.txt', frameReport);
    }
    
    console.log('✅ Report saved to: element-inspection-report.txt');
    
  } catch (error) {
    console.error('Error during inspection:', error);
    fs.writeFileSync('element-inspection-error.txt', `Error: ${error}`);
  }
  
  await context.close();
});

// Alternative: Simpler test to just pause and let user inspect
test('Debug: Pause after Step 51 for manual inspection', async ({ page }) => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  MANUAL INSPECTION MODE                                   ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  1. Open browser DevTools (F12)                           ║
║  2. Go to Elements/Inspector tab                          ║
║  3. Search for element with ID containing "VC33" or "DP"  ║
║  4. Right-click → Copy → Copy XPath                       ║
║  5. Share the XPath with me                               ║
║                                                            ║
║  Or search for: //input with @class='DP_TB_Text'         ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
`);
  
  // Keep browser open for manual inspection
  await page.waitForTimeout(300000); // 5 minutes
});
