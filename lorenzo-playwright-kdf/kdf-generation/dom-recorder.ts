/**
 * Lorenzo DOM Element Recorder
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 *   Navigate through the Lorenzo application manually while this script
 *   automatically scans every page and frame you visit, capturing ALL
 *   interactive DOM elements with their real attributes (title, id, name,
 *   dikey, atei, class, text, tag, inferred xpath).
 *
 *   Output → kdf-generation/kdf-samples/ElementRepository_Lorenzo_discovered.json
 *
 * USAGE
 *   cd lorenzo-playwright-kdf
 *   npx ts-node kdf-generation/dom-recorder.ts
 *
 *   OR via npm script (add to package.json):
 *   "record:dom": "ts-node kdf-generation/dom-recorder.ts"
 *
 * HOW IT WORKS
 *   1. Launches Edge automatically and opens the Lorenzo SSO login URL
 *   2. Every time a frame finishes loading (or you navigate), the recorder
 *      scans ALL frames for interactive elements:
 *      input, button, img[title], a, select, textarea, td[title], span[title],
 *      div[atei], [dikey], [onclick]
 *   3. For each element it captures:
 *      - tag name, id, name, title, alt, dikey, atei, class, innerText
 *      - Builds a recommended xpath (the most specific available)
 *      - Groups by page/frame URL → page name mapping
 *   4. After you press CTRL+C (or close the browser), the script writes the
 *      discovered element repository JSON file.
 *   5. A summary table is printed showing how many elements were found per page.
 *
 * TIPS
 *   - Navigate slowly — give each page 1-2 seconds to settle before moving on
 *   - Open every modal, popup, iframe and sub-page you want elements from
 *   - After the run, cross-reference discovered elements against your KDF steps
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

const OUTPUT_PATH = path.join(SCRIPT_DIR, 'kdf-samples', 'ElementRepository_Lorenzo_discovered.json');

/** Tags to scan for elements */
const SCAN_SELECTORS = [
  'input',
  'button',
  'select',
  'textarea',
  'a[href]',
  '[title]',
  '[dikey]',
  '[atei]',
  '[onclick]',
  'img[title]',
  'img[alt]',
  'td[title]',
  'th[title]',
  'span[id]',
  'div[id]',
  'label',
].join(', ');

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscoveredElement {
  tag: string;
  id: string;
  name: string;
  title: string;
  alt: string;
  dikey: string;
  atei: string;
  className: string;
  innerText: string;
  type: string;
  placeholder: string;
  href: string;
  recommendedXpath: string;
  recommendedName: string;
  frameUrl: string;
  pageName: string;
  discoveredAt: string;
}

interface PageElements {
  pageName: string;
  pageUrl: string;
  elements: DiscoveredElement[];
}

// ─── URL → Page name mapping (mirrors your pages/ directory naming) ───────────

function inferPageName(url: string, frameUrl: string): string {
  const u = (frameUrl || url).toLowerCase();

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
    [/appwizardpage.*createuser/i, 'pageCreateuser'],
    [/appwizardpage.*defusers/i, 'pageDefUsers'],
    [/appwizardpage.*usersearch/i, 'pageUserSearch'],
    [/appwizardpage.*sysconfig/i, 'pageSysconfig'],
    [/appwizardpage.*clinicalnote/i, 'pageClinicalnoteListandDetails'],
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
    [/appwizardpage/i, 'pageAppWizard'],
    [/appdialog/i, 'pageDialog'],
    [/appfullpage/i, 'pageFullPage'],
    [/.*/i, 'pageUnknown'],
  ];

  for (const [pattern, name] of mappings) {
    if (pattern.test(u)) return name;
  }
  return 'pageUnknown';
}

// ─── Build recommended xpath from element attributes ─────────────────────────

function buildXpath(el: {
  tag: string; id: string; name: string; title: string; alt: string;
  dikey: string; atei: string; type: string; innerText: string;
}): string {
  const tag = el.tag || '*';

  // Priority: dikey (Lorenzo-specific) → title → id → name → alt → text
  if (el.dikey) return `//${tag}[@dikey='${el.dikey}']`;
  if (el.title) return `//${tag}[@title='${el.title}']`;
  if (el.atei) return `//${tag}[@atei='${el.atei}']`;
  if (el.id) return `//${tag}[@id='${el.id}']`;
  if (el.name) return `//${tag}[@name='${el.name}']`;
  if (el.alt) return `//${tag}[@alt='${el.alt}']`;
  if (el.innerText && el.innerText.length < 60 && el.innerText.length > 0) {
    return `//${tag}[normalize-space(text())='${el.innerText.replace(/'/g, "\\'")}']`;
  }
  return `//${tag}`;
}

// ─── Build a recommended KDF element name ────────────────────────────────────

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
  };

  // Input type overrides
  let prefix = prefixMap[el.tag] ?? 'el_';
  if (el.tag === 'input') {
    if (el.type === 'checkbox') prefix = 'chk_';
    else if (el.type === 'radio') prefix = 'rad_';
    else if (el.type === 'submit' || el.type === 'button' || el.type === 'image') prefix = 'btn_';
    else if (el.type === 'date' || el.type === 'datetime-local') prefix = 'dte_';
  }

  // Build a readable suffix
  const raw = el.title || el.dikey || el.id || el.name || el.alt || el.innerText || '';
  const suffix = raw
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
    .slice(0, 40);

  return suffix ? `${prefix}${suffix}` : `${prefix}Unknown`;
}

// ─── Scan a single frame for elements ────────────────────────────────────────

async function scanFrame(
  frame: import('@playwright/test').Frame,
  pageUrl: string,
  pageName: string
): Promise<DiscoveredElement[]> {
  try {
    const frameUrl = frame.url();
    const rawElements = await frame.$$eval(
      SCAN_SELECTORS,
      (nodes) => nodes.map((el: any) => ({
        tag: (el.tagName as string)?.toLowerCase() ?? '',
        id: (el.id as string) ?? '',
        name: (el.name as string) ?? '',
        title: el.getAttribute('title') ?? '',
        alt: el.getAttribute('alt') ?? '',
        dikey: el.getAttribute('dikey') ?? '',
        atei: el.getAttribute('atei') ?? '',
        className: (el.className as string) ?? '',
        innerText: ((el.innerText as string) ?? '').trim().substring(0, 80),
        type: (el.type as string) ?? '',
        placeholder: (el.placeholder as string) ?? '',
        href: (el.href as string) ?? '',
      }))
    ).catch(() => []);

    return rawElements
      .filter(e =>
        // Skip empty/useless elements
        e.id || e.name || e.title || e.alt || e.dikey || e.atei ||
        (e.innerText && e.innerText.length > 0 && e.innerText.length < 80)
      )
      .map(e => ({
        ...e,
        recommendedXpath: buildXpath(e),
        recommendedName: buildElementName(e),
        frameUrl,
        pageName,
        discoveredAt: new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

// ─── Deduplicate elements by xpath within a page ─────────────────────────────

function dedupeElements(elements: DiscoveredElement[]): DiscoveredElement[] {
  const seen = new Set<string>();
  return elements.filter(e => {
    const key = `${e.pageName}::${e.recommendedXpath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Lorenzo DOM Element Recorder');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  App URL  : ${APP_URL}`);
  console.log(`  Output   : ${OUTPUT_PATH}`);
  console.log('──────────────────────────────────────────────────────────');
  console.log('  HOW TO USE:');
  console.log('   1. The browser will open automatically');
  console.log('   2. Log in and navigate through every Lorenzo page you');
  console.log('      want to capture elements from');
  console.log('   3. Open modals, popups, and sub-pages too');
  console.log('   4. When done, press CTRL+C in this terminal');
  console.log('   5. The discovered elements will be saved to JSON');
  console.log('══════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: false,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // ── Accumulated discoveries ────────────────────────────────────────────────
  const pageMap = new Map<string, PageElements>();

  function getOrCreate(pageName: string, pageUrl: string): PageElements {
    if (!pageMap.has(pageName)) {
      pageMap.set(pageName, { pageName, pageUrl, elements: [] });
    }
    return pageMap.get(pageName)!;
  }

  async function scanAllFrames(pg: import('@playwright/test').Page) {
    const url = pg.url();
    const frames = [pg.mainFrame(), ...pg.frames()];
    for (const frame of frames) {
      const frameUrl = frame.url();
      if (!frameUrl || frameUrl === 'about:blank') continue;
      const pageName = inferPageName(url, frameUrl);
      const found = await scanFrame(frame, url, pageName);
      if (found.length > 0) {
        const entry = getOrCreate(pageName, frameUrl);
        entry.elements.push(...found);
        entry.elements = dedupeElements(entry.elements);
        process.stdout.write(
          `  📄 ${pageName} (${frame === pg.mainFrame() ? 'main' : 'frame'}) → +${found.length} elements (total: ${entry.elements.length})\n`
        );
      }
    }
  }

  // Scan on every frame navigation
  context.on('page', async (newPage) => {
    newPage.on('domcontentloaded', async () => {
      await scanAllFrames(newPage).catch(() => {});
    });
    newPage.on('framenavigated', async () => {
      await scanAllFrames(newPage).catch(() => {});
    });
  });

  page.on('domcontentloaded', async () => {
    await scanAllFrames(page).catch(() => {});
  });

  page.on('framenavigated', async () => {
    await scanAllFrames(page).catch(() => {});
  });

  // Navigate to app
  await page.goto(APP_URL).catch(() => {});

  // ── Wait until browser closes or CTRL+C ───────────────────────────────────
  console.log('\n  ✅ Browser launched. Navigate the application now...\n');

  const saveAndExit = async () => {
    console.log('\n\n══════════════════════════════════════════════════════════');
    console.log('  Saving discovered elements...');

    // Final scan of all open pages
    for (const pg of context.pages()) {
      if (!pg.isClosed()) {
        await scanAllFrames(pg).catch(() => {});
      }
    }

    // Build output structure
    const output: Record<string, object[]> = {};
    let totalElements = 0;

    for (const [pageName, entry] of pageMap) {
      const deduped = dedupeElements(entry.elements);
      output[pageName] = deduped.map(e => ({
        element: e.recommendedName,
        xpath: e.recommendedXpath,
        tag: e.tag,
        id: e.id,
        name: e.name,
        title: e.title,
        alt: e.alt,
        dikey: e.dikey,
        atei: e.atei,
        innerText: e.innerText,
        type: e.type,
        frameUrl: e.frameUrl,
      }));
      totalElements += deduped.length;
    }

    // Write JSON
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

    // Print summary table
    console.log('\n  Summary of discovered elements:');
    console.log('  ──────────────────────────────────────────────────');
    console.log('  Page Name                              | Elements');
    console.log('  ──────────────────────────────────────────────────');
    for (const [pageName, entry] of pageMap) {
      const count = String(dedupeElements(entry.elements).length).padStart(8);
      console.log(`  ${pageName.padEnd(38)} | ${count}`);
    }
    console.log('  ──────────────────────────────────────────────────');
    console.log(`  TOTAL                                  | ${String(totalElements).padStart(8)}`);
    console.log('══════════════════════════════════════════════════════════');
    console.log(`\n  ✅ Output saved to:\n     ${OUTPUT_PATH}\n`);
    console.log('  HOW TO USE THE OUTPUT:');
    console.log('   • Open ElementRepository_Lorenzo_discovered.json');
    console.log('   • Find the page+element matching your failing step');
    console.log('   • Copy the "xpath" value into the relevant pages/ JS file');
    console.log('   • Use the "element" name as the Element column in your KDF step');
    console.log('══════════════════════════════════════════════════════════\n');

    try { await browser.close(); } catch { /* ignore */ }
    process.exit(0);
  };

  // Handle CTRL+C
  process.on('SIGINT', saveAndExit);
  process.on('SIGTERM', saveAndExit);

  // Handle browser close by user
  browser.on('disconnected', saveAndExit);

  // Keep process alive
  await new Promise<void>(() => { /* runs until CTRL+C or browser close */ });
}

main().catch(err => {
  console.error('DOM Recorder error:', err);
  process.exit(1);
});
