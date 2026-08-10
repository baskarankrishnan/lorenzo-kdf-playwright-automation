// Emit apply-map-elements.json for the 27 mechanical element renames
// (element typo where the correctly-named export exists on the SAME resolved page).
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
function pickWorkbook(folder) {
  const files = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.xlsx'));
  if (!files.length) return null;
  const pref = files.filter(f => /^LSTP_/i.test(f) && !/old/i.test(f));
  return path.join(folder, (pref[0] || files[0]));
}
const modules = fs.readdirSync(tcDir, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => d.name).sort();

const map = [];
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
    if (!resolvedPage) return;
    if (pageRepo[resolvedPage].has(el)) return; // already fine
    // find same-page export whose hard-norm matches
    const h = normHard(el);
    let target = null;
    for (const e of pageRepo[resolvedPage]) if (normHard(e) === h) { target = e; break; }
    if (target && target !== el) {
      map.push({ file: wbPath, module: mod, step: sn, column: 'Element', oldValue: el, newValue: target });
    }
  });
}
fs.writeFileSync(path.join(root, 'apply-map-elements.json'), JSON.stringify(map, null, 2), 'utf8');
console.log(`apply-map-elements.json: ${map.length} element renames across ${new Set(map.map(x=>x.file)).size} workbooks`);
