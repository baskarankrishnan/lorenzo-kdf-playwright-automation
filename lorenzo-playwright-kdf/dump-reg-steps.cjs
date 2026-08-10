const XLSX = require('xlsx');
const path = require('path');

function dump(file, from, to) {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets['TestExecution'];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('\n==== ' + path.basename(path.dirname(file)) + ' / ' + path.basename(file) + ' ====');
  for (const r of rows) {
    const n = Number(r.StepNo);
    if (n >= from && n <= to) {
      console.log(
        String(n).padStart(3) + ' | ' +
        String(r.ActionKeyword || '').padEnd(16) + ' | ' +
        String(r.Page || '').padEnd(22) + ' | ' +
        String(r.Element || '').padEnd(22) + ' | cond=' +
        String(r.Condition || '').padEnd(10) + ' | ' +
        String(r.StepDescription || '').slice(0, 60)
      );
    }
  }
}

const base = 'c:\\Users\\bkrishnan6\\ORBIS PAS UKI-LZO\\lorenzo-playwright-kdf\\excelFramework\\testcases';
dump(path.join(base, 'Contacts', 'LSTP_Contacts_WF001.xlsx'), 16, 30);
try { dump(path.join(base, 'IDM', 'LSTP_IDM_WF001.xlsx'), 1, 40); } catch (e) { console.log('IDM read err: ' + e.message); }
