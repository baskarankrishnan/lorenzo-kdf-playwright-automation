// Compute de-duplicated AUTO page-fix map for executable Excel workbooks.
// Output: apply-map.json  -> [{ file, module, step, oldPage, newPage, reason }]
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
const pageHardMap = new Map();
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

const applyMap = [];
const modules = fs.readdirSync(tcDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();

for (const mod of modules) {
  const wbPath = pickWorkbook(path.join(tcDir, mod));
  if (!wbPath) continue;
  const wb = xlsx.readFile(wbPath);
  const sheet = wb.SheetNames.find(n => n.toLowerCase() === 'testexecution') || wb.SheetNames.find(n => n.toLowerCase() === mod.toLowerCase());
  if (!sheet) continue;
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' });

  const perStep = new Map(); // step -> {oldPage,newPage,reason}
  rows.forEach(r => {
    const sn = r.StepNo;
    const page = String(r.Page || '').trim();
    const el = String(r.Element || '').trim();
    if (sn === '' || !el) return;

    const fwResolved = pageRepo[page] ? page : (pageFwMap.get(normFw(page)) || null);
    if (fwResolved && pageRepo[fwResolved].has(el)) return; // already fine

    // 1) element lives in exactly one page -> that page (element-target wins)
    const cand = elementToPages.get(el);
    if (cand && cand.size === 1) {
      const target = [...cand][0];
      if (target !== page) perStep.set(sn, { oldPage: page, newPage: target, reason: 'ElementWrongPage' });
      return;
    }
    // 2) page unresolvable but hard-normalizes to a unique file AND element exists there
    if (!fwResolved) {
      const hc = pageHardMap.get(normHard(page)) || [];
      if (hc.length === 1 && pageRepo[hc[0]].has(el)) {
        perStep.set(sn, { oldPage: page, newPage: hc[0], reason: 'PageRename' });
      }
    }
  });

  for (const [step, fix] of perStep)
    applyMap.push({ file: wbPath, module: mod, step, oldPage: fix.oldPage, newPage: fix.newPage, reason: fix.reason });
}

fs.writeFileSync(path.join(root, 'apply-map.json'), JSON.stringify(applyMap, null, 2), 'utf8');
console.log(`apply-map.json written: ${applyMap.length} fixes across ${new Set(applyMap.map(a => a.file)).size} workbooks`);
const byReason = applyMap.reduce((a, x) => (a[x.reason] = (a[x.reason] || 0) + 1, a), {});
console.log('By reason:', JSON.stringify(byReason));
