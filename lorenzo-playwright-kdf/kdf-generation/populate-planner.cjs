/*
 * Rebuilds the PLANNER sheet in LORENZO_Planner.xlsx from every module test case
 * file found under excelFramework/testcases/<Module>/<file>.xlsx.
 * - Preserves the SETTINGS sheet and the existing column headers.
 * - Sets smoke = Yes for every discovered script (order = folder scan order).
 * Run: node kdf-generation/populate-planner.cjs
 */
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const repoRoot = path.resolve(__dirname, '..');
const testcasesDir = path.join(repoRoot, 'excelFramework', 'testcases');
const plannerPath = path.join(repoRoot, 'excelFramework', 'executionPlanner', 'LORENZO_Planner.xlsx');

// 1. Discover module test case files
const dirs = fs.readdirSync(testcasesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b));

const rows = [];
for (const module of dirs) {
    const files = fs.readdirSync(path.join(testcasesDir, module))
        .filter(f => /\.xlsx$/i.test(f) && !f.startsWith('~$'));
    for (const file of files) {
        const stem = file.replace(/\.xlsx$/i, '');
        rows.push({
            module: module,
            excelname: stem,
            testcaseid: stem,
            description: '',
            jira: '',
            issueid: '',
            author: '',
            smoke: 'Yes',
            regression: 'No',
        });
    }
}

// 2. Load existing workbook (to preserve SETTINGS), rebuild PLANNER sheet
const wb = xlsx.readFile(plannerPath);
const header = ['module', 'excelname', 'testcaseid', 'description', 'jira', 'issueid', 'author', 'smoke', 'regression'];
const newSheet = xlsx.utils.json_to_sheet(rows, { header });

// Replace the PLANNER sheet contents in place (keeps sheet order: SETTINGS, PLANNER)
const plannerSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'planner') || 'PLANNER';
wb.Sheets[plannerSheetName] = newSheet;
if (!wb.SheetNames.includes(plannerSheetName)) wb.SheetNames.push(plannerSheetName);

xlsx.writeFile(wb, plannerPath);

console.log(`✅ Wrote ${rows.length} rows to PLANNER sheet in ${plannerPath}`);
console.log('Sheets now:', wb.SheetNames.join(', '));
rows.forEach((r, i) => console.log(String(i + 1).padStart(2), '|', r.module, '|', r.testcaseid, '| smoke=' + r.smoke));
