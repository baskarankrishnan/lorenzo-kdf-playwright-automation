// Read-only generator: per-workbook fix list for the executable Excel scripts.
// Mirrors the runtime resolver (locatorUtils.getLocatorString) and proposes fixes.
// Output: KDF_EXCEL_FIX_LIST.csv
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const root = __dirname;
const tcDir = path.join(root, 'excelFramework', 'testcases');
const pagesDir = path.join(root, 'pages');
const RUNTIME_VARS = new Set(['_RandomSurname', '_PASID', '_NHSNUMBER', '_USERNAME', '_PASSWORD']);

// framework page fallback: lowercase + strip whitespace
const normFw = s => s.toLowerCase().replace(/\s+/g, '');
// aggressive: lowercase + strip all non-alphanumeric (for SUGGESTING a fix target)
const normHard = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// ---- build pages repo ----
const pageRepo = {};
const pageFwMap = new Map();     // normFw -> exact
const pageHardMap = new Map();   // normHard -> [exact,...]
const exportRe = /export\s+const\s+(\w+)\s*=\s*[\s\n]*(?:"([^"]*)"|'([^']*)')/gs;
for (const f of fs.readdirSync(pagesDir).filter(f => f.endsWith('.js'))) {
  const pageName = path.basename(f, '.js');
  const content = fs.readFileSync(path.join(pagesDir, f), 'utf8')
    .split(/\r?\n/).filter(l => !l.trimStart().startsWith('//')).join('\n');
  const els = new Set(); let m;
  while ((m = exportRe.exec(content)) !== null) { const v = (m[2] ?? m[3]).trim(); if (v) els.add(m[1]); }
  pageRepo[pageName] = els;
  pageFwMap.set(normFw(pageName), pageName);
  const h = normHard(pageName);
  if (!pageHardMap.has(h)) pageHardMap.set(h, []);
  pageHardMap.get(h).push(pageName);
}
const elementToPages = new Map();
for (const [pg, els] of Object.entries(pageRepo))
  for (const e of els) { if (!elementToPages.has(e)) elementToPages.set(e, new Set()); elementToPages.get(e).add(pg); }

function pickWorkbook(folder) {
  const files = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.xlsx'));
  if (!files.length) return null;
  const pref = files.filter(f => /^LSTP_/i.test(f) && !/old/i.test(f));
  return path.join(folder, (pref[0] || files[0]));
}

const csv = [['Module', 'Workbook', 'Step', 'IssueType', 'Page', 'Element', 'Current', 'Proposed', 'Flag']];
const csvEsc = s => `"${String(s).replace(/"/g, '""')}"`;

const modules = fs.readdirSync(tcDir, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => d.name).sort();
let counts = { pageAuto: 0, pageReview: 0, elemAuto: 0, elemReview: 0, elemLocator: 0, mutex: 0 };

for (const mod of modules) {
  const wbPath = pickWorkbook(path.join(tcDir, mod));
  if (!wbPath) continue;
  const wbName = path.basename(wbPath);
  const wb = xlsx.readFile(wbPath);
  const sheet = wb.SheetNames.find(n => n.toLowerCase() === 'testexecution') || wb.SheetNames.find(n => n.toLowerCase() === mod.toLowerCase());
  if (!sheet) continue;
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' });

  rows.forEach(r => {
    const sn = r.StepNo !== '' ? r.StepNo : '?';
    const page = String(r.Page || '').trim();
    const el = String(r.Element || '').trim();
    const v = String(r.Values || '').trim();
    const d = String(r.DatasetColumnName || '').trim();

    // mutex
    if (v && d) {
      const proposed = RUNTIME_VARS.has(v) || RUNTIME_VARS.has(d)
        ? `keep Values, clear DatasetColumnName` : `clear ONE (ambiguous)`;
      const flag = (RUNTIME_VARS.has(v) || RUNTIME_VARS.has(d)) ? 'AUTO' : 'NEEDS_REVIEW';
      csv.push([mod, wbName, sn, 'ValuesDatasetConflict', page, el, `Values="${v}" Dataset="${d}"`, proposed, flag]);
      counts.mutex++;
    }

    if (!el) return;
    // resolve page like framework
    let resolvedPage = pageRepo[page] ? page : (pageFwMap.get(normFw(page)) || null);

    if (!resolvedPage) {
      // suggest via hard-normalization
      const cand = pageHardMap.get(normHard(page)) || [];
      if (cand.length === 1) {
        csv.push([mod, wbName, sn, 'UnresolvablePage', page, el, page, cand[0], 'AUTO']);
        counts.pageAuto++;
        resolvedPage = cand[0]; // continue to check element under proposed page
      } else {
        csv.push([mod, wbName, sn, 'UnresolvablePage', page, el, page, cand.join(' | ') || '(no match)', 'NEEDS_REVIEW']);
        counts.pageReview++;
        return;
      }
    }

    // element check under resolved page
    if (!pageRepo[resolvedPage].has(el)) {
      const alt = elementToPages.get(el);
      if (!alt) {
        csv.push([mod, wbName, sn, 'ElementMissing', resolvedPage, el, `${page} / ${el}`, '(exists nowhere)', 'NEEDS_LOCATOR']);
        counts.elemLocator++;
      } else if (alt.size === 1) {
        csv.push([mod, wbName, sn, 'ElementWrongPage', resolvedPage, el, `page=${page}`, `page -> ${[...alt][0]}`, 'AUTO']);
        counts.elemAuto++;
      } else {
        csv.push([mod, wbName, sn, 'ElementWrongPage', resolvedPage, el, `page=${page}`, [...alt].join(' | '), 'NEEDS_REVIEW']);
        counts.elemReview++;
      }
    }
  });
}

const outPath = path.join(root, 'KDF_EXCEL_FIX_LIST.csv');
fs.writeFileSync(outPath, csv.map(r => r.map(csvEsc).join(',')).join('\n'), 'utf8');

console.log('Fix list written:', outPath);
console.log('Total rows:', csv.length - 1);
console.log('--- by resolution ---');
console.log(`Page rename  AUTO:         ${counts.pageAuto}`);
console.log(`Page         NEEDS_REVIEW: ${counts.pageReview}`);
console.log(`Element wrong-page AUTO:   ${counts.elemAuto}`);
console.log(`Element      NEEDS_REVIEW: ${counts.elemReview}`);
console.log(`Element      NEEDS_LOCATOR:${counts.elemLocator}`);
console.log(`Values/Dataset conflicts: ${counts.mutex}`);
const auto = counts.pageAuto + counts.elemAuto;
console.log(`\nSafe AUTO-fixable now: ${auto}`);
console.log(`Need your input:       ${counts.pageReview + counts.elemReview + counts.elemLocator + counts.mutex}`);
