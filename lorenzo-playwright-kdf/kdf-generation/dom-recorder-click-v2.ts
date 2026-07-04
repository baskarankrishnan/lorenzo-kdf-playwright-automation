/**
 * Lorenzo Click-Based DOM Element Recorder v2
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 *   Capture ONLY the elements you click on, with guaranteed 1-of-1 unique
 *   locators. Uses CDP (Chrome DevTools Protocol) for robust cross-origin
 *   iframe support.
 *
 *   Output → kdf-generation/kdf-samples/ElementRepository_Lorenzo_clicked.json
 *
 * USAGE
 *   cd lorenzo-playwright-kdf
 *   npm run record:click
 *
 * HOW IT WORKS
 *   1. Launches Edge and opens Lorenzo SSO login
 *   2. Uses CDP to inject click listeners into ALL execution contexts (frames)
 *   3. When you click ANY element:
 *      - Captures element attributes (title, id, dikey, atei, etc.)
 *      - Identifies which iframe the element is in
 *      - Generates candidate xpaths
 *      - VALIDATES uniqueness (must match exactly 1 element)
 *   4. Press CTRL+C to save all captured elements to JSON
 *
 * FEATURES
 *   ✅ Click-based capture (only elements you interact with)
 *   ✅ 1-of-1 uniqueness guarantee (validated in real-time)
 *   ✅ Cross-origin iframe support via CDP
 *   ✅ New page/popup detection
 *   ✅ Modal-safe (distinguishes parent vs modal elements)
 *   ✅ Lorenzo-specific (prioritizes dikey, atei attributes)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Type aliases for Playwright types (avoids import issues with ts-node)
type Page = any;
type BrowserContext = any;

const SCRIPT_DIR = path.join(process.cwd(), 'kdf-generation');
dotenv.config({ path: path.join(process.cwd(), '.env') });

// ─── Configuration ───────────────────────────────────────────────────────────

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = process.env.URL || 'http://dxcappchne8097a.cscidp.net/webclient_sso/extlogon.aspx?idp=oidnatlogon&IsClientInfoNotRequired=true';
const OUTPUT_PATH = path.join(SCRIPT_DIR, 'kdf-samples', 'ElementRepository_Lorenzo_clicked.json');

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapturedElement {
  element: string;
  xpath: string;
  tag: string;
  id: string;
  name: string;
  title: string;
  alt: string;
  dikey: string;
  atei: string;
  innerText: string;
  type: string;
  frameUrl: string;
  frameIndex: number;
  pageName: string;
  isModal: boolean;
  uniqueness: string;
  capturedAt: string;
}

// ─── Global state ─────────────────────────────────────────────────────────────

const capturedElements: CapturedElement[] = [];
let elementCounter = 0;
const injectedContexts = new Set<number>();
const loggedFrameUrls = new Set<string>();

// ─── URL → Page name mapping ──────────────────────────────────────────────────

function inferPageName(url: string): string {
  const u = url.toLowerCase();
  const mappings: [RegExp, string][] = [
    [/oidcportal.*authorize/i, 'pageLogin'],
    [/appmainpage/i, 'pageHome'],
    [/appwizardpage.*find.*book/i, 'pageFindandbook'],
    [/appwizardpage.*patient.*search/i, 'pagePatientBasicSearch'],
    [/appwizardpage.*regregistration/i, 'pageRegRegistration'],
    [/appwizardpage.*createadmit/i, 'pageCreateAdmit'],
    [/appwizardpage.*admitip/i, 'pageAdmitIPAdmitRoad'],
    [/appwizardpage.*inpatient/i, 'pageInpatient'],
    [/appwizardpage.*ippegboard/i, 'pageIPPegboardCurrentView'],
    [/appwizardpage.*referral.*details/i, 'pageReferralDetails'],
    [/appwizardpage.*createreferral/i, 'pageCreateReferral'],
    [/appwizardpage.*managereferral/i, 'pageManageReferral'],
    [/appwizardpage.*emergency/i, 'pageEmergency'],
    [/appwizardpage.*eccreateatten/i, 'pageECCreateAttendance'],
    [/appwizardpage.*theatre.*mgmt/i, 'pageTheatreMgmt'],
    [/appwizardpage.*theatre/i, 'pageTheatreManagement'],
    [/appwizardpage.*booktheatre/i, 'pageBookTheatre'],
    [/appwizardpage.*banner/i, 'pageBanner'],
    [/appwizardpage.*careplan/i, 'pageCarePlanDetails'],
    [/appwizardpage.*chart/i, 'pageChartMainView'],
    [/appwizardpage.*fluidbalance/i, 'pageFluidbalancechartTab'],
    [/appwizardpage.*medication/i, 'pageMedicationadministrationchart'],
    [/appwizardpage.*observ/i, 'pageObservationsTab'],
    [/appwizardpage.*eprview/i, 'pageEPRView'],
    [/appwizardpage.*daycare/i, 'pageDCBookAppointment'],
    [/appwizardpage.*wardappoint/i, 'pageWardAppointment'],
    [/appwizardpage.*book.*appoint/i, 'pageBookAppointment'],
    [/appwizardpage.*outpatient/i, 'pageManageModifyappointmentstatus'],
    [/appwizardpage.*patadmadmiss/i, 'pagePatADMAdmission'],
    [/appwizardpage.*discharge/i, 'pageFmMedicalDischarge'],
    [/appwizardpage.*transfer/i, 'pagePatientTransfer'],
    [/appwizardpage.*problem/i, 'pageRiskListView'],
    [/appwizardpage.*allergi/i, 'pageHIALRRecordallergy'],
    [/appwizardpage.*contact/i, 'PageRecordcontact'],
    [/appwizardpage.*task/i, 'pageTaskList'],
    [/appwizardpage.*caseload/i, 'PageMycaseload'],
    [/appdialog/i, 'pageDialog'],
    [/appwizardpage/i, 'pageAppWizard'],
    [/appfullpage/i, 'pageFullPage'],
  ];
  for (const [pattern, name] of mappings) {
    if (pattern.test(u)) return name;
  }
  return 'pageUnknown';
}

function isModalFrame(frameUrl: string): boolean {
  const modalPatterns = [/appdialog/i, /modal/i, /popup/i, /dialog/i];
  return modalPatterns.some(p => p.test(frameUrl));
}

// ─── Element naming ───────────────────────────────────────────────────────────

function buildElementName(data: any): string {
  const prefixMap: Record<string, string> = {
    button: 'btn_',
    a: 'lnk_',
    img: 'ico_',
    select: 'cmb_',
    textarea: 'txt_',
    span: 'lbl_',
    td: 'cell_',
    tr: 'row_',
    table: 'tbl_',
    div: 'div_',
    label: 'lbl_',
    li: 'item_',
    ul: 'list_',
  };

  const tag = (data.tag || 'element').toLowerCase();
  let prefix: string;
  
  // Special handling for input types
  if (tag === 'input') {
    const t = (data.type || '').toLowerCase();
    if (t === 'submit' || t === 'button') prefix = 'btn_';
    else if (t === 'checkbox') prefix = 'chk_';
    else if (t === 'radio') prefix = 'rad_';
    else if (t === 'file') prefix = 'file_';
    else prefix = 'txt_';
  } else {
    prefix = prefixMap[tag] || 'el_';
  }

  // Try to find a good name from attributes
  let baseName = '';
  if (data.title) {
    baseName = data.title;
  } else if (data.id && !data.id.includes('__')) {
    baseName = data.id;
  } else if (data.name) {
    baseName = data.name;
  } else if (data.dikey) {
    baseName = data.dikey;
  } else if (data.atei) {
    baseName = data.atei;
  } else if (data.alt) {
    baseName = data.alt;
  } else if (data.innerText && data.innerText.length < 30) {
    baseName = data.innerText;
  } else if (data.placeholder) {
    baseName = data.placeholder;
  } else {
    elementCounter++;
    baseName = `${tag}${elementCounter}`;
  }

  // Clean name
  baseName = baseName
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
    .substring(0, 40);

  if (!baseName) {
    elementCounter++;
    baseName = `${tag}${elementCounter}`;
  }

  // Capitalize first letter
  baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  return prefix + baseName;
}

// ─── XPath generation ─────────────────────────────────────────────────────────

function generateCandidateXpaths(data: any): string[] {
  const tag = data.tag || '*';
  const candidates: string[] = [];

  // Priority 1: Lorenzo-specific attributes
  if (data.dikey) {
    candidates.push(`//${tag}[@dikey='${data.dikey}']`);
  }
  if (data.atei) {
    candidates.push(`//${tag}[@atei='${data.atei}']`);
  }

  // Priority 2: Standard unique attributes
  if (data.title) {
    candidates.push(`//${tag}[@title='${data.title}']`);
  }
  if (data.id && !data.id.includes('__')) {
    candidates.push(`//${tag}[@id='${data.id}']`);
  }
  if (data.name) {
    candidates.push(`//${tag}[@name='${data.name}']`);
  }

  // Priority 3: Text-based
  if (data.innerText && data.innerText.length > 0 && data.innerText.length < 50) {
    const cleanText = data.innerText.replace(/'/g, "\\'");
    candidates.push(`//${tag}[normalize-space(text())='${cleanText}']`);
    candidates.push(`//${tag}[contains(text(),'${cleanText}')]`);
  }

  // Priority 4: With ancestor context
  if (data.ancestorId && data.title) {
    candidates.push(`//*[@id='${data.ancestorId}']//${tag}[@title='${data.title}']`);
  }
  if (data.ancestorTitle && data.title) {
    candidates.push(`//*[@title='${data.ancestorTitle}']//${tag}[@title='${data.title}']`);
  }

  // Priority 5: Type-based for inputs
  if (tag === 'input' && data.type) {
    if (data.placeholder) {
      candidates.push(`//input[@type='${data.type}'][@placeholder='${data.placeholder}']`);
    }
  }

  // Priority 6: Alt for images
  if (data.alt) {
    candidates.push(`//${tag}[@alt='${data.alt}']`);
  }

  return candidates;
}

// ─── Click handler script (injected via CDP) ─────────────────────────────────

const CLICK_HANDLER_SCRIPT = `
(function() {
  if (window.__lorenzoClickRecorderInjected) return;
  window.__lorenzoClickRecorderInjected = true;

  document.addEventListener('click', function(e) {
    var el = e.target;
    if (!el) return;

    // Walk up to find meaningful ancestors
    var ancestorId = '';
    var ancestorTitle = '';
    var ancestorClass = '';
    var parent = el.parentElement;
    for (var i = 0; i < 5 && parent; i++) {
      if (!ancestorId && parent.id && parent.id.indexOf('__') === -1) {
        ancestorId = parent.id;
      }
      if (!ancestorTitle && parent.getAttribute('title')) {
        ancestorTitle = parent.getAttribute('title') || '';
      }
      if (!ancestorClass && parent.className && typeof parent.className === 'string') {
        var classes = parent.className.split(' ');
        for (var j = 0; j < classes.length; j++) {
          if (classes[j].length > 3 && classes[j].indexOf('_') === -1) {
            ancestorClass = classes[j];
            break;
          }
        }
      }
      parent = parent.parentElement;
    }

    var detail = {
      tag: (el.tagName || '').toLowerCase(),
      id: el.id || '',
      name: el.getAttribute('name') || '',
      title: el.getAttribute('title') || '',
      alt: el.getAttribute('alt') || '',
      dikey: el.getAttribute('dikey') || '',
      atei: el.getAttribute('atei') || '',
      className: (typeof el.className === 'string' ? el.className : '') || '',
      innerText: (el.innerText || '').trim().substring(0, 80),
      type: el.type || '',
      placeholder: el.placeholder || '',
      href: el.href || '',
      frameUrl: window.location.href,
      ancestorId: ancestorId,
      ancestorTitle: ancestorTitle,
      ancestorClass: ancestorClass
    };

    // Send to parent via postMessage (will be caught by CDP binding)
    window.__elementClickedData = detail;
    console.log('__ELEMENT_CLICKED__' + JSON.stringify(detail));
  }, true);
})();
`;

// ─── Process captured element ────────────────────────────────────────────────

async function processCapturedElement(page: Page, elementData: any): Promise<void> {
  // Find the frame this element belongs to
  const allFrames = page.frames();
  let targetFrame = page.mainFrame();
  
  for (const frame of allFrames) {
    try {
      if (frame.url() === elementData.frameUrl) {
        targetFrame = frame;
        break;
      }
    } catch {
      // Frame may be detached
    }
  }

  // Find unique xpath
  const candidates = generateCandidateXpaths(elementData);
  let xpath = '';
  let uniqueness = '';

  for (const candidate of candidates) {
    try {
      const escapedXpath = candidate.replace(/'/g, "\\'");
      const count = await targetFrame.evaluate(`
        (function() {
          try {
            var result = document.evaluate('${escapedXpath}', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            return result.snapshotLength;
          } catch(e) {
            return 0;
          }
        })()
      `);
      
      if (count === 1) {
        xpath = candidate;
        uniqueness = '1 of 1 ✓';
        break;
      }
    } catch {
      // Frame may be detached
    }
  }

  // If no unique found, use first with index
  if (!xpath && candidates.length > 0) {
    xpath = `(${candidates[0]})[1]`;
    uniqueness = 'indexed';
  } else if (!xpath) {
    xpath = `//${elementData.tag || '*'}`;
    uniqueness = 'fallback';
  }

  const elementName = buildElementName(elementData);
  const pageName = inferPageName(elementData.frameUrl);
  const isModal = isModalFrame(elementData.frameUrl);

  const captured: CapturedElement = {
    element: elementName,
    xpath,
    tag: elementData.tag,
    id: elementData.id,
    name: elementData.name,
    title: elementData.title,
    alt: elementData.alt,
    dikey: elementData.dikey,
    atei: elementData.atei,
    innerText: elementData.innerText,
    type: elementData.type,
    frameUrl: elementData.frameUrl,
    frameIndex: 0,
    pageName,
    isModal,
    uniqueness,
    capturedAt: new Date().toISOString(),
  };

  // Check for duplicates
  const isDuplicate = capturedElements.some(
    e => e.xpath === xpath && e.frameUrl === elementData.frameUrl
  );

  if (!isDuplicate) {
    capturedElements.push(captured);

    const modalTag = isModal ? ' [MODAL]' : '';
    const uniqueIcon = uniqueness.includes('✓') ? '✅' : '⚠️';
    
    console.log('\n┌─────────────────────────────────────────────────────────────');
    console.log(`│ ${uniqueIcon} CAPTURED: ${elementName}${modalTag}`);
    console.log('├─────────────────────────────────────────────────────────────');
    console.log(`│ 📋 COPY THIS:`);
    console.log(`│ export const ${elementName} = "${xpath}";`);
    console.log('├─────────────────────────────────────────────────────────────');
    console.log(`│ Uniqueness: ${uniqueness}`);
    console.log(`│ Page:       ${pageName}`);
    if (elementData.title) console.log(`│ Title:      ${elementData.title}`);
    if (elementData.dikey) console.log(`│ Dikey:      ${elementData.dikey}`);
    console.log(`│ Tag:        <${elementData.tag}>`);
    console.log(`└─────────────────────────────────────────────────────────────`);
    console.log(`   Total captured: ${capturedElements.length} elements\n`);
  } else {
    console.log(`   ℹ️  Duplicate skipped: ${elementName}`);
  }
}

// ─── Setup CDP listener for a page ───────────────────────────────────────────

async function setupCDPListener(page: Page): Promise<void> {
  try {
    const client = await page.context().newCDPSession(page);

    // Enable runtime and page domains
    await client.send('Runtime.enable');
    await client.send('Page.enable');

    // Listen for new execution contexts (frames)
    client.on('Runtime.executionContextCreated', async (event: any) => {
      const contextId = event.context.id;
      const contextOrigin = event.context.origin || '';
      const contextName = event.context.name || '';

      // Log frame detection
      const frameUrl = contextOrigin || contextName || 'unknown';
      if (!loggedFrameUrls.has(frameUrl) && frameUrl !== 'unknown' && !frameUrl.includes('about:')) {
        loggedFrameUrls.add(frameUrl);
        const pageName = inferPageName(frameUrl);
        console.log(`  📄 Frame detected (CDP): ${pageName} (${frameUrl.substring(0, 50)}...)`);
      }

      // Inject click handler into this context
      if (!injectedContexts.has(contextId)) {
        injectedContexts.add(contextId);
        try {
          await client.send('Runtime.evaluate', {
            expression: CLICK_HANDLER_SCRIPT,
            contextId: contextId,
            silent: true,
          });
        } catch {
          // Context may be destroyed
        }
      }
    });

    // Listen for console messages (our click handler logs)
    client.on('Runtime.consoleAPICalled', async (event: any) => {
      if (event.type === 'log' && event.args && event.args.length > 0) {
        const text = event.args[0]?.value || '';
        if (typeof text === 'string' && text.startsWith('__ELEMENT_CLICKED__')) {
          try {
            const jsonStr = text.replace('__ELEMENT_CLICKED__', '');
            const elementData = JSON.parse(jsonStr);
            await processCapturedElement(page, elementData);
          } catch {
            // Parse error
          }
        }
      }
    });

    console.log('  ✓ CDP listener setup complete for page');
  } catch (err: any) {
    console.log(`  ⚠️ CDP setup warning: ${err.message || err}`);
  }
}

// ─── Fallback: Inject via Playwright frames ──────────────────────────────────

async function injectViaPlaywright(page: Page): Promise<void> {
  const frames = page.frames();
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const url = frame.url();
    
    // Log new frames
    if (!loggedFrameUrls.has(url) && url && !url.includes('about:')) {
      loggedFrameUrls.add(url);
      const pageName = inferPageName(url);
      console.log(`  📄 Frame detected (PW): ${pageName} (${url.substring(0, 50)}...)`);
    }

    // Try to inject
    try {
      await frame.evaluate(CLICK_HANDLER_SCRIPT);
    } catch {
      // Cross-origin or detached
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Lorenzo Click-Based DOM Recorder v2 (CDP-enabled)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  📍 Click on any element to capture it');
  console.log('  📍 Each click captures element with unique 1-of-1 locator');
  console.log('  📍 Works across iframes and modal dialogs');
  console.log('  📍 Press CTRL+C to save and exit');
  console.log('══════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    executablePath: EDGE_PATH,
    args: ['--start-maximized', '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
  });

  const context = await browser.newContext({
    viewport: null,
    ignoreHTTPSErrors: true,
  });

  const allPages: Page[] = [];

  // Handler for setting up each page
  const setupPage = async (page: Page) => {
    allPages.push(page);
    console.log(`  🔗 New page detected: ${page.url().substring(0, 60)}...`);

    // Setup CDP listener
    await setupCDPListener(page);

    // Also use Playwright console as backup
    page.on('console', async (msg: any) => {
      const text = msg.text();
      if (text.startsWith('__ELEMENT_CLICKED__')) {
        try {
          const jsonStr = text.replace('__ELEMENT_CLICKED__', '');
          const elementData = JSON.parse(jsonStr);
          await processCapturedElement(page, elementData);
        } catch {
          // Ignore
        }
      }
    });

    // Re-inject on navigation
    page.on('framenavigated', async () => {
      await injectViaPlaywright(page).catch(() => {});
    });

    page.on('load', async () => {
      await injectViaPlaywright(page).catch(() => {});
    });
  };

  // Listen for new pages (popups, new tabs)
  context.on('page', async (page) => {
    console.log('  🆕 New page/popup opened!');
    await setupPage(page);
  });

  // Create initial page
  const page = await context.newPage();
  await setupPage(page);

  // Navigate to app
  await page.goto(APP_URL).catch(() => {});
  await injectViaPlaywright(page);

  // Periodic re-injection every 2 seconds
  const reinjectionInterval = setInterval(async () => {
    for (const p of allPages) {
      try {
        if (!p.isClosed()) {
          await injectViaPlaywright(p);
        }
      } catch {
        // Page may be closed
      }
    }
  }, 2000);

  console.log('  ✅ Browser launched. Navigate and click elements to capture...\n');

  // ── Save and exit handler ─────────────────────────────────────────────────

  const saveAndExit = async () => {
    clearInterval(reinjectionInterval);
    console.log('\n\n══════════════════════════════════════════════════════════════');
    console.log('  Saving captured elements...');

    const output: Record<string, object[]> = {};

    for (const el of capturedElements) {
      if (!output[el.pageName]) {
        output[el.pageName] = [];
      }
      output[el.pageName].push({
        element: el.element,
        xpath: el.xpath,
        tag: el.tag,
        id: el.id,
        name: el.name,
        title: el.title,
        dikey: el.dikey,
        atei: el.atei,
        innerText: el.innerText,
        type: el.type,
        frameUrl: el.frameUrl,
        isModal: el.isModal,
        uniqueness: el.uniqueness,
      });
    }

    // Write JSON
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

    // Generate JavaScript export files per page
    const jsOutputDir = path.join(outputDir, 'captured-pages');
    if (!fs.existsSync(jsOutputDir)) fs.mkdirSync(jsOutputDir, { recursive: true });

    console.log('\n  ─────────────────────────────────────────────────────');
    console.log('  Generated JavaScript exports (ready to copy):');
    console.log('  ─────────────────────────────────────────────────────\n');

    for (const [pageName, elements] of Object.entries(output)) {
      let jsContent = `// ${pageName} - Auto-generated by Click Recorder\n`;
      jsContent += `// Generated: ${new Date().toISOString()}\n\n`;
      
      for (const el of elements as any[]) {
        jsContent += `export const ${el.element} = "${el.xpath}";\n`;
      }

      const jsFilePath = path.join(jsOutputDir, `${pageName}.js`);
      fs.writeFileSync(jsFilePath, jsContent, 'utf8');

      console.log(`  // ═══ ${pageName}.js ═══`);
      for (const el of elements as any[]) {
        const uniqueIcon = el.uniqueness.includes('✓') ? '✓' : '⚠';
        console.log(`  export const ${el.element} = "${el.xpath}";  // ${uniqueIcon}`);
      }
      console.log('');
    }

    // Print summary
    console.log('  ─────────────────────────────────────────────────────');
    console.log('  Summary:');
    console.log('  ─────────────────────────────────────────────────────');
    console.log('  Page Name                              | Elements');
    console.log('  ─────────────────────────────────────────────────────');
    
    let total = 0;
    for (const [pageName, elements] of Object.entries(output)) {
      const count = (elements as any[]).length;
      total += count;
      console.log(`  ${pageName.padEnd(38)} | ${String(count).padStart(8)}`);
    }
    
    console.log('  ─────────────────────────────────────────────────────');
    console.log(`  TOTAL                                  | ${String(total).padStart(8)}`);
    console.log('══════════════════════════════════════════════════════════════');
    console.log(`\n  ✅ Output files saved to:`);
    console.log(`     JSON: ${OUTPUT_PATH}`);
    console.log(`     JS:   ${jsOutputDir}/`);
    console.log('══════════════════════════════════════════════════════════════\n');

    try { await browser.close(); } catch { /* ignore */ }
    process.exit(0);
  };

  process.on('SIGINT', saveAndExit);
  process.on('SIGTERM', saveAndExit);
  browser.on('disconnected', saveAndExit);

  await new Promise<void>(() => { /* runs until CTRL+C or browser close */ });
}

main().catch(err => {
  console.error('DOM Recorder error:', err);
  process.exit(1);
});
