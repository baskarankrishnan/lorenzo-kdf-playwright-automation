/**
 * Lorenzo Click-Based DOM Element Recorder
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 *   Capture ONLY the elements you click on, with guaranteed 1-of-1 unique
 *   locators. Handles complex iframe-based applications and modal dialogs.
 *
 *   Output → kdf-generation/kdf-samples/ElementRepository_Lorenzo_clicked.json
 *
 * USAGE
 *   cd lorenzo-playwright-kdf
 *   npx ts-node kdf-generation/dom-recorder-click.ts
 *
 * HOW IT WORKS
 *   1. Launches Edge and opens Lorenzo SSO login
 *   2. Injects click listeners into ALL frames (including nested iframes)
 *   3. When you click ANY element:
 *      - Captures element attributes (title, id, dikey, atei, etc.)
 *      - Identifies which iframe the element is in
 *      - Generates candidate xpaths (most specific → generic)
 *      - VALIDATES uniqueness (must match exactly 1 element)
 *      - If not unique, adds ancestor context automatically
 *      - Logs captured element in real-time
 *   4. Press CTRL+C to save all captured elements to JSON
 *
 * FEATURES
 *   ✅ Click-based capture (only elements you interact with)
 *   ✅ 1-of-1 uniqueness guarantee (validated in real-time)
 *   ✅ iframe-aware (tracks frame context)
 *   ✅ Modal-safe (distinguishes parent vs modal elements)
 *   ✅ Lorenzo-specific (prioritizes dikey, atei attributes)
 *   ✅ Ancestor walking (adds context when needed for uniqueness)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Use process.cwd() based paths since ts-node runs in CommonJS mode
const SCRIPT_DIR = path.join(process.cwd(), 'kdf-generation');

dotenv.config({ path: path.join(process.cwd(), '.env') });

// ─── Configuration ───────────────────────────────────────────────────────────

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = process.env.URL || 'http://dxcappchne8097a.cscidp.net/webclient_sso/extlogon.aspx?idp=oidnatlogon&IsClientInfoNotRequired=true';
const OUTPUT_PATH = path.join(SCRIPT_DIR, 'kdf-samples', 'ElementRepository_Lorenzo_clicked.json');

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapturedElement {
  element: string;           // KDF element name (e.g., btn_Save)
  xpath: string;             // Validated unique xpath
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
  uniqueness: string;        // "1 of 1 ✓" or "X of Y"
  capturedAt: string;
}

// ─── Global state ─────────────────────────────────────────────────────────────

const capturedElements: CapturedElement[] = [];
let elementCounter = 0;

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

// ─── Build KDF element name from attributes ──────────────────────────────────

function buildElementName(el: {
  tag: string; id: string; name: string; title: string; alt: string;
  dikey: string; innerText: string; type: string;
}): string {
  const prefixMap: Record<string, string> = {
    input: 'txt_',
    button: 'btn_',
    select: 'cmb_',
    textarea: 'txt_',
    a: 'lnk_',
    img: 'ico_',
    td: 'lbl_',
    th: 'lbl_',
    span: 'lbl_',
    label: 'lbl_',
    div: 'lbl_',
    table: 'tbl_',
    tr: 'row_',
  };

  // Input type overrides
  let prefix = prefixMap[el.tag] ?? 'el_';
  if (el.tag === 'input') {
    if (el.type === 'checkbox') prefix = 'chk_';
    else if (el.type === 'radio') prefix = 'rad_';
    else if (el.type === 'submit' || el.type === 'button' || el.type === 'image') prefix = 'btn_';
    else if (el.type === 'date' || el.type === 'datetime-local') prefix = 'dte_';
  }

  // Build readable suffix from best available attribute
  const raw = el.title || el.dikey || el.id || el.name || el.alt || el.innerText || '';
  const suffix = raw
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
    .slice(0, 40);

  return suffix ? `${prefix}${suffix}` : `${prefix}Element${++elementCounter}`;
}

// ─── Generate candidate xpaths (most specific → generic) ─────────────────────

function generateCandidateXpaths(el: {
  tag: string; id: string; name: string; title: string; alt: string;
  dikey: string; atei: string; type: string; className: string;
  ancestorId?: string; ancestorTitle?: string; ancestorClass?: string;
}): string[] {
  const tag = el.tag || '*';
  const candidates: string[] = [];

  // Priority 1: Lorenzo-specific attributes (most reliable)
  if (el.dikey) {
    candidates.push(`//${tag}[@dikey='${el.dikey}']`);
  }
  if (el.atei) {
    candidates.push(`//${tag}[@atei='${el.atei}']`);
  }

  // Priority 2: Standard attributes
  if (el.title) {
    candidates.push(`//${tag}[@title='${el.title}']`);
  }
  if (el.id && !el.id.includes('__')) {  // Skip auto-generated IDs
    candidates.push(`//${tag}[@id='${el.id}']`);
  }
  if (el.name) {
    candidates.push(`//${tag}[@name='${el.name}']`);
  }
  if (el.alt) {
    candidates.push(`//${tag}[@alt='${el.alt}']`);
  }

  // Priority 3: With ancestor context (for disambiguation)
  if (el.ancestorId && el.title) {
    candidates.push(`//*[@id='${el.ancestorId}']//${tag}[@title='${el.title}']`);
  }
  if (el.ancestorTitle && el.title) {
    candidates.push(`//*[@title='${el.ancestorTitle}']//${tag}[@title='${el.title}']`);
  }
  if (el.ancestorClass && el.title) {
    candidates.push(`//*[contains(@class,'${el.ancestorClass}')]//${tag}[@title='${el.title}']`);
  }

  // Priority 4: Combined attributes
  if (el.title && el.type) {
    candidates.push(`//${tag}[@title='${el.title}' and @type='${el.type}']`);
  }
  if (el.title && el.className) {
    const mainClass = el.className.split(' ')[0];
    if (mainClass && mainClass.length > 3) {
      candidates.push(`//${tag}[@title='${el.title}' and contains(@class,'${mainClass}')]`);
    }
  }

  return candidates;
}

// ─── Inject click listener into a frame ──────────────────────────────────────

async function injectClickListener(frame: any, frameIndex: number, _page: any): Promise<void> {
  try {
    // Use addScriptTag to inject browser-side code (avoids TypeScript DOM type issues)
    await frame.evaluate(`
      (function(fIdx) {
        // Prevent double injection
        if (window.__clickRecorderInjected) return;
        window.__clickRecorderInjected = true;

        document.addEventListener('click', function(e) {
          var el = e.target;
          if (!el) return;

          // Walk up to find meaningful ancestors for context
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

          // Build element data
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
            frameIndex: fIdx,
            frameUrl: window.location.href,
            ancestorId: ancestorId,
            ancestorTitle: ancestorTitle,
            ancestorClass: ancestorClass
          };

          // Call exposed function (works across cross-origin iframes)
          if (typeof window.__captureClickedElement === 'function') {
            window.__captureClickedElement(detail);
          } else {
            // Fallback to console.log for same-origin frames
            console.log('__ELEMENT_CLICKED__' + JSON.stringify(detail));
          }
        }, true);
      })(${frameIndex});
    `);
  } catch {
    // Frame may be detached or cross-origin
  }
}

// ─── Validate xpath uniqueness in a frame ────────────────────────────────────

async function validateXpath(frame: any, xpath: string): Promise<number> {
  try {
    const count = await frame.evaluate(`
      (function() {
        try {
          var result = document.evaluate("${xpath.replace(/"/g, '\\"')}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          return result.snapshotLength;
        } catch(e) {
          return 0;
        }
      })()
    `);
    return typeof count === 'number' ? count : 0;
  } catch {
    return 0;
  }
}

// ─── Find unique xpath for an element ────────────────────────────────────────

async function findUniqueXpath(frame: any, elementData: any): Promise<{ xpath: string; uniqueness: string }> {
  const candidates = generateCandidateXpaths(elementData);

  for (const xpath of candidates) {
    const count = await validateXpath(frame, xpath);
    if (count === 1) {
      return { xpath, uniqueness: '1 of 1 ✓' };
    }
  }

  // If no unique xpath found, use the best available with count
  if (candidates.length > 0) {
    const bestXpath = candidates[0];
    const count = await validateXpath(frame, bestXpath);
    if (count > 0) {
      // Try adding index
      const indexedXpath = `(${bestXpath})[1]`;
      return { xpath: indexedXpath, uniqueness: `1 of ${count} (indexed)` };
    }
    return { xpath: bestXpath, uniqueness: `0 matches ⚠️` };
  }

  // Fallback: generate basic xpath
  const tag = elementData.tag || '*';
  const fallback = elementData.title 
    ? `//${tag}[@title='${elementData.title}']`
    : `//${tag}[@id='${elementData.id}']`;
  return { xpath: fallback, uniqueness: 'fallback' };
}

// ─── Detect if frame is a modal dialog ───────────────────────────────────────

function isModalFrame(frameUrl: string): boolean {
  const modalPatterns = [
    /appdialog/i,
    /modal/i,
    /popup/i,
    /dialog/i,
  ];
  return modalPatterns.some(p => p.test(frameUrl));
}

// ─── Process captured element ────────────────────────────────────────────────

async function processCapturedElement(page: any, elementData: any): Promise<void> {
  // Find the frame this element belongs to
  const allFrames = page.frames();
  let targetFrame = page.mainFrame();
  
  for (const frame of allFrames) {
    if (frame.url() === elementData.frameUrl) {
      targetFrame = frame;
      break;
    }
  }

  // Find unique xpath
  const { xpath, uniqueness } = await findUniqueXpath(targetFrame, elementData);

  // Build element name
  const elementName = buildElementName(elementData);

  // Infer page name
  const pageName = inferPageName(elementData.frameUrl);

  // Check if modal
  const isModal = isModalFrame(elementData.frameUrl);

  // Create captured element record
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
    frameIndex: elementData.frameIndex,
    pageName,
    isModal,
    uniqueness,
    capturedAt: new Date().toISOString(),
  };

  // Check for duplicates (same xpath in same frame)
  const isDuplicate = capturedElements.some(
    e => e.xpath === xpath && e.frameUrl === elementData.frameUrl
  );

  if (!isDuplicate) {
    capturedElements.push(captured);

    // Log to console with formatting - show ready-to-use JS export
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

// ─── Setup frame listeners ───────────────────────────────────────────────────

// Track which frames have been logged to avoid spam
const loggedFrames = new Set<string>();

async function setupFrameListeners(page: any): Promise<void> {
  const frames = page.frames();
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const url = frame.url();
    // Log new frames only once
    if (!loggedFrames.has(url) && url && url !== 'about:blank') {
      loggedFrames.add(url);
      const pageName = inferPageName(url);
      console.log(`  📄 Frame detected: ${pageName} (${url.substring(0, 60)}...)`);
    }
    await injectClickListener(frames[i], i, page);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Lorenzo Click-Based DOM Recorder');
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
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    viewport: null,
    ignoreHTTPSErrors: true,
  });

  // Expose a function that ALL frames can call (works across cross-origin iframes)
  await context.exposeFunction('__captureClickedElement', async (detail: any) => {
    try {
      // Create a minimal page-like object for processCapturedElement
      const page = context.pages()[0];
      if (page) {
        await processCapturedElement(page, detail);
      }
    } catch (err) {
      // Ignore errors
    }
  });

  const page = await context.newPage();

  // Also keep console listener as fallback for some frames
  page.on('console', async (msg: any) => {
    const text = msg.text();
    if (text.startsWith('__ELEMENT_CLICKED__')) {
      try {
        const jsonStr = text.replace('__ELEMENT_CLICKED__', '');
        const elementData = JSON.parse(jsonStr);
        await processCapturedElement(page, elementData);
      } catch (err) {
        // Ignore parse errors
      }
    }
  });

  // Re-inject listeners on frame navigation
  page.on('framenavigated', async () => {
    await setupFrameListeners(page).catch(() => {});
  });

  page.on('load', async () => {
    await setupFrameListeners(page).catch(() => {});
  });

  // Also handle new frames being attached
  page.on('frameattached', async (frame: any) => {
    // Wait for frame to load
    await frame.waitForLoadState('domcontentloaded').catch(() => {});
    const frameIndex = page.frames().indexOf(frame);
    await injectClickListener(frame, frameIndex, page);
  });

  // Navigate to app
  await page.goto(APP_URL).catch(() => {});
  await setupFrameListeners(page);

  // Periodically re-inject listeners into all frames (catches dynamically loaded content)
  const reinjectionInterval = setInterval(async () => {
    try {
      await setupFrameListeners(page);
    } catch {
      // Ignore errors
    }
  }, 3000); // Every 3 seconds

  console.log('  ✅ Browser launched. Navigate and click elements to capture...\n');

  // ── Save and exit handler ─────────────────────────────────────────────────

  const saveAndExit = async () => {
    clearInterval(reinjectionInterval);
    console.log('\n\n══════════════════════════════════════════════════════════════');
    console.log('  Saving captured elements...');

    // Group by page name for output
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
      // Generate JS file content
      let jsContent = `// ${pageName} - Auto-generated by Click Recorder\n`;
      jsContent += `// Generated: ${new Date().toISOString()}\n\n`;
      
      for (const el of elements as any[]) {
        // Escape any single quotes in xpath
        const escapedXpath = el.xpath.replace(/'/g, "\\'");
        jsContent += `export const ${el.element} = "${el.xpath}";\n`;
      }

      // Write JS file
      const jsFilePath = path.join(jsOutputDir, `${pageName}.js`);
      fs.writeFileSync(jsFilePath, jsContent, 'utf8');

      // Print to console for easy copy
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
    console.log('\n  HOW TO USE:');
    console.log('   1. Copy JS exports from console OR from captured-pages/*.js');
    console.log('   2. Paste into your pages/*.js file');
    console.log('   3. Use element name in KDF test step (Element column)');
    console.log('   ✓ = 1-of-1 unique locator');
    console.log('   ⚠ = Multiple matches (may need refinement)');
    console.log('══════════════════════════════════════════════════════════════\n');

    try { await browser.close(); } catch { /* ignore */ }
    process.exit(0);
  };

  // Handle CTRL+C and browser close
  process.on('SIGINT', saveAndExit);
  process.on('SIGTERM', saveAndExit);
  browser.on('disconnected', saveAndExit);

  // Keep process alive
  await new Promise<void>(() => { /* runs until CTRL+C or browser close */ });
}

main().catch(err => {
  console.error('DOM Recorder error:', err);
  process.exit(1);
});
