// Scan pages/*.js for within-file duplicate export const NAMES with DIFFERENT xpaths.
// Produces a decision report. Respects the loader's comment-strip (skips // lines) to
// report what is CURRENTLY active vs shadowed.
const fs = require('fs');
const path = require('path');

const pagesDir = path.resolve(__dirname, '..', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.js'));

const EXPORT_RE = /^\s*export\s+const\s+(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/;

// Heuristic: higher score = more robust locator to KEEP.
function score(xp) {
  let s = 0;
  if (/@title=/.test(xp)) s += 5;
  if (/@name=/.test(xp)) s += 4;
  if (/normalize-space|text\(\)=/.test(xp)) s += 3;
  if (/@id='?[a-zA-Z]/.test(xp)) s += 2;            // semantic id
  if (/icombobox_Text_C\d+|_C\d+|@id='?[a-zA-Z]*\d/.test(xp)) s -= 4; // brittle auto id/index
  if (/contains\(/.test(xp)) s += 1;
  s -= Math.floor(xp.length / 80); // slight penalty for very long/fragile
  return s;
}

const rows = [];
let conflictCount = 0;
let caseVariantCount = 0;

for (const file of files) {
  const full = path.join(pagesDir, file);
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  // name -> [{xpath, line, commented}]
  const map = {};
  lines.forEach((line, i) => {
    const trimmed = line.trimStart();
    const commented = trimmed.startsWith('//');
    const clean = commented ? trimmed.replace(/^\/\/\s*/, '') : line;
    const m = clean.match(EXPORT_RE);
    if (m) {
      const name = m[1];
      const xpath = (m[2] !== undefined ? m[2] : m[3]);
      (map[name] ||= []).push({ xpath, line: i + 1, commented });
    }
  });

  for (const [name, defs] of Object.entries(map)) {
    if (defs.length < 2) continue;
    const active = defs.filter(d => !d.commented);
    const activeDistinct = [...new Set(active.map(d => d.xpath))];
    if (activeDistinct.length < 2) continue; // resolved (0/1 active distinct) -> not a conflict

    const best = active.slice().sort((a, b) => score(b.xpath) - score(a.xpath))[0];
    const resolved = active.length === 1 ? active[0] : null;

    conflictCount++;
    rows.push({
      file, name,
      count: defs.length,
      activeCount: active.length,
      suggestedKeepLine: best.line,
      suggestedKeepXpath: best.xpath,
      currentlyActive: resolved ? `L${resolved.line}: ${resolved.xpath}` : `AMBIGUOUS (${active.length} active)`,
      allDefs: defs.map(d => `${d.commented ? '//' : ''}L${d.line}=${d.xpath}`).join('  |  ')
    });
  }
}

// Write CSV
const reportsDir = path.resolve(__dirname, '..', '..', 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
const csvPath = path.join(reportsDir, 'duplicate-locators-report.csv');
const esc = s => `"${String(s).replace(/"/g, '""')}"`;
const header = ['File', 'Element', 'Defs', 'ActiveDefs', 'SuggestedKeepLine', 'SuggestedKeepXpath', 'CurrentlyActive', 'AllDefinitions'];
const csv = [header.map(esc).join(',')]
  .concat(rows
    .sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name))
    .map(r => [r.file, r.name, r.count, r.activeCount, r.suggestedKeepLine, r.suggestedKeepXpath, r.currentlyActive, r.allDefs].map(esc).join(',')))
  .join('\n');
fs.writeFileSync(csvPath, csv, 'utf8');

// Summary to stdout
const byFile = {};
for (const r of rows) byFile[r.file] = (byFile[r.file] || 0) + 1;
console.log(`Within-file different-xpath conflicts: ${conflictCount} across ${Object.keys(byFile).length} files`);
console.log('Top files:');
Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 12)
  .forEach(([f, n]) => console.log(`  ${f}: ${n}`));
console.log(`\nReport: ${csvPath}`);
