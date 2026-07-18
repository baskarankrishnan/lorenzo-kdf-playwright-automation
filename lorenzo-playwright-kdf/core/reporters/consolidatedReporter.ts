import * as fs from 'fs';
import * as path from 'path';
import { consolidatedReport } from '../utilities/interfaceUtils';

export function generateConsolidatedReport(
    consolidatedData: consolidatedReport,
    reportDir: string,
    executionTimestamp: string
): void {
    const { executionPack, executionMetrics, testResults, browserConfig, continueOnFailure } = consolidatedData;

    // Calculate overall metrics
    const totalTests = executionMetrics.totalTests;
    const passedTests = executionMetrics.passedTests;
    const failedTests = executionMetrics.failedTests;
    const skippedTests = executionMetrics.skippedTests;

    // Build test rows data
    const testRowsData: any[] = [];
    let rowNumber = 1;

    for (const [excelName, excelData] of Object.entries(testResults)) {
        const module = excelData.module;
        
        for (const [testcaseId, testResult] of Object.entries(excelData)) {
            if (testcaseId === 'module') continue;
            
            const result = testResult as any;
            const totalSteps = result.steps?.length || 0;
            const passedSteps = result.steps?.filter((s: any) => s.stepStatus === 0).length || 0;
            const failedSteps = result.steps?.filter((s: any) => s.stepStatus === 1).length || 0;
            const commentedSteps = result.steps?.filter((s: any) => s.stepStatus === 2).length || 0;
            const skippedSteps = result.steps?.filter((s: any) => s.stepStatus === 3).length || 0;

            // Calculate relative path to individual report.
            // The consolidated report is written into the reports folder and
            // individualReports/ is a sibling SUBFOLDER of it, so the link is
            // relative to the consolidated report WITHOUT a leading `../`
            // (a `../` wrongly climbs above the reports folder).
            const individualReportDir = `${excelName}_${executionTimestamp}`;
            const individualReportPath = `individualReports/${module}/${individualReportDir}/${testcaseId}.html`;

            testRowsData.push({
                no: rowNumber++,
                module: module,
                testcase: excelName,
                scenario: testcaseId,
                description: result.testCaseDescription || '',
                status: result.testCaseStatus,
                totalSteps,
                passedSteps,
                failedSteps,
                commentedSteps,
                skippedSteps,
                duration: result.duration || '0s',
                jiraId: result.jiraId || '',
                author: result.author || '',
                startTime: result.startTime || '',
                endTime: result.endTime || '',
                returnText: result.returnText || '',
                reportPath: individualReportPath,
                capturedDataCount: Object.keys(result.capturedData || {}).length
            });
        }
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(executionPack)} - Consolidated Test Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--primary:#2563eb;--success:#16a34a;--danger:#dc2626;--warning:#f59e0b;--comment:#6b7280;--bg:#f8fafc;--bg-secondary:#f1f5f9;--card-bg:#ffffff;--card-hover:#f8fafc;--text:#0f172a;--text-muted:#64748b;--border:#e2e8f0;--shadow:rgba(0,0,0,0.1)}
body{font-family:Consolas,Monaco,monospace;background:var(--bg);color:var(--text);min-height:100vh}
.container{max-width:1800px;margin:0 auto;padding:20px}
.header{background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:25px 30px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px var(--shadow);position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--primary),var(--success),var(--primary));animation:shimmer 3s infinite}
@keyframes shimmer{0%,100%{opacity:0.6}50%{opacity:1}}
.header-left h1{font-size:28px;font-weight:700;color:var(--primary);margin-bottom:8px;text-transform:uppercase;letter-spacing:2px}
.header-left p{color:var(--text-muted);font-size:13px;font-family:'Segoe UI',sans-serif;margin-bottom:4px}
.header-right{display:flex;gap:15px;align-items:center;flex-wrap:wrap}
.status-badge,.duration-badge,.config-badge{padding:8px 20px;border-radius:6px;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1px;border:2px solid}
.status-badge.pass{background:#dcfce7;color:#166534;border-color:#16a34a}
.status-badge.fail{background:#fee2e2;color:#991b1b;border-color:#dc2626}
.status-badge.partial{background:#fef3c7;color:#92400e;border-color:#f59e0b}
.duration-badge{background:#dbeafe;color:#1e40af;border-color:#2563eb}
.config-badge{background:#f3e8ff;color:#6b21a8;border-color:#9333ea;font-size:10px;padding:6px 12px}
.tabs{display:flex;gap:5px;margin-bottom:20px;background:var(--card-bg);border-radius:8px;padding:5px;border:1px solid var(--border);box-shadow:0 1px 3px var(--shadow)}
.tab{background:transparent;border:none;color:var(--text-muted);padding:12px 25px;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;transition:all 0.3s;text-transform:uppercase;letter-spacing:1px}
.tab:hover{color:var(--primary);background:var(--bg-secondary)}
.tab.active{color:var(--primary);background:var(--bg-secondary);box-shadow:0 2px 4px var(--shadow)}
.tab-badge{background:var(--primary);color:white;padding:2px 8px;border-radius:3px;font-size:10px;margin-left:8px;font-weight:900}
.tab-content{display:none}
.tab-content.active{display:block;animation:fadeIn 0.3s}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.dashboard-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px;margin-bottom:20px}
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
.chart-card,.config-section{background:var(--card-bg);border:2px solid var(--border);border-radius:8px;padding:25px;box-shadow:0 2px 8px var(--shadow)}
.chart-title,.config-title{font-size:12px;font-weight:700;color:var(--primary);margin-bottom:20px;display:flex;align-items:center;gap:10px;text-transform:uppercase;letter-spacing:1px}
.chart-container{position:relative;height:200px}
.config-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:15px}
.config-item{background:var(--bg-secondary);padding:15px;border-radius:6px;border:1px solid var(--border);transition:all 0.3s}
.config-item:hover{border-color:var(--primary);box-shadow:0 2px 8px var(--shadow);transform:translateY(-2px)}
.config-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;font-weight:700}
.config-value{font-size:13px;color:var(--text);font-weight:600;word-break:break-word;font-family:'Segoe UI',sans-serif}
.report-table-container{background:var(--card-bg);border:2px solid var(--border);border-radius:8px;box-shadow:0 2px 8px var(--shadow);overflow:hidden}
.table-header{padding:20px 25px;border-bottom:2px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:var(--bg-secondary)}
.table-title{font-size:12px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:1px}
.search-box{background:var(--card-bg);border:2px solid var(--border);border-radius:6px;padding:8px 15px;color:var(--text);font-size:12px;width:300px;font-family:Consolas,monospace;transition:all 0.3s}
.search-box:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
.filter-controls{display:flex;gap:10px;align-items:center}
.filter-select{background:var(--card-bg);border:2px solid var(--border);border-radius:6px;padding:8px 15px;color:var(--text);font-size:12px;font-family:Consolas,monospace;cursor:pointer;transition:all 0.3s}
.filter-select:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
.consolidated-table{width:100%;border-collapse:collapse}
.consolidated-table thead{background:var(--bg-secondary);position:sticky;top:0;z-index:10}
.consolidated-table th{padding:15px 12px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--primary);border-bottom:2px solid var(--border);white-space:nowrap}
.consolidated-table td{padding:15px 12px;border-bottom:1px solid var(--border);font-size:12px;font-family:'Segoe UI',sans-serif}
.consolidated-table tbody tr{transition:all 0.2s}
.consolidated-table tbody tr:hover{background:var(--card-hover);box-shadow:inset 3px 0 0 var(--primary)}
.test-status{display:inline-block;padding:4px 10px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.test-status.pass{background:#dcfce7;color:#16a34a}
.test-status.fail{background:#fee2e2;color:#dc2626}
.test-status.skip{background:#fef3c7;color:#f59e0b}
.step-metrics{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.metric-badge{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;font-size:10px;font-weight:900;border:2px solid;transition:all 0.2s}
.metric-badge:hover{transform:scale(1.2);box-shadow:0 2px 8px var(--shadow)}
.metric-badge.total{background:#e0e7ff;color:#3730a3;border-color:#4f46e5}
.metric-badge.passed{background:#dcfce7;color:#166534;border-color:#16a34a}
.metric-badge.failed{background:#fee2e2;color:#991b1b;border-color:#dc2626}
.metric-badge.commented{background:#f3f4f6;color:#374151;border-color:#6b7280}
.metric-badge.skipped{background:#fef3c7;color:#92400e;border-color:#f59e0b}
.icon-button{background:var(--bg-secondary);border:2px solid var(--primary);cursor:pointer;padding:6px 10px;font-size:14px;border-radius:6px;transition:all 0.3s;color:var(--primary);text-decoration:none;display:inline-block}
.icon-button:hover{background:var(--primary);color:white;transform:scale(1.1);box-shadow:0 4px 8px var(--shadow)}
.modal{display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,0.5);animation:fadeIn 0.3s}
.modal.active{display:flex;align-items:center;justify-content:center}
.modal-content{background:var(--card-bg);border:2px solid var(--border);padding:30px;border-radius:8px;max-width:900px;max-height:90vh;overflow-y:auto;position:relative;animation:slideIn 0.3s;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.modal-close{position:absolute;top:15px;right:20px;font-size:28px;font-weight:bold;color:var(--text-muted);cursor:pointer;transition:color 0.2s}
.modal-close:hover{color:var(--danger)}
.modal-title{font-size:16px;font-weight:bold;margin-bottom:20px;color:var(--primary);border-bottom:2px solid var(--border);padding-bottom:10px;text-transform:uppercase;letter-spacing:1px}
.modal-info-grid{display:grid;grid-template-columns:200px 1fr;gap:15px;margin-bottom:10px}
.modal-label{font-weight:700;color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:1px}
.modal-value{color:var(--text);word-break:break-word;font-family:'Segoe UI',sans-serif;font-size:13px}
@keyframes slideIn{from{transform:translateY(-50px);opacity:0}to{transform:translateY(0);opacity:1}}
.table-wrapper{max-height:600px;overflow-y:auto}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:5px}
::-webkit-scrollbar-thumb:hover{background:var(--primary)}
</style>
</head>
<body>
<div class="container">
<div class="header">
<div class="header-left">
<h1>📊 ${escapeHtml(executionPack)} - Consolidated Report</h1>
<p>Execution Timestamp: ${escapeHtml(executionTimestamp)}</p>
<p>Start: ${formatDateTime(executionMetrics.startTime)} | End: ${formatDateTime(executionMetrics.endTime)}</p>
</div>
<div class="header-right">
<span class="config-badge">Continue On Failure: ${continueOnFailure ? 'YES' : 'NO'}</span>
<span class="duration-badge">⏱ ${executionMetrics.totalDuration}</span>
<span class="status-badge ${getOverallStatusClass(passedTests, failedTests, totalTests)}">${getOverallStatusText(passedTests, failedTests, totalTests)}</span>
</div>
</div>

<div class="tabs">
<button class="tab active" onclick="switchTab('dashboard')">DASHBOARD</button>
<button class="tab" onclick="switchTab('report')">TEST RESULTS <span class="tab-badge">${totalTests}</span></button>
</div>

<div id="dashboard" class="tab-content active">
<div class="dashboard-grid">
<div class="metric-card">
<div class="metric-header"><span class="metric-title">Total Tests</span><span class="metric-icon">📋</span></div>
<div class="metric-value">${totalTests}</div>
<div class="metric-label">Executed</div>
</div>
<div class="metric-card">
<div class="metric-header"><span class="metric-title">Passed</span><span class="metric-icon">✓</span></div>
<div class="metric-value" style="color:var(--success)">${passedTests}</div>
<div class="metric-label">Success</div>
</div>
<div class="metric-card">
<div class="metric-header"><span class="metric-title">Failed</span><span class="metric-icon">✗</span></div>
<div class="metric-value" style="color:var(--danger)">${failedTests}</div>
<div class="metric-label">Errors</div>
</div>
<div class="metric-card">
<div class="metric-header"><span class="metric-title">Skipped</span><span class="metric-icon">⏭</span></div>
<div class="metric-value" style="color:var(--warning)">${skippedTests}</div>
<div class="metric-label">Bypassed</div>
</div>
<div class="metric-card">
<div class="metric-header"><span class="metric-title">Pass Rate</span><span class="metric-icon">%</span></div>
<div class="metric-value" style="color:${getPassRateColor(passedTests, totalTests)}">${getPassRate(passedTests, totalTests)}%</div>
<div class="metric-label">Success Rate</div>
</div>
</div>

<div class="charts-section">
<div class="chart-card">
<div class="chart-title">Test Distribution</div>
<div class="chart-container"><canvas id="pieChart"></canvas></div>
</div>
<div class="chart-card">
<div class="chart-title">Status Breakdown</div>
<div class="chart-container"><canvas id="barChart"></canvas></div>
</div>
</div>

<div class="config-section">
<div class="config-title">Execution Configuration</div>
<div class="config-grid">
<div class="config-item"><div class="config-label">Execution Pack</div><div class="config-value">${escapeHtml(executionPack)}</div></div>
<div class="config-item"><div class="config-label">Browser</div><div class="config-value">${escapeHtml(browserConfig.browserName || 'N/A')} ${escapeHtml(browserConfig.browserVersion || '')}</div></div>
<div class="config-item"><div class="config-label">Platform</div><div class="config-value">${escapeHtml(browserConfig.os || 'N/A')} ${escapeHtml(browserConfig.osVersion || '')}</div></div>
<div class="config-item"><div class="config-label">Total Duration</div><div class="config-value">${executionMetrics.totalDuration}</div></div>
<div class="config-item"><div class="config-label">Start Time</div><div class="config-value">${formatDateTime(executionMetrics.startTime)}</div></div>
<div class="config-item"><div class="config-label">End Time</div><div class="config-value">${formatDateTime(executionMetrics.endTime)}</div></div>
<div class="config-item"><div class="config-label">Continue On Failure</div><div class="config-value">${continueOnFailure ? 'YES' : 'NO'}</div></div>
<div class="config-item"><div class="config-label">Timestamp</div><div class="config-value">${escapeHtml(executionTimestamp)}</div></div>
<div class="config-item"><div class="config-label">Executed By</div><div class="config-value">${escapeHtml(process.env.EXECUTED_BY || 'Automation')}</div></div>
</div>
</div>
</div>

<div id="report" class="tab-content">
<div class="report-table-container">
<div class="table-header">
<div class="table-title">Test Execution Results</div>
<div class="filter-controls">
<select class="filter-select" onchange="filterByStatus(this.value)">
<option value="all">All Status</option>
<option value="0">Passed</option>
<option value="1">Failed</option>
<option value="3">Skipped</option>
</select>
<input type="text" class="search-box" placeholder="Search tests..." onkeyup="filterTable(this.value)">
</div>
</div>
<div class="table-wrapper">
<table class="consolidated-table" id="resultsTable">
<thead>
<tr>
<th style="width:50px">No</th>
<th style="width:150px">Module</th>
<th style="width:180px">Test Case</th>
<th style="width:200px">Scenario</th>
<th style="width:100px">Status</th>
<th style="width:180px">Step Metrics</th>
<th style="width:100px">Duration</th>
<th style="width:80px">Info</th>
<th style="width:80px">Report</th>
</tr>
</thead>
<tbody>
${generateTestRows(testRowsData)}
</tbody>
</table>
</div>
</div>
</div>

</div>

<div id="infoModal" class="modal">
<div class="modal-content">
<span class="modal-close" onclick="closeModal('infoModal')">&times;</span>
<div class="modal-title">Test Case Details</div>
<div id="infoModalContent"></div>
</div>
</div>

<script>
const testData={passed:${passedTests},failed:${failedTests},skipped:${skippedTests}};
new Chart(document.getElementById('pieChart'),{type:'doughnut',data:{labels:['Passed','Failed','Skipped'],datasets:[{data:[testData.passed,testData.failed,testData.skipped],backgroundColor:['#16a34a','#dc2626','#f59e0b'],borderWidth:3,borderColor:'#ffffff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:12,font:{size:10,family:'Consolas'},boxWidth:10,color:'#64748b'}},tooltip:{backgroundColor:'#ffffff',titleColor:'#0f172a',bodyColor:'#0f172a',borderColor:'#e2e8f0',borderWidth:2,callbacks:{label:function(context){const total=context.dataset.data.reduce((a,b)=>a+b,0);const percentage=((context.parsed/total)*100).toFixed(1);return context.label+': '+context.parsed+' ('+percentage+'%)'}}}}}});
new Chart(document.getElementById('barChart'),{type:'bar',data:{labels:['Passed','Failed','Skipped'],datasets:[{label:'Test Count',data:[testData.passed,testData.failed,testData.skipped],backgroundColor:['#16a34a','#dc2626','#f59e0b'],borderWidth:0,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#ffffff',titleColor:'#0f172a',bodyColor:'#0f172a',borderColor:'#e2e8f0',borderWidth:2,callbacks:{label:function(context){return'Count: '+context.parsed.y}}}},scales:{y:{beginAtZero:true,ticks:{stepSize:1,font:{size:10,family:'Consolas'},color:'#64748b'},grid:{color:'#e2e8f0'}},x:{grid:{display:false},ticks:{font:{size:10,family:'Consolas'},color:'#64748b'}}}}});

const allTestData=${JSON.stringify(testRowsData)};

function switchTab(tabName){document.querySelectorAll('.tab-content').forEach(tab=>tab.classList.remove('active'));document.querySelectorAll('.tab').forEach(tab=>tab.classList.remove('active'));document.getElementById(tabName).classList.add('active');event.target.classList.add('active')}

function filterTable(searchTerm){const table=document.getElementById('resultsTable');const rows=table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');const term=searchTerm.toLowerCase();for(let i=0;i<rows.length;i++){const row=rows[i];const text=row.textContent.toLowerCase();row.style.display=text.includes(term)?'':'none'}}

function filterByStatus(status){const table=document.getElementById('resultsTable');const rows=table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');for(let i=0;i<rows.length;i++){const row=rows[i];const statusAttr=row.getAttribute('data-status');if(status==='all'||statusAttr===status){row.style.display=''}else{row.style.display='none'}}}

function showTestInfo(index){const modal=document.getElementById('infoModal');const content=document.getElementById('infoModalContent');const test=allTestData[index];content.innerHTML=\`<div class="modal-info-grid"><div class="modal-label">Test Case:</div><div class="modal-value">\${escapeHtmlClient(test.testcase)}</div><div class="modal-label">Scenario:</div><div class="modal-value">\${escapeHtmlClient(test.scenario)}</div><div class="modal-label">Description:</div><div class="modal-value">\${escapeHtmlClient(test.description)}</div><div class="modal-label">Module:</div><div class="modal-value">\${escapeHtmlClient(test.module)}</div><div class="modal-label">JIRA ID:</div><div class="modal-value">\${escapeHtmlClient(test.jiraId)}</div><div class="modal-label">Author:</div><div class="modal-value">\${escapeHtmlClient(test.author)}</div><div class="modal-label">Status:</div><div class="modal-value"><span class="test-status \${getTestStatusClass(test.status)}">\${getTestStatusText(test.status)}</span></div><div class="modal-label">Duration:</div><div class="modal-value">\${test.duration}</div><div class="modal-label">Start Time:</div><div class="modal-value">\${formatDateTime(test.startTime)}</div><div class="modal-label">End Time:</div><div class="modal-value">\${formatDateTime(test.endTime)}</div><div class="modal-label">Total Steps:</div><div class="modal-value">\${test.totalSteps}</div><div class="modal-label">Passed Steps:</div><div class="modal-value" style="color:var(--success)">\${test.passedSteps}</div><div class="modal-label">Failed Steps:</div><div class="modal-value" style="color:var(--danger)">\${test.failedSteps}</div><div class="modal-label">Commented Steps:</div><div class="modal-value" style="color:var(--comment)">\${test.commentedSteps}</div><div class="modal-label">Skipped Steps:</div><div class="modal-value" style="color:var(--warning)">\${test.skippedSteps}</div><div class="modal-label">Captured Data:</div><div class="modal-value">\${test.capturedDataCount} variables</div><div class="modal-label">Return Text:</div><div class="modal-value">\${escapeHtmlClient(test.returnText)}</div></div>\`;modal.classList.add('active')}

function closeModal(modalId){document.getElementById(modalId).classList.remove('active')}

function getTestStatusClass(status){switch(status){case 0:return'pass';case 1:return'fail';case 3:return'skip';default:return''}}

function getTestStatusText(status){switch(status){case 0:return'PASSED';case 1:return'FAILED';case 3:return'SKIPPED';default:return'UNKNOWN'}}

function formatDateTime(dateString){if(!dateString)return'';const date=new Date(dateString);return date.toLocaleString('en-US',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})}

function escapeHtmlClient(text){if(!text)return'';const div=document.createElement('div');div.textContent=text;return div.innerHTML}

window.onclick=function(event){if(event.target.classList.contains('modal')){event.target.classList.remove('active')}}
</script>
</body>
</html>`;

    const consolidatedReportPath = path.join(reportDir, `${executionPack}_${executionTimestamp}.html`);
    fs.writeFileSync(consolidatedReportPath, htmlContent, 'utf-8');
    console.log(`✅ Consolidated HTML report generated: ${consolidatedReportPath}`);

    // PlaceHolder for function to generate AI Summary
    // generateAISummary(consolidatedData, consolidatedReportPath);

}

function generateTestRows(testRowsData: any[]): string {
    let rows = '';
    testRowsData.forEach((test, index) => {
        const statusClass = getTestStatusClass(test.status);
        const statusText = getTestStatusText(test.status);

        rows += `<tr data-status="${test.status}">
<td>${test.no}</td>
<td>${escapeHtml(test.module)}</td>
<td>${escapeHtml(test.testcase)}</td>
<td>${escapeHtml(test.scenario)}</td>
<td><span class="test-status ${statusClass}">${statusText}</span>
</td>
<td>
<div class="step-metrics">
<span class="metric-badge total" title="Total Steps">${test.totalSteps}</span>
<span class="metric-badge passed" title="Passed Steps">${test.passedSteps}</span>
<span class="metric-badge failed" title="Failed Steps">${test.failedSteps}</span>
<span class="metric-badge commented" title="Commented Steps">${test.commentedSteps}</span>
<span class="metric-badge skipped" title="Skipped Steps">${test.skippedSteps}</span>
</div>
</td>
<td>${test.duration}</td>
<td style="text-align:center">
<button class="icon-button" onclick="showTestInfo(${index})" title="View Details">ℹ</button>
</td>
<td style="text-align:center">
<a href="${test.reportPath}" class="icon-button" title="Open Report" target="_blank">📄</a>
</td>
</tr>`;
    });
    return rows;
}

function getTestStatusClass(status: number): string {
    return status === 0 ? 'pass' : status === 1 ? 'fail' : status === 3 ? 'skip' : '';
}

function getTestStatusText(status: number): string {
    return status === 0 ? 'PASSED' : status === 1 ? 'FAILED' : status === 3 ? 'SKIPPED' : 'UNKNOWN';
}

function getOverallStatusClass(passed: number, failed: number, total: number): string {
    if (failed === 0 && passed === total) return 'pass';
    if (failed > 0) return 'fail';
    return 'partial';
}

function getOverallStatusText(passed: number, failed: number, total: number): string {
    if (failed === 0 && passed === total) return 'ALL PASSED';
    if (failed > 0) return 'FAILED';
    return 'PARTIAL';
}

function getPassRate(passed: number, total: number): string {
    if (total === 0) return '0';
    return ((passed / total) * 100).toFixed(1);
}

function getPassRateColor(passed: number, total: number): string {
    const rate = (passed / total) * 100;
    if (rate >= 90) return 'var(--success)';
    if (rate >= 70) return 'var(--warning)';
    return 'var(--danger)';
}

function formatDateTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function escapeHtml(text: string): string {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[m] || m));
}

