const XLSX = require('xlsx');
const file = 'c:\\Users\\bkrishnan6\\ORBIS PAS UKI-LZO\\lorenzo-playwright-kdf\\excelFramework\\testcases\\Contacts\\LSTP_Contacts_WF001.xlsx';
const wb = XLSX.readFile(file);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['TestExecution'], { defval: '' });
for (const r of rows) {
  const n = Number(r.StepNo);
  if (n >= 18 && n <= 25) {
    console.log(JSON.stringify({
      StepNo: n,
      ActionKeyword: r.ActionKeyword,
      Element: r.Element,
      Values: r.Values,
      Condition: r.Condition,
      StepDescription: r.StepDescription
    }));
  }
}
