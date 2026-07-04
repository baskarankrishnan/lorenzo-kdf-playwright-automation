/**
 * Lorenzo DOM Element Recorder (plain Node.js — no TypeScript compilation needed)
 * Run: npm run record:dom
 *
 * HOW TO USE:
 *   1. Browser opens automatically at the Lorenzo SSO login URL
 *   2. Log in and navigate through every Lorenzo page / modal / iframe you want
 *   3. Every frame load is intercepted and all interactive elements are captured
 *   4. Press CTRL+C when done → output saved to:
 *      kdf-generation/kdf-samples/ElementRepository_Lorenzo_discovered.json
 */

'use strict';

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = process.env.URL ||
  'http://dxcappchne8097a.cscidp.net/webclient_sso/extlogon.aspx?idp=oidnatlogon&IsClientInfoNotRequired=true';
const OUTPUT_PATH = path.join(__dirname, 'kdf-samples', 'ElementRepository_Lorenzo_discovered.json');

const SCAN_SELECTOR = [
  'input', 'button', 'select', 'textarea',
  'a[href]', '[title]', '[dikey]', '[atei]', '[onclick]',
  'img[title]', 'img[alt]', 'td[title]', 'th[title]',
  'span[id]', 'div[id]', 'label',
].join(', ');

// ─── URL → page name ─────────────────────────────────────────────────────────
function inferPageName(pageUrl, frameUrl) {
  const u = (frameUrl || pageUrl || '').toLowerCase();
  const mappings = [
    // Login
    [/oidcportal.*authorize/i,                        'pageLogin'],
    [/extlogon\.aspx/i,                               'pageLogin'],
    // Home / main
    [/appmainpage/i,                                  'pageHome'],
    // Patient search (identity management)
    [/identity.*management.*patientbasicsearch/i,     'pagePatientBasicSearch'],
    [/identity.*management.*patientsearchnottraced/i, 'pagePatientBasicSearch'],
    [/identity.*management.*patientsearchprevtraced/i,'pagePatientBasicSearch'],
    [/identity.*management.*patientsearch/i,          'pagePatientSearch'],
    // Patient registration
    [/identity.*management.*patientregistration/i,    'pageRegRegistration'],
    // Enterprise scheduling patient search
    [/enterprise.*scheduling.*patientsearch/i,        'pagePatientBasicSearch'],
    [/enterprise.*scheduling.*ipsmbasicsearch/i,      'pageIPSMBasicSearchCriteria'],
    [/enterprise.*scheduling.*ipsmfindbedspace/i,     'pageIPPegboardCurrentView'],
    [/enterprise.*scheduling.*ipsmfindward/i,         'pageIPPegboardCurrentView'],
    [/enterprise.*scheduling.*ipsmeditbed/i,          'pageEditBedBooking'],
    // Inpatient
    [/inpatient.*pegboard/i,                          'pageIPPegboardCurrentView'],
    [/inpatient.*pbrdcurrview/i,                      'pageIPPegboardCurrentView'],
    [/inpatient.*pbrdhistory/i,                       'pageIPPegboardCurrentView'],
    [/inpatient.*pbrdmpiwards/i,                      'pageInpatient'],
    [/inpatient.*pbrdmpimy/i,                         'pageInpatient'],
    [/inpatient.*pbrdoverview/i,                      'pageInpatient'],
    [/inpatient.*patadmadmission/i,                   'pagePatADMAdmission'],
    [/inpatient.*patadmeditadmission/i,               'pagePatADMEditAdmission'],
    [/inpatient.*patadmotherdetails/i,                'pageAdditionalDetails'],
    [/inpatient.*patdsgmedicaldischarge/i,            'pageFmMedicalDischarge'],
    [/inpatient.*patdsgdischarge/i,                   'pageFmMedicalDischarge'],
    [/inpatient.*patleveditpatientleave/i,            'pagepatlevRetroPatientLeave'],
    [/inpatient.*patlevpatientleave/i,                'pagepatlevRetroPatientLeave'],
    [/inpatient.*patlevpatientreturn/i,               'pagepatlevRetroPatientLeave'],
    [/inpatient.*pattrspatienttransfer/i,             'pagePatientTransfer'],
    // Referral management
    [/referral.*mgmt.*rfmanagereferral/i,             'pageManageReferral'],
    [/referral.*rfmanagereferral/i,                   'pageManageReferral'],
    // Care events
    [/care.*events.*fmcareeventdetails/i,             'PageCareevents'],
    // Care management / coding
    [/coding.*management.*mcgqlinkfavourites/i,       'pageCBasicSearchCodingEntity'],
    // Care provider SFS
    [/careprovidersfs/i,                              'pageOrganisationSFS'],
    // Intray
    [/intraylist/i,                                   'pageIntrayList'],
    // Context banner
    [/appcontextbanner/i,                             'pageBanner'],
    // Transfer
    [/apptransfer/i,                                  'pagePatientTransfer'],
    // Message dialog
    [/imsgdialog/i,                                   'pageWarning'],
    // Fallback wizard patterns
    [/appwizardpage/i,                                'pageAppWizard'],
    [/appdialog/i,                                    'pageDialog'],
    [/appfullpage/i,                                  'pageFullPage'],
  ];
  for (const [re, name] of mappings) {
    if (re.test(u)) return name;
  }
  return 'pageUnknown';
}

// ─── Build xpath ──────────────────────────────────────────────────────────────
function buildXpath(el) {
  const tag = el.tag || '*';
  if (el.dikey)     return `//${tag}[@dikey='${el.dikey}']`;
  if (el.title)     return `//${tag}[@title='${el.title}']`;
  if (el.atei)      return `//${tag}[@atei='${el.atei}']`;
  if (el.id)        return `//${tag}[@id='${el.id}']`;
  if (el.name)      return `//${tag}[@name='${el.name}']`;
  if (el.alt)       return `//${tag}[@alt='${el.alt}']`;
  if (el.innerText && el.innerText.length > 0 && el.innerText.length < 60)
    return `//${tag}[normalize-space(text())='${el.innerText.replace(/'/g, "\\'")}']`;
  return `//${tag}`;
}

// ─── Build element name ───────────────────────────────────────────────────────
function buildElementName(el) {
  const prefixMap = {
    input: 'txt_', button: 'btn_', select: 'cmb_', textarea: 'txt_',
    a: 'lnk_', img: 'ico_', td: 'lbl_', th: 'lbl_',
    span: 'lbl_', label: 'lbl_', div: 'lbl_',
  };
  let prefix = prefixMap[el.tag] || 'el_';
  if (el.tag === 'input') {
    if (el.type === 'checkbox')                               prefix = 'chk_';
    else if (el.type === 'radio')                             prefix = 'rad_';
    else if (['submit','button','image'].includes(el.type))   prefix = 'btn_';
    else if (['date','datetime-local'].includes(el.type))     prefix = 'dte_';
  }
  const raw = el.title || el.dikey || el.id || el.name || el.alt || el.innerText || '';
  const suffix = raw
    .replace(/[^a-zA-Z0-9\s]/g, '').trim()
    .split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('').slice(0, 40);
  return suffix ? `${prefix}${suffix}` : `${prefix}Unknown`;
}

// ─── Scan a single frame ──────────────────────────────────────────────────────
async function scanFrame(frame, pageUrl) {
  const frameUrl = frame.url();
  if (!frameUrl || frameUrl === 'about:blank') return [];
  const pageName = inferPageName(pageUrl, frameUrl);

  const raw = await frame.$$eval(SCAN_SELECTOR, (nodes) =>
    nodes.map((el) => ({
      tag:        (el.tagName || '').toLowerCase(),
      id:         el.id || '',
      name:       el.name || '',
      title:      el.getAttribute('title') || '',
      alt:        el.getAttribute('alt') || '',
      dikey:      el.getAttribute('dikey') || '',
      atei:       el.getAttribute('atei') || '',
      className:  el.className || '',
      innerText:  (el.innerText || '').trim().substring(0, 80),
      type:       el.type || '',
      placeholder:el.placeholder || '',
      href:       el.href || '',
    }))
  ).catch(() => []);

  return raw
    .filter(e => e.id || e.name || e.title || e.alt || e.dikey || e.atei ||
                 (e.innerText && e.innerText.length > 0))
    .map(e => ({
      ...e,
      recommendedXpath: buildXpath(e),
      recommendedName:  buildElementName(e),
      frameUrl,
      pageName,
    }));
}

// ─── Dedup within a page ──────────────────────────────────────────────────────
function dedup(elements) {
  const seen = new Set();
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
  console.log(`  App URL : ${APP_URL}`);
  console.log(`  Output  : ${OUTPUT_PATH}`);
  console.log('──────────────────────────────────────────────────────────');
  console.log('  1. Log in and navigate through every page/modal/iframe');
  console.log('  2. Press CTRL+C when done to save results');
  console.log('══════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: false,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({ viewport: null });
  const page    = await context.newPage();

  /** pageName → { pageUrl, elements[] } */
  const pageMap = new Map();

  function getOrCreate(pageName, frameUrl) {
    if (!pageMap.has(pageName)) pageMap.set(pageName, { pageUrl: frameUrl, elements: [] });
    return pageMap.get(pageName);
  }

  async function scanAllFrames(pg) {
    const url = pg.url();
    for (const frame of pg.frames()) {
      const found = await scanFrame(frame, url);
      if (!found.length) continue;
      const pageName = found[0].pageName;
      const entry = getOrCreate(pageName, found[0].frameUrl);
      entry.elements.push(...found);
      entry.elements = dedup(entry.elements);
      process.stdout.write(
        `  📄 ${pageName} (${frame === pg.mainFrame() ? 'main' : 'iframe'}) +${found.length} → total ${entry.elements.length}\n`
      );
    }
  }

  // Wire up events for current and future pages
  function wirePage(pg) {
    pg.on('domcontentloaded', () => scanAllFrames(pg).catch(() => {}));
    pg.on('framenavigated',   () => scanAllFrames(pg).catch(() => {}));
  }

  context.on('page', wirePage);
  wirePage(page);

  await page.goto(APP_URL).catch(() => {});
  console.log('  ✅ Browser launched. Navigate the application now...\n');

  const saveAndExit = async () => {
    console.log('\n\n══════════════════════════════════════════════════════════');
    console.log('  Saving...');

    // Final scan
    for (const pg of context.pages()) {
      if (!pg.isClosed()) await scanAllFrames(pg).catch(() => {});
    }

    // Build output
    const output = {};
    let total = 0;
    for (const [pageName, entry] of pageMap) {
      const els = dedup(entry.elements);
      output[pageName] = els.map(e => ({
        element:  e.recommendedName,
        xpath:    e.recommendedXpath,
        tag:      e.tag,
        id:       e.id,
        name:     e.name,
        title:    e.title,
        alt:      e.alt,
        dikey:    e.dikey,
        atei:     e.atei,
        innerText:e.innerText,
        type:     e.type,
        frameUrl: e.frameUrl,
      }));
      total += els.length;
    }

    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

    // Summary
    console.log('\n  Page                                   | Elements');
    console.log('  ──────────────────────────────────────────────────');
    for (const [name, entry] of pageMap) {
      const c = String(dedup(entry.elements).length).padStart(8);
      console.log(`  ${name.padEnd(38)} | ${c}`);
    }
    console.log('  ──────────────────────────────────────────────────');
    console.log(`  TOTAL                                  | ${String(total).padStart(8)}`);
    console.log(`\n  ✅ Saved: ${OUTPUT_PATH}`);
    console.log('══════════════════════════════════════════════════════════\n');

    try { await browser.close(); } catch { }
    process.exit(0);
  };

  process.on('SIGINT',  saveAndExit);
  process.on('SIGTERM', saveAndExit);
  browser.on('disconnected', saveAndExit);

  // Keep alive
  await new Promise(() => {});
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
