// Analyze the newest planner:serial run logs and categorize ALL failures.
// Usage: node kdf-generation/analyze-run-failures.cjs
const fs = require('fs');
const path = require('path');

const logsDir = path.resolve(__dirname, '..', 'reports', 'logs');
const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.txt'));

// Group by trailing timestamp (…._YYYYMMDDHHMM.txt) and pick the newest group.
function tsOf(name) {
  const m = name.match(/_(\d{12})\.txt$/);
  return m ? m[1] : '000000000000';
}
const newestTs = files.map(tsOf).sort().pop();
const runFiles = files.filter(f => tsOf(f) === newestTs)
  .map(f => path.join(logsDir, f));

console.log(`Newest run timestamp: ${newestTs}  (${runFiles.length} test logs)\n`);

function classify(text) {
  const t = text.toLowerCase();
  if (/no valid page available|target (page|closed)|page.*closed|browser has been closed|execution context was destroyed/.test(t))
    return 'PAGE-LIFECYCLE';
  if (/not in registry|page not found after|defined but not open|no match for definition|page ".*" defined but not open/.test(t))
    return 'PAGE-REGISTRY';
  if (/timeout|timed out|waiting for|exceeded|networkidle/.test(t))
    return 'TIMING';
  if (/not found|no element|no node|unable to (find|locate|resolve)|element .* not|selector|resolveelement|failed to resolve/.test(t))
    return 'LOCATOR';
  return 'OTHER';
}

const results = [];
let totalPassed = 0;

for (const file of runFiles) {
  const name = path.basename(file);
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/);

  const passedLines = lines.filter(l => /Step \d+ passed/.test(l));
  const lastPassed = passedLines.length ? passedLines[passedLines.length - 1] : '(none)';
  const passedCount = passedLines.length;
  totalPassed += passedCount;

  // First failing step: line with "Step N failed" or "threw error" or "Step failed:"
  let failLine = '';
  let failStep = '';
  let failIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/Step \d+ (failed|threw error)|Step failed:|❌/.test(lines[i]) && !/passed/.test(lines[i])) {
      failLine = lines[i];
      const m = lines[i].match(/Step (\d+)/);
      failStep = m ? m[1] : '?';
      failIdx = i;
      break;
    }
  }

  // Capture a small window of context around the failure for the error message.
  let context = '';
  if (failIdx >= 0) {
    context = lines.slice(Math.max(0, failIdx - 2), failIdx + 4).join(' | ');
  } else {
    // No explicit fail marker — look for lifecycle/registry/timeout signals.
    const sig = lines.find(l => /no valid page available|Page not found after|not in registry|Timeout|not found/i.test(l));
    context = sig || '';
  }

  const novalid = (raw.match(/no valid page available/g) || []).length;
  const category = failLine || context ? classify(failLine + ' ' + context) : (novalid > 0 ? 'PAGE-LIFECYCLE' : 'UNKNOWN');

  results.push({ name, passedCount, lastPassed: lastPassed.replace(/^[^A-Za-z]*/, '').slice(0, 90), failStep, category, novalid, context: context.slice(0, 220) });
}

// Sort: most-progressed last (so worst first)
results.sort((a, b) => a.passedCount - b.passedCount);

console.log('=== PER-TEST SUMMARY (worst first) ===');
for (const r of results) {
  console.log(`\n${r.name}`);
  console.log(`  passed: ${r.passedCount} | firstFailStep: ${r.failStep || '-'} | category: ${r.category} | 'no valid page' x${r.novalid}`);
  console.log(`  lastPassed: ${r.lastPassed}`);
  if (r.context) console.log(`  detail: ${r.context}`);
}

console.log('\n=== CATEGORY TOTALS ===');
const cats = {};
for (const r of results) cats[r.category] = (cats[r.category] || 0) + 1;
Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n} test(s)`));
console.log(`\nTotal steps passed across run: ${totalPassed}`);
