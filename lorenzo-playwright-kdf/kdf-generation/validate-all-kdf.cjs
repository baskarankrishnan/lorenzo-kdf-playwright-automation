// Read-only KDF validation sweep across all LSTP_*.json scripts.
// Checks against documented rules in copilot-instructions.md.
const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname, 'kdf-scripts');
const repoPath = path.join(__dirname, 'kdf-samples', 'ElementRepository_Lorenzo_3.json');

const MANDATORY = ['StepNo', 'StepDescription', 'Page', 'Element', 'ElementText',
  'ActionKeyword', 'Property', 'Condition', 'TableColumnNames', 'Values', 'DatasetColumnName'];

const RUNTIME_VARS = new Set(['_RandomSurname', '_PASID', '_NHSNUMBER', '_USERNAME', '_PASSWORD']);

// Build element repository lookup: "page::element" -> true
const repo = JSON.parse(fs.readFileSync(repoPath, 'utf8'));
const repoKeys = new Set();
const repoPages = new Set();
for (const r of repo) {
  repoKeys.add(`${r.page}::${r.element}`);
  repoPages.add(r.page);
}

const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.json') && f.startsWith('LSTP_'));

let grandTotals = { files: 0, steps: 0, missingFields: 0, mutex: 0, badElement: 0, badPage: 0, seq: 0, parseErr: 0 };
const report = [];

for (const file of files.sort()) {
  const full = path.join(scriptsDir, file);
  const entry = { file, steps: 0, issues: [] };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    entry.issues.push(`PARSE ERROR: ${e.message}`);
    grandTotals.parseErr++;
    report.push(entry);
    continue;
  }
  if (!Array.isArray(data)) {
    entry.issues.push('Root is not an array');
    report.push(entry);
    continue;
  }
  entry.steps = data.length;
  grandTotals.steps += data.length;
  grandTotals.files++;

  data.forEach((step, i) => {
    const sn = step.StepNo != null ? step.StepNo : `(index ${i})`;

    // 1. Mandatory fields
    for (const f of MANDATORY) {
      if (!(f in step)) {
        entry.issues.push(`Step ${sn}: missing field "${f}"`);
        grandTotals.missingFields++;
      }
    }

    // 2. Sequential StepNo
    if (step.StepNo !== i + 1) {
      entry.issues.push(`Step index ${i}: StepNo=${step.StepNo} expected ${i + 1}`);
      grandTotals.seq++;
    }

    // 3. Values vs DatasetColumnName mutual exclusivity
    const v = (step.Values || '').toString().trim();
    const d = (step.DatasetColumnName || '').toString().trim();
    if (v && d) {
      entry.issues.push(`Step ${sn}: BOTH Values("${v}") and DatasetColumnName("${d}") filled`);
      grandTotals.mutex++;
    }
    // runtime vars must be in Values, not DatasetColumnName
    if (d && RUNTIME_VARS.has(d)) {
      entry.issues.push(`Step ${sn}: runtime var "${d}" must be in Values, not DatasetColumnName`);
      grandTotals.mutex++;
    }

    // 4. Element/Page existence in repository (skip empty elements)
    const page = (step.Page || '').toString().trim();
    const el = (step.Element || '').toString().trim();
    if (el) {
      if (!repoKeys.has(`${page}::${el}`)) {
        // check if element exists under a different page
        const elsewhere = repo.some(r => r.element === el);
        if (!repoPages.has(page)) {
          entry.issues.push(`Step ${sn}: Page "${page}" not in repository`);
          grandTotals.badPage++;
        } else if (elsewhere) {
          entry.issues.push(`Step ${sn}: Element "${el}" exists but not under Page "${page}"`);
          grandTotals.badElement++;
        } else {
          entry.issues.push(`Step ${sn}: Element "${el}" (page "${page}") NOT in repository`);
          grandTotals.badElement++;
        }
      }
    }
  });

  report.push(entry);
}

// Print report
console.log('='.repeat(70));
console.log('KDF VALIDATION SWEEP — READ ONLY');
console.log('='.repeat(70));
for (const e of report) {
  const status = e.issues.length === 0 ? 'OK' : `${e.issues.length} ISSUE(S)`;
  console.log(`\n[${status}] ${e.file}  (${e.steps} steps)`);
  const shown = e.issues.slice(0, 15);
  for (const iss of shown) console.log(`   - ${iss}`);
  if (e.issues.length > 15) console.log(`   ... +${e.issues.length - 15} more`);
}
console.log('\n' + '='.repeat(70));
console.log('GRAND TOTALS');
console.log('='.repeat(70));
console.log(`Files scanned:            ${grandTotals.files}`);
console.log(`Total steps:              ${grandTotals.steps}`);
console.log(`Parse errors:             ${grandTotals.parseErr}`);
console.log(`Missing mandatory fields: ${grandTotals.missingFields}`);
console.log(`StepNo sequence issues:   ${grandTotals.seq}`);
console.log(`Values/Dataset conflicts: ${grandTotals.mutex}`);
console.log(`Bad Page references:      ${grandTotals.badPage}`);
console.log(`Bad Element references:   ${grandTotals.badElement}`);
const clean = report.filter(e => e.issues.length === 0).length;
console.log(`\nClean files: ${clean}/${report.length}`);
