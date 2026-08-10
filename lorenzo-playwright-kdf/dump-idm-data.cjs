const XLSX = require('xlsx');
const path = require('path');

function dump(file, from, to) {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets['TestExecution'];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('\n==== ' + path.basename(path.dirname(file)) + ' (TestExecution) ====');
  for (const r of rows) {
    const n = Number(r.StepNo);
    if (n >= from && n <= to) {
      console.log(
        String(n).padStart(3) + ' | ' +
        String(r.ActionKeyword || '').padEnd(15) + ' | ' +
        String(r.Element || '').padEnd(18) + ' | val=[' +
        String(r.Values || '') + '] ds=[' +
        String(r.DatasetColumnName || '') + '] | ' +
        String(r.StepDescription || '').slice(0, 45)
      );
    }
  }
  // Also dump TestData sheet headers + first row
  const td = wb.Sheets['TestData'];
  if (td) {
    const tdRows = XLSX.utils.sheet_to_json(td, { header: 1, defval: '' });
    console.log('  TestData headers: ' + JSON.stringify(tdRows[0]));
    console.log('  TestData row1   : ' + JSON.stringify(tdRows[1]));
  }
}

const base = 'c:\\Users\\bkrishnan6\\ORBIS PAS UKI-LZO\\lorenzo-playwright-kdf\\excelFramework\\testcases';
dump(path.join(base, 'IDM', 'LSTP_IDM_WF001.xlsx'), 19, 27);
