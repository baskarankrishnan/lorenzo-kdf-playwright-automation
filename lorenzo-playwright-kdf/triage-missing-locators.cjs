// Read-only: for each NEEDS_LOCATOR element, check whether a near-match export
// already exists in pages/*.js (stray space / casing / punctuation only).
// Splits the 75 into "mechanical rename" vs "truly absent (needs live capture)".
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const root = __dirname;
const tcDir = path.join(root, 'excelFramework', 'testcases');
const pagesDir = path.join(root, 'pages');
const normFw = s => s.toLowerCase().replace(/\s+/g, '');
const normHard = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const pageRepo = {};
const pageFwMap = new Map();
const exportRe = /export\s+const\s+(\w+)\s*=\s*[\s\n]*(?:"([^"]*)"|'([^']*)')/gs;
for (const f of fs.readdirSync(pagesDir).filter(f => f.endsWith('.js'))) {
  const pageName = path.basename(f, '.js');
  const content = fs.readFileSync(path.join(pagesDir, f), 'utf8')
    .split(/\r?\n/).filter(l => !l.trimStart().startsWith('//')).join('\n');
  const els = new Set(); let m;
  while ((m = exportRe.exec(content)) !== null) { const v = (m[2] ?? m[3]).trim(); if (v) els.add(m[1]); }
  pageRepo[pageName] = els;
  pageFwMap.set(normFw(pageName), pageName);
}
// hard-normalized element -> [{page, exact}]
const elemHard = new Map();
for (const [pg, els] of Object.entries(pageRepo))
  for (const e of els) {
    const h = normHard(e);
    if (!elemHard.has(h)) elemHard.set(h, []);
    elemHard.get(h).push({ page: pg, exact: e });
  }

function pickWorkbook(folder) {
  const files = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.xlsx'));
  if (!files.length) return null;
  const pref = files.filter(f => /^LSTP_/i.test(f) && !/old/i.test(f));
  return path.join(folder, (pref[0] || files[0]));
}

const modules = fs.readdirSync(tcDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => d.name).sort();

const mechanicalSamePage = []; // element typo, correct page -> rename element in Excel
const mechanicalOtherPage = []; // element typo AND on another page -> fix both
const trulyAbsent = [];         // no near-match anywhere -> live capture

for (const mod of modules) {
  const wbPath = pickWorkbook(path.join(tcDir, mod));
  if (!wbPath) continue;
  const wb = xlsx.readFile(wbPath);
  const sheet = wb.SheetNames.find(n => n.toLowerCase() === 'testexecution') || wb.SheetNames.find(n => n.toLowerCase() === mod.toLowerCase());
  if (!sheet) continue;
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' });

  rows.forEach(r => {
    const sn = r.StepNo; const page = String(r.Page || '').trim(); const el = String(r.Element || '').trim();
    if (sn === '' || !el) return;
    const resolvedPage = pageRepo[page] ? page : (pageFwMap.get(normFw(page)) || null);
    if (resolvedPage && pageRepo[resolvedPage].has(el)) return; // fine
    // only care about elements that exist NOWHERE exactly
    let existsExact = false;
    for (const els of Object.values(pageRepo)) if (els.has(el)) { existsExact = true; break; }
    if (existsExact) return; // handled by wrong-page logic elsewhere

    const h = normHard(el);
    const near = elemHard.get(h);
    if (near) {
      const samePage = resolvedPage && near.find(n => n.page === resolvedPage);
      if (samePage) mechanicalSamePage.push({ mod, sn, page, el, fixTo: samePage.exact });
      else mechanicalOtherPage.push({ mod, sn, page, el, candidates: near.map(n => `${n.exact}@${n.page}`) });
    } else {
      trulyAbsent.push({ mod, sn, page, el });
    }
  });
}

console.log('=== NEEDS_LOCATOR TRIAGE ===\n');
console.log(`A) MECHANICAL (typo, element on the SAME page) -> just rename in Excel: ${mechanicalSamePage.length}`);
for (const x of mechanicalSamePage) console.log(`   ${x.mod} step ${x.sn}: "${x.el}" -> "${x.fixTo}"  (page ${x.page})`);
console.log(`\nB) NEAR-MATCH on ANOTHER page -> rename element (+maybe page): ${mechanicalOtherPage.length}`);
for (const x of mechanicalOtherPage) console.log(`   ${x.mod} step ${x.sn}: "${x.el}" ~ ${x.candidates.slice(0,3).join(', ')}`);
console.log(`\nC) TRULY ABSENT -> needs live-app capture: ${trulyAbsent.length}`);
const byMod = {};
for (const x of trulyAbsent) { (byMod[x.mod] ??= []).push(`${x.el}(s${x.sn})`); }
for (const [m, list] of Object.entries(byMod)) console.log(`   ${m}: ${list.join(', ')}`);
