// Read-only validation of the ACTUAL executable Excel scripts against the ACTUAL
// runtime locator source (pages/*.js), matching how the runner resolves at runtime:
//   - Steps  : excelFramework/testcases/<Module>/<Excel>.xlsx  sheet "TestExecution"
//   - Locators: pages/<PageName>.js  ->  export const <Element> = "<xpath>"
// Run from the lorenzo-playwright-kdf root so the local `xlsx` dependency resolves.
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const root = __dirname; // lorenzo-playwright-kdf
const tcDir = path.join(root, 'excelFramework', 'testcases');
const pagesDir = path.join(root, 'pages');

const MANDATORY = ['StepNo', 'StepDescription', 'Page', 'Element', 'ElementText',
  'ActionKeyword', 'Property', 'Condition', 'TableColumnNames', 'Values', 'DatasetColumnName'];
const RUNTIME_VARS = new Set(['_RandomSurname', '_PASID', '_NHSNUMBER', '_USERNAME', '_PASSWORD']);

// ---- Build runtime locator repository from pages/*.js (same logic as pageLoaderUtils) ----
// Framework page fallback normalization (locatorUtils.getLocatorString):
const norm = s => s.toLowerCase().replace(/\s+/g, '');
const pageRepo = {};            // exactName -> Set(elements)
const pageNormMap = new Map();  // norm(pageName) -> exactName  (matches framework fallback)
const exportRe = /export\s+const\s+(\w+)\s*=\s*[\s\n]*(?:"([^"]*)"|'([^']*)')/gs;
for (const f of fs.readdirSync(pagesDir).filter(f => f.endsWith('.js'))) {
  const pageName = path.basename(f, '.js');
  const content = fs.readFileSync(path.join(pagesDir, f), 'utf8')
    .split(/\r?\n/).filter(l => !l.trimStart().startsWith('//')).join('\n');
  const els = new Set();
  let m;
  while ((m = exportRe.exec(content)) !== null) {
    const val = (m[2] ?? m[3]).trim();
    if (val.length > 0) els.add(m[1]);
  }
  pageRepo[pageName] = els;
  pageNormMap.set(norm(pageName), pageName);
}

// element -> set of pages (for suggesting correct page)
const elementToPages = new Map();
for (const [pg, els] of Object.entries(pageRepo))
  for (const e of els) {
    if (!elementToPages.has(e)) elementToPages.set(e, new Set());
    elementToPages.get(e).add(pg);
  }

// ---- Pick the executable workbook per module ----
function pickWorkbook(folder) {
  const files = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.xlsx'));
  if (files.length === 0) return null;
  // prefer LSTP_*.xlsx without "old"
  const pref = files.filter(f => /^LSTP_/i.test(f) && !/old/i.test(f));
  return path.join(folder, (pref[0] || files[0]));
}

const modules = fs.readdirSync(tcDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => d.name).sort();

let totals = { modules: 0, steps: 0, noSheet: 0, missingCols: 0, mutex: 0, badPage: 0, badElem: 0, caseMismatch: 0 };
const report = [];

for (const mod of modules) {
  const wbPath = pickWorkbook(path.join(tcDir, mod));
  const entry = { mod, wb: wbPath ? path.basename(wbPath) : '(none)', steps: 0, issues: [] };
  if (!wbPath) { entry.issues.push('No .xlsx found'); report.push(entry); continue; }

  const wb = xlsx.readFile(wbPath);
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'testexecution')
    || wb.SheetNames.find(n => n.toLowerCase() === mod.toLowerCase());
  if (!sheetName) {
    entry.issues.push(`No TestExecution sheet (sheets: ${wb.SheetNames.join(', ')})`);
    totals.noSheet++; report.push(entry); continue;
  }
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  entry.steps = rows.length;
  totals.steps += rows.length;
  totals.modules++;

  // column presence (header-level)
  const cols = rows.length ? Object.keys(rows[0]) : [];
  for (const c of MANDATORY) if (!cols.includes(c)) { entry.issues.push(`Missing column "${c}"`); totals.missingCols++; }

  rows.forEach(r => {
    const sn = r.StepNo !== '' ? r.StepNo : '?';
    const page = String(r.Page || '').trim();
    const el = String(r.Element || '').trim();
    const v = String(r.Values || '').trim();
    const d = String(r.DatasetColumnName || '').trim();

    if (v && d) { entry.issues.push(`Step ${sn}: BOTH Values & DatasetColumnName`); totals.mutex++; }
    if (d && RUNTIME_VARS.has(d)) { entry.issues.push(`Step ${sn}: runtime var "${d}" in DatasetColumnName`); totals.mutex++; }

    if (!el) return; // navigation/no-element steps
    // resolve page EXACTLY like the framework: exact key, else norm() fallback
    let resolvedPage = pageRepo[page] ? page : null;
    if (!resolvedPage && pageNormMap.has(norm(page))) {
      resolvedPage = pageNormMap.get(norm(page)); // resolves fine at runtime (case/space)
    }
    if (!resolvedPage) {
      const alt = elementToPages.get(el);
      entry.issues.push(`Step ${sn}: Page "${page}" UNRESOLVABLE (dash/underscore/missing)${alt ? ' -> try: ' + [...alt].slice(0,4).join(', ') : ''}`);
      totals.badPage++; return;
    }
    if (!pageRepo[resolvedPage].has(el)) {
      const alt = elementToPages.get(el);
      entry.issues.push(`Step ${sn}: Element "${el}" not in ${resolvedPage}.js${alt ? '  (exists in: ' + [...alt].slice(0,4).join(', ') + ')' : '  (element name found nowhere)'}`);
      totals.badElem++;
    }
  });

  report.push(entry);
}

console.log('='.repeat(72));
console.log('EXCEL (executable) x pages/*.js  — RUNTIME-ACCURATE VALIDATION (read only)');
console.log('='.repeat(72));
for (const e of report) {
  const st = e.issues.length ? `${e.issues.length} ISSUE(S)` : 'OK';
  console.log(`\n[${st}] ${e.mod}/${e.wb}  (${e.steps} steps)`);
  for (const i of e.issues.slice(0, 12)) console.log('   - ' + i);
  if (e.issues.length > 12) console.log(`   ... +${e.issues.length - 12} more`);
}
console.log('\n' + '='.repeat(72));
console.log('GRAND TOTALS');
console.log('='.repeat(72));
console.log(`Modules validated:        ${totals.modules}`);
console.log(`Total steps:              ${totals.steps}`);
console.log(`Missing columns:          ${totals.missingCols}`);
console.log(`Values/Dataset conflicts: ${totals.mutex}`);
console.log(`Page UNRESOLVABLE (fatal): ${totals.badPage}`);
console.log(`Bad Element (fatal):       ${totals.badElem}`);
const clean = report.filter(e => e.issues.length === 0).length;
console.log(`\nClean workbooks: ${clean}/${report.length}`);
