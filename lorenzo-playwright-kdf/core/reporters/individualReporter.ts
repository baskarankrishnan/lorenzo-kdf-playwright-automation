import * as fs from 'fs';
import * as path from 'path';
import { testCaseExecutionResult, stepExecutionResult, browserConfig } from '../utilities/interfaceUtils';

export function generateIndividualReport(testResult: testCaseExecutionResult, reportDir: string, testcaseId: string): void {
    const totalSteps = testResult.steps.length;
    const passedSteps = testResult.steps.filter(s => s.stepStatus === 0).length;
    const failedSteps = testResult.steps.filter(s => s.stepStatus === 1).length;
    const commentedSteps = testResult.steps.filter(s => s.stepStatus === 2).length;
    const skippedSteps = testResult.steps.filter(s => s.stepStatus === 3).length;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(testcaseId)} - Test Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--primary:#2563eb;--success:#16a34a;--danger:#dc2626;--warning:#f59e0b;--comment:#6b7280;--bg:#f8fafc;--bg-secondary:#f1f5f9;--card-bg:#ffffff;--card-hover:#f8fafc;--text:#0f172a;--text-muted:#64748b;--border:#e2e8f0;--shadow:rgba(0,0,0,0.1)}
body{font-family:Consolas,Monaco,monospace;background:var(--bg);color:var(--text);min-height:100vh}
.container{max-width:1600px;margin:0 auto;padding:20px}
.header{background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:25px 30px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px var(--shadow);position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--primary),var(--success),var(--primary));animation:shimmer 3s infinite}
@keyframes shimmer{0%,100%{opacity:0.6}50%{opacity:1}}
.header-left h1{font-size:24px;font-weight:700;color:var(--primary);margin-bottom:5px}
.header-left p{color:var(--text-muted);font-size:13px;font-family:'Segoe UI',sans-serif}
.header-right{display:flex;gap:15px;align-items:center}
.status-badge,.duration-badge{padding:8px 20px;border-radius:6px;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1px;border:2px solid}
.status-badge.pass{background:#dcfce7;color:#166534;border-color:#16a34a}
.status-badge.fail{background:#fee2e2;color:#991b1b;border-color:#dc2626}
.status-badge.skip{background:#fef3c7;color:#92400e;border-color:#f59e0b}
.duration-badge{background:#dbeafe;color:#1e40af;border-color:#2563eb}
.tabs{display:flex;gap:5px;margin-bottom:20px;background:var(--card-bg);border-radius:8px;padding:5px;border:1px solid var(--border);box-shadow:0 1px 3px var(--shadow)}
.tab{background:transparent;border:none;color:var(--text-muted);padding:12px 25px;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;transition:all 0.3s;text-transform:uppercase;letter-spacing:1px}
.tab:hover{color:var(--primary);background:var(--bg-secondary)}
.tab.active{color:var(--primary);background:var(--bg-secondary);box-shadow:0 2px 4px var(--shadow)}
.tab-badge{background:var(--primary);color:white;padding:2px 8px;border-radius:3px;font-size:10px;margin-left:8px;font-weight:900}
.tab-content{display:none}
.tab-content.active{display:block;animation:fadeIn 0.3s}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.dashboard-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:20px}
.metric-card{background:var(--card-bg);border:2px solid var(--border);border-radius:8px;padding:20px;transition:all 0.3s;position:relative;overflow:hidden;box-shadow:0 1px 3px var(--shadow)}
.metric-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--primary);opacity:0;transition:opacity 0.3s}
.metric-card:hover{transform:translateY(-5px);box-shadow:0 8px 16px var(--shadow);border-color:var(--primary)}
.metric-card:hover::before{opacity:1}
.metric-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}
.metric-title{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--text-muted);font-weight:700}
.metric-icon{font-size:20px;opacity:0.7}
.metric-value{font-size:32px;font-weight:900;color:var(--text);margin-bottom:5px}
.metric-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px}
.charts-section{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.chart-card,.config-section,.report-table-container,.captured-data-container{background:var(--card-bg);border:2px solid var(--border);border-radius:8px;padding:25px;box-shadow:0 2px 8px var(--shadow)}
.chart-title,.config-title,.captured-title{font-size:12px;font-weight:700;color:var(--primary);margin-bottom:20px;display:flex;align-items:center;gap:10px;text-transform:uppercase;letter-spacing:1px}
.chart-container{position:relative;height:160px}
.config-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:15px}
.config-item,.data-item{background:var(--bg-secondary);padding:15px;border-radius:6px;border:1px solid var(--border);transition:all 0.3s}
.config-item:hover,.data-item:hover{border-color:var(--primary);box-shadow:0 2px 8px var(--shadow);transform:translateY(-2px)}
.config-label,.data-key{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;font-weight:700}
.config-value,.data-value{font-size:13px;color:var(--text);font-weight:600;word-break:break-word;font-family:'Segoe UI',sans-serif}
.table-header{padding:20px 25px;border-bottom:2px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:var(--bg-secondary)}
.table-title{font-size:12px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:1px}
.search-box{background:var(--card-bg);border:2px solid var(--border);border-radius:6px;padding:8px 15px;color:var(--text);font-size:12px;width:250px;font-family:Consolas,monospace;transition:all 0.3s}
.search-box:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
.test-steps-table{width:100%;border-collapse:collapse}
.test-steps-table thead{background:var(--bg-secondary)}
.test-steps-table th{padding:15px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--primary);border-bottom:2px solid var(--border)}
.test-steps-table td{padding:15px;border-bottom:1px solid var(--border);font-size:12px;font-family:'Segoe UI',sans-serif}
.test-steps-table tbody tr{transition:all 0.2s}
.test-steps-table tbody tr:hover{background:var(--card-hover);box-shadow:inset 3px 0 0 var(--primary)}
.test-steps-table tbody tr.page-action-row{background:rgba(245,158,11,0.05);display:none}
.test-steps-table tbody tr.page-action-row.visible{display:table-row}
.test-steps-table tbody tr.page-action-row:hover{background:rgba(245,158,11,0.1)}
.page-action-indicator{padding-left:30px;font-style:italic;color:var(--warning)}
.step-expandable{cursor:pointer;user-select:none}
.expand-icon{display:inline-block;margin-right:8px;transition:transform 0.2s;font-weight:bold;color:var(--primary)}
.expand-icon.collapsed{transform:rotate(-90deg)}
.step-status{display:inline-block;padding:4px 10px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.step-status.pass{background:#dcfce7;color:#16a34a}
.step-status.fail{background:#fee2e2;color:#dc2626}
.step-status.skip{background:#fef3c7;color:#f59e0b}
.step-status.comment{background:#f3f4f6;color:#6b7280}
.icon-button{background:var(--bg-secondary);border:2px solid var(--primary);cursor:pointer;padding:6px 10px;font-size:14px;border-radius:6px;transition:all 0.3s;color:var(--primary)}
.icon-button:hover{background:var(--primary);color:white;transform:scale(1.1);box-shadow:0 4px 8px var(--shadow)}
.data-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:15px}
.empty-state{text-align:center;padding:60px 20px;color:var(--text-muted)}
.empty-state-icon{font-size:48px;margin-bottom:15px;opacity:0.3}
.modal{display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,0.5);animation:fadeIn 0.3s}
.modal.active{display:flex;align-items:center;justify-content:center}
.modal-content{background:var(--card-bg);border:2px solid var(--border);padding:30px;border-radius:8px;max-width:900px;max-height:90vh;overflow-y:auto;position:relative;animation:slideIn 0.3s;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.modal-close{position:absolute;top:15px;right:20px;font-size:28px;font-weight:bold;color:var(--text-muted);cursor:pointer;transition:color 0.2s}
.modal-close:hover{color:var(--danger)}
.modal-title{font-size:16px;font-weight:bold;margin-bottom:20px;color:var(--primary);border-bottom:2px solid var(--border);padding-bottom:10px;text-transform:uppercase;letter-spacing:1px}
.modal-info-grid{display:grid;grid-template-columns:200px 1fr;gap:15px;margin-bottom:10px}
.modal-label{font-weight:700;color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:1px}
.modal-value{color:var(--text);word-break:break-word;font-family:'Segoe UI',sans-serif;font-size:13px}
.modal-screenshot{margin-top:20px;text-align:center}
.modal-screenshot img{max-width:100%;border-radius:6px;border:2px solid var(--border);box-shadow:0 4px 12px var(--shadow)}
@keyframes slideIn{from{transform:translateY(-50px);opacity:0}to{transform:translateY(0);opacity:1}}
.no-screenshot{color:var(--text-muted);font-style:italic}
.ddt-badge{background:#8b5cf6;color:white;padding:4px 10px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;display:inline-block;margin-left:8px}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:5px}
::-webkit-scrollbar-thumb:hover{background:var(--primary)}
/* ===== Light theme + Montserrat refresh (visual only — no logic changes) ===== */
:root{--primary:#5b7fd6;--success:#5aa97a;--danger:#e08585;--warning:#e0b062;--comment:#9aa7b8;--bg:#f6f8fc;--bg-secondary:#eef2f9;--card-bg:#ffffff;--card-hover:#f5f8fd;--text:#3f4d61;--text-muted:#8b98a9;--border:#e9eef6;--shadow:rgba(70,90,130,0.08)}
body,.search-box,.filter-select,.consolidated-table td,.test-steps-table td,.config-value,.data-value,.modal-value,.header-left p,h1,h2,h3,th,button,input,select{font-family:'Montserrat',-apple-system,'Segoe UI',sans-serif}
body{font-weight:400}
.header-left h1{text-transform:none;letter-spacing:0.3px;font-weight:600}
.header::before{background:linear-gradient(90deg,var(--primary),#9bb6ec,var(--primary));animation:none;opacity:0.85}
.metric-value{font-weight:700}
.metric-card,.chart-card,.config-section,.report-table-container,.captured-data-container{border-width:1px;border-radius:12px}
.status-badge,.duration-badge,.config-badge,.metric-badge,.icon-button{border-width:1px}
.status-badge.pass{background:#e8f6ee;color:#4a9d6e;border-color:#bfe3cd}
.status-badge.fail{background:#fdecec;color:#d07272;border-color:#f2c9c9}
.status-badge.partial,.status-badge.skip{background:#fdf4e3;color:#c99a4c;border-color:#f0dcb4}
.duration-badge{background:#eaf0fc;color:#5c7bc0;border-color:#cdd9f3}
.config-badge{background:#f1ecfa;color:#8065c0;border-color:#ddd2f0}
.test-status.pass,.step-status.pass{background:#e8f6ee;color:#4a9d6e}
.test-status.fail,.step-status.fail{background:#fdecec;color:#d07272}
.test-status.skip,.step-status.skip{background:#fdf4e3;color:#cf9a48}
.step-status.comment{background:#f1f4f8;color:#7b8798}
.metric-badge.total{background:#eaeefb;color:#5163b8;border-color:#cdd6f5}
.metric-badge.passed{background:#e8f6ee;color:#4a9d6e;border-color:#bfe3cd}
.metric-badge.failed{background:#fdecec;color:#d07272;border-color:#f2c9c9}
.metric-badge.commented{background:#f1f4f8;color:#6b7787;border-color:#dde3ec}
.metric-badge.skipped{background:#fdf4e3;color:#c99a4c;border-color:#f0dcb4}
.ddt-badge{background:#8f7ad6}
</style>
</head>
<body>
<div class="container">
<div class="header">
<div class="header-left">
<h1>${escapeHtml(testResult.testCaseId)}</h1>
<p>${escapeHtml(testResult.testCaseDescription || 'Test Case Execution Report')}</p>
</div>
<div class="header-right">
<span class="duration-badge">⏱ ${testResult.duration}</span>
<span class="status-badge ${getStatusClass(testResult.testCaseStatus)}">${getStatusText(testResult.testCaseStatus)}</span>
</div>
</div>
<div class="tabs">
<button class="tab active" onclick="switchTab('dashboard')">DASHBOARD</button>
<button class="tab" onclick="switchTab('report')">TEST STEPS <span class="tab-badge">${totalSteps}</span></button>
<button class="tab" onclick="switchTab('data')">CAPTURED DATA <span class="tab-badge">${Object.keys(testResult.capturedData || {}).length}</span></button>
</div>
<div id="dashboard" class="tab-content active">
<div class="dashboard-grid">
<div class="metric-card"><div class="metric-header"><span class="metric-title">Total Steps</span><span class="metric-icon">▶</span></div><div class="metric-value">${totalSteps}</div><div class="metric-label">Executed</div></div>
<div class="metric-card"><div class="metric-header"><span class="metric-title">Passed</span><span class="metric-icon">✓</span></div><div class="metric-value" style="color:var(--success)">${passedSteps}</div><div class="metric-label">Success</div></div>
<div class="metric-card"><div class="metric-header"><span class="metric-title">Failed</span><span class="metric-icon">✗</span></div><div class="metric-value" style="color:var(--danger)">${failedSteps}</div><div class="metric-label">Errors</div></div>
<div class="metric-card"><div class="metric-header"><span class="metric-title">Commented</span><span class="metric-icon">//</span></div><div class="metric-value" style="color:var(--comment)">${commentedSteps}</div><div class="metric-label">Ignored</div></div>
<div class="metric-card"><div class="metric-header"><span class="metric-title">Skipped</span><span class="metric-icon">⏭</span></div><div class="metric-value" style="color:var(--warning)">${skippedSteps}</div><div class="metric-label">Bypassed</div></div>
</div>
<div class="charts-section">
<div class="chart-card"><div class="chart-title">Step Distribution</div><div class="chart-container"><canvas id="pieChart"></canvas></div></div>
<div class="chart-card"><div class="chart-title">Status Breakdown</div><div class="chart-container"><canvas id="barChart"></canvas></div></div>
</div>
<div class="config-section">
<div class="config-title">Configuration</div>
<div class="config-grid">
<div class="config-item"><div class="config-label">Module</div><div class="config-value">${escapeHtml(testResult.module || '')}</div></div>
<div class="config-item"><div class="config-label">Excel Name</div><div class="config-value">${escapeHtml(testResult.excelName || '')}</div></div>
<div class="config-item"><div class="config-label">JIRA ID</div><div class="config-value">${escapeHtml(testResult.jiraId || '')}</div></div>
<div class="config-item"><div class="config-label">Author</div><div class="config-value">${escapeHtml(testResult.author || '')}</div></div>
<div class="config-item"><div class="config-label">DDT Enabled</div><div class="config-value">${testResult.isDDT ? '<span class="ddt-badge">YES</span>' : 'NO'}</div></div>
<div class="config-item"><div class="config-label">Browser</div><div class="config-value">${escapeHtml(testResult.browserConfig.browserName)} ${escapeHtml(testResult.browserConfig.browserVersion)}</div></div>
<div class="config-item"><div class="config-label">Platform</div><div class="config-value">${escapeHtml(testResult.browserConfig.os)} ${escapeHtml(testResult.browserConfig.osVersion)}</div></div>
<div class="config-item"><div class="config-label">Start Time</div><div class="config-value">${formatDateTime(testResult.startTime)}</div></div>
<div class="config-item"><div class="config-label">End Time</div><div class="config-value">${formatDateTime(testResult.endTime)}</div></div>
<div class="config-item"><div class="config-label">Duration</div><div class="config-value">${testResult.duration}</div></div>
<div class="config-item"><div class="config-label">Executed By</div><div class="config-value">${escapeHtml(process.env.EXECUTED_BY || 'Automation')}</div></div>

</div>
</div>
</div>
<div id="report" class="tab-content">
<div class="report-table-container">
<div class="table-header">
<div class="table-title">Test Steps Execution</div>
<input type="text" class="search-box" placeholder="Search steps..." onkeyup="filterTable(this.value)">
</div>
<table class="test-steps-table" id="stepsTable">
<thead><tr><th style="width:60px">Step</th><th style="width:250px">Description</th><th style="width:150px">Action</th><th style="width:80px">Info</th><th style="width:100px">Status</th><th style="width:100px">Duration</th><th style="width:80px">Screenshot</th></tr></thead>
<tbody>${generateStepRows(testResult.steps, reportDir)}</tbody>
</table>
</div>
</div>
<div id="data" class="tab-content">
<div class="captured-data-container">
<div class="captured-title">Captured Test Data</div>
${generateCapturedData(testResult.capturedData)}
</div>
</div>
</div>
<div id="infoModal" class="modal">
<div class="modal-content">
<span class="modal-close" onclick="closeModal('infoModal')">&times;</span>
<div class="modal-title">Step Details</div>
<div id="infoModalContent"></div>
</div>
</div>
<div id="screenshotModal" class="modal">
<div class="modal-content">
<span class="modal-close" onclick="closeModal('screenshotModal')">&times;</span>
<div class="modal-title">Screenshot</div>
<div id="screenshotModalContent"></div>
</div>
</div>
<script>
const stepData={passed:${passedSteps},failed:${failedSteps},commented:${commentedSteps},skipped:${skippedSteps}};
new Chart(document.getElementById('pieChart'),{type:'doughnut',data:{labels:['Passed','Failed','Commented','Skipped'],datasets:[{data:[stepData.passed,stepData.failed,stepData.commented,stepData.skipped],backgroundColor:['#16a34a','#dc2626','#6b7280','#f59e0b'],borderWidth:3,borderColor:'#ffffff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:12,font:{size:10,family:'Consolas'},boxWidth:10,color:'#64748b'}},tooltip:{backgroundColor:'#ffffff',titleColor:'#0f172a',bodyColor:'#0f172a',borderColor:'#e2e8f0',borderWidth:2,callbacks:{label:function(context){const total=context.dataset.data.reduce((a,b)=>a+b,0);const percentage=((context.parsed/total)*100).toFixed(1);return context.label+': '+context.parsed+' ('+percentage+'%)'}}}}}});
new Chart(document.getElementById('barChart'),{type:'bar',data:{labels:['Passed','Failed','Commented','Skipped'],datasets:[{label:'Step Count',data:[stepData.passed,stepData.failed,stepData.commented,stepData.skipped],backgroundColor:['#16a34a','#dc2626','#6b7280','#f59e0b'],borderWidth:0,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#ffffff',titleColor:'#0f172a',bodyColor:'#0f172a',borderColor:'#e2e8f0',borderWidth:2,callbacks:{label:function(context){return'Count: '+context.parsed.y}}}},scales:{y:{beginAtZero:true,ticks:{stepSize:1,font:{size:10,family:'Consolas'},color:'#64748b'},grid:{color:'#e2e8f0'}},x:{grid:{display:false},ticks:{font:{size:10,family:'Consolas'},color:'#64748b'}}}}});
function switchTab(tabName){document.querySelectorAll('.tab-content').forEach(tab=>tab.classList.remove('active'));document.querySelectorAll('.tab').forEach(tab=>tab.classList.remove('active'));document.getElementById(tabName).classList.add('active');event.target.classList.add('active')}
function togglePageActions(parentIndex){const pageActionRows=document.querySelectorAll(\`tr.page-action-row[data-parent="\${parentIndex}"]\`);const expandIcon=document.getElementById(\`expand-icon-\${parentIndex}\`);pageActionRows.forEach(row=>{if(row.classList.contains('visible')){row.classList.remove('visible');expandIcon.classList.add('collapsed')}else{row.classList.add('visible');expandIcon.classList.remove('collapsed')}})}
function filterTable(searchTerm){const table=document.getElementById('stepsTable');const rows=table.getElementsByTagName('tr');const term=searchTerm.toLowerCase();for(let i=1;i<rows.length;i++){const row=rows[i];const text=row.textContent.toLowerCase();row.style.display=text.includes(term)?'':'none'}}
function showInfoModalById(dataId){const modal=document.getElementById('infoModal');const content=document.getElementById('infoModalContent');const stepElement=document.getElementById(dataId);if(!stepElement){console.error('Step data not found:',dataId);return}const step=JSON.parse(stepElement.textContent);const ddtBadge=step.isDDT?'<span class="ddt-badge">DDT</span>':'NO';content.innerHTML=\`<div class="modal-info-grid"><div class="modal-label">Step No:</div><div class="modal-value">\${step.stepNo}</div><div class="modal-label">Description:</div><div class="modal-value">\${escapeHtmlClient(step.stepDescription||'')}</div><div class="modal-label">Action Keyword:</div><div class="modal-value">\${escapeHtmlClient(step.actionKeyword)}</div><div class="modal-label">Page:</div><div class="modal-value">\${escapeHtmlClient(step.page||'')}</div><div class="modal-label">Element:</div><div class="modal-value">\${escapeHtmlClient(step.element||'')}</div><div class="modal-label">Element Text:</div><div class="modal-value">\${escapeHtmlClient(step.elementText||'')}</div><div class="modal-label">Property:</div><div class="modal-value">\${escapeHtmlClient(step.property||'')}</div><div class="modal-label">Condition:</div><div class="modal-value">\${escapeHtmlClient(step.condition||'')}</div><div class="modal-label">Table Columns:</div><div class="modal-value">\${escapeHtmlClient(step.tableColumnNames||'')}</div><div class="modal-label">Value:</div><div class="modal-value">\${escapeHtmlClient(step.value||'')}</div><div class="modal-label">Dataset Columns:</div><div class="modal-value">\${escapeHtmlClient(step.datasetColumnNames||'')}</div><div class="modal-label">Status:</div><div class="modal-value"><span class="step-status \${getStepStatusClass(step.stepStatus)}">\${getStepStatusText(step.stepStatus)}</span></div><div class="modal-label">Start Time:</div><div class="modal-value">\${formatDateTime(step.stepStartTime)}</div><div class="modal-label">End Time:</div><div class="modal-value">\${formatDateTime(step.stepEndTime)}</div><div class="modal-label">Duration:</div><div class="modal-value">\${step.stepDuration}</div><div class="modal-label">Return Text:</div><div class="modal-value">\${escapeHtmlClient(step.returnText||'')}</div></div>\`;modal.classList.add('active')}
function showScreenshotModal(screenshotPath,stepNo){const modal=document.getElementById('screenshotModal');const content=document.getElementById('screenshotModalContent');if(screenshotPath&&screenshotPath!==''&&screenshotPath!==''){const imgDiv=document.createElement('div');imgDiv.className='modal-screenshot';const img=document.createElement('img');img.src=screenshotPath;img.alt='Step '+stepNo+' Screenshot';img.onerror=function(){imgDiv.innerHTML='<p class="no-screenshot">Screenshot not available</p>'};imgDiv.appendChild(img);content.innerHTML='';content.appendChild(imgDiv)}else{content.innerHTML='<p class="no-screenshot">No screenshot available for this step</p>'}modal.classList.add('active')}
function closeModal(modalId){document.getElementById(modalId).classList.remove('active')}
function getStepStatusClass(status){switch(status){case 0:return'pass';case 1:return'fail';case 2:return'comment';case 3:return'skip';default:return''}}
function getStepStatusText(status){switch(status){case 0:return'PASS';case 1:return'FAIL';case 2:return'COMMENTED';case 3:return'SKIPPED';default:return'UNKNOWN'}}
function formatDateTime(dateString){if(!dateString)return'';const date=new Date(dateString);return date.toLocaleString('en-US',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function escapeHtmlClient(text){const div=document.createElement('div');div.textContent=text;return div.innerHTML}
window.onclick=function(event){if(event.target.classList.contains('modal')){event.target.classList.remove('active')}}
</script>
</body>
</html>`;
    fs.writeFileSync(path.join(reportDir, `${testcaseId}.html`), htmlContent, 'utf-8');
}

function getStatusClass(status: number): string {
    return status === 0 ? 'pass' : status === 1 ? 'fail' : status === 3 ? 'skip' : '';
}

function getStatusText(status: number): string {
    return status === 0 ? 'PASSED' : status === 1 ? 'FAILED' : status === 3 ? 'SKIPPED' : 'UNKNOWN';
}

function formatDateTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

function escapeHtml(text: string): string {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]||m));
}

function getRelativeScreenshotPath(screenshotPath: string, reportDir: string): string {
    if (!screenshotPath) return '';
    try {
        return path.relative(reportDir, screenshotPath).replace(/\\/g, '/');
    } catch (error) {
        return '';
    }
}

function generateStepRows(steps: stepExecutionResult[], reportDir: string): string {
    let rows = '';
    steps.forEach((step, index) => {
        const stepDataId = `step-data-${step.stepNo}`;
        const statusClass = getStepStatusClass(step.stepStatus);
        const statusText = getStepStatusText(step.stepStatus);
        const hasPageActions = step.actionKeyword === 'callCommonScripts' && step.pageActions && step.pageActions.length > 0;
        const expandIcon = hasPageActions ? `<span class="expand-icon collapsed" id="expand-icon-${index}">▼</span>` : '';
        const expandableClass = hasPageActions ? 'step-expandable' : '';
        const onclickExpand = hasPageActions ? `onclick="togglePageActions(${index})"` : '';
        const screenshotPath = getRelativeScreenshotPath(step.screenshotPath, reportDir);

        rows += `<tr class="${expandableClass}" id="step-${step.stepNo}"><td ${onclickExpand}>${expandIcon}${step.stepNo}</td><td>${escapeHtml(step.stepDescription || '')}</td><td>${escapeHtml(step.actionKeyword)}</td><td style="text-align:center"><button class="icon-button" onclick="showInfoModalById('${stepDataId}')" title="View Details">ℹ</button></td><td><span class="step-status ${statusClass}">${statusText}</span></td><td>${step.stepDuration}</td><td style="text-align:center"><button class="icon-button" onclick="showScreenshotModal('${screenshotPath}',${step.stepNo})" title="View Screenshot">📷</button></td></tr>`;
        rows += `<script type="application/json" id="${stepDataId}">${JSON.stringify(step)}</script>`;

        if (hasPageActions) {
            step.pageActions.forEach((pageAction) => {
                const pageActionDataId = `step-data-${step.stepNo}-${pageAction.stepNo}`;
                const pageActionStatusClass = getStepStatusClass(pageAction.stepStatus);
                const pageActionStatusText = getStepStatusText(pageAction.stepStatus);
                const pageActionScreenshotPath = getRelativeScreenshotPath(pageAction.screenshotPath, reportDir);

                rows += `<tr class="page-action-row" data-parent="${index}"><td>${pageAction.stepNo}</td><td class="page-action-indicator">↳ ${escapeHtml(pageAction.stepDescription || '')}</td><td>${escapeHtml(pageAction.actionKeyword)}</td><td style="text-align:center"><button class="icon-button" onclick="showInfoModalById('${pageActionDataId}')" title="View Details">ℹ</button></td><td><span class="step-status ${pageActionStatusClass}">${pageActionStatusText}</span></td><td>${pageAction.stepDuration}</td><td style="text-align:center"><button class="icon-button" onclick="showScreenshotModal('${pageActionScreenshotPath}',${pageAction.stepNo})" title="View Screenshot">📷</button></td></tr>`;
                rows += `<script type="application/json" id="${pageActionDataId}">${JSON.stringify(pageAction)}</script>`;
            });
        }
    });
    return rows;
}

function generateCapturedData(capturedData: { [key: string]: any } | undefined): string {
    if (!capturedData || Object.keys(capturedData).length === 0) {
        return `<div class="empty-state"><div class="empty-state-icon">⊘</div><p>No data captured during test execution</p></div>`;
    }
    let dataHtml = '<div class="data-grid">';
    for (const [key, value] of Object.entries(capturedData)) {
        dataHtml += `<div class="data-item"><div class="data-key">${escapeHtml(key)}</div><div class="data-value">${escapeHtml(String(value))}</div></div>`;
    }
    return dataHtml + '</div>';
}

function getStepStatusClass(status: number): string {
    return status === 0 ? 'pass' : status === 1 ? 'fail' : status === 2 ? 'comment' : status === 3 ? 'skip' : '';
}

function getStepStatusText(status: number): string {
    return status === 0 ? 'PASS' : status === 1 ? 'FAIL' : status === 2 ? 'COMMENTED' : status === 3 ? 'SKIPPED' : 'UNKNOWN';
}

