// Blast-radius scan: find which Excel test cases reference the Group 2 colliding
// page-object element names, so we can rename safely.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const tcRoot = path.resolve(__dirname, '..', 'excelFramework', 'testcases');

// Colliding elements per page (Group 2).
const targets = {
  pageBookAppt: ['btn_Find', 'btn_Ok', 'btn_Finishnow', 'txt_Identifier', 'dte_ReferralAcceptedDateTime'],
  pageIPBook: ['btn_Find', 'btn_Ok', 'btn_Finishnow', 'icn_SFS', 'txt_Identifier', 'dte_ReferralAcceptedDateTime'],
  pageHome: ['btn_OK', 'cmb_Gender', 'lbl_Gender', 'tab_Mywork', 'lnk_AdmitTaskPane', 'btn_Finish'],
  pageLORENZO: ['btn_PatientName', 'chk_SelectRow'],
  pageTheatreManagement: ['btn_ReasonOK', 'btn_OkManagedelay'],
  pagePbrdHistory: ['tbl_IPHistoryVerifystatus'],
};
const targetPages = new Set(Object.keys(targets));

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.toLowerCase().endsWith('.xlsx') && !e.name.startsWith('~$')) out.push(p);
  }
  return out;
}

const files = walk(tcRoot);
const hits = [];

for (const file of files) {
  let wb;
  try { wb = XLSX.readFile(file); } catch (e) { console.error('skip', file, e.message); continue; }
  // TestExecution sheet holds Page/Element columns.
  const sheetName = wb.SheetNames.find(n => /testexec/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) continue;
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  for (const r of rows) {
    const page = String(r.Page || r.page || '').trim();
    const element = String(r.Element || r.element || '').trim();
    if (!targetPages.has(page)) continue;
    if (!(targets[page] || []).includes(element)) continue;
    hits.push({
      file: path.relative(tcRoot, file),
      sheet: sheetName,
      step: r.StepNo || r.stepNo || '',
      page, element,
      action: r.ActionKeyword || r.actionKeyword || '',
      desc: String(r.StepDescription || r.stepDescription || '').slice(0, 80),
    });
  }
}

// Group by page+element
const byKey = {};
for (const h of hits) {
  const k = `${h.page}.${h.element}`;
  (byKey[k] ||= []).push(h);
}

console.log(`Scanned ${files.length} test case files. ${hits.length} references to Group 2 elements.\n`);
for (const k of Object.keys(byKey).sort()) {
  const list = byKey[k];
  const fileset = [...new Set(list.map(h => h.file))];
  console.log(`${k}  (${list.length} refs in ${fileset.length} test case(s)):`);
  for (const h of list) console.log(`    ${h.file}  step ${h.step}  [${h.action}]  ${h.desc}`);
  console.log('');
}

// Also report which target elements have ZERO references (safe to just dedupe by keep-last)
console.log('--- Group 2 elements with NO test-case references (safe to keep-last, no Excel change) ---');
for (const [page, els] of Object.entries(targets)) {
  for (const el of els) {
    if (!byKey[`${page}.${el}`]) console.log(`    ${page}.${el}`);
  }
}
