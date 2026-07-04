# Generate_LSTP_EC_WF001_Excel.ps1
# Generates the Excel workbook for LSTP_EC_WF001 from the KDF JSON script

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_EC_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\EC"
$outFile   = Join-Path $outDir "LSTP_EC_WF001.xlsx"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# Load JSON steps
$steps = Get-Content $jsonPath -Raw | ConvertFrom-Json

# ── Excel COM ──────────────────────────────────────────────────────────────────
$xl  = New-Object -ComObject Excel.Application
$xl.Visible        = $false
$xl.DisplayAlerts  = $false
$wb  = $xl.Workbooks.Add()

# ── Sheet creation order: TestExecution | TestData | ExecutionConfig | TestValues
$ws1 = $wb.Sheets.Item(1); $ws1.Name = "TestExecution"
$ws2 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws1); $ws2.Name = "TestData"
$ws3 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws2); $ws3.Name = "ExecutionConfig"
$ws4 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws3); $ws4.Name = "TestValues"

$headerColor = 13882323   # amber/gold
$boldTrue    = $true

# ══════════════════════════════════════════════════════════════════════════════
# SHEET 1 — TestExecution
# ══════════════════════════════════════════════════════════════════════════════
$te_headers = @("StepNo","StepDescription","Page","Element","ElementText",
                "ActionKeyword","Property","Condition","TableColumnNames","Values","DatasetColumnName")

for ($c = 1; $c -le $te_headers.Count; $c++) {
    $ws1.Cells.Item(1, $c).Value2            = $te_headers[$c-1]
    $ws1.Cells.Item(1, $c).Interior.Color    = $headerColor
    $ws1.Cells.Item(1, $c).Font.Bold         = $boldTrue
}

for ($i = 0; $i -lt $steps.Count; $i++) {
    $r   = $i + 2
    $stp = $steps[$i]
    $ws1.Cells.Item($r,  1).Value2 = [int]$stp.StepNo
    $ws1.Cells.Item($r,  2).Value2 = "$($stp.StepDescription)"
    $ws1.Cells.Item($r,  3).Value2 = "$($stp.Page)"
    $ws1.Cells.Item($r,  4).Value2 = "$($stp.Element)"
    $ws1.Cells.Item($r,  5).Value2 = "$($stp.ElementText)"
    $ws1.Cells.Item($r,  6).Value2 = "$($stp.ActionKeyword)"
    $ws1.Cells.Item($r,  7).Value2 = "$($stp.Property)"
    $ws1.Cells.Item($r,  8).Value2 = "$($stp.Condition)"
    $ws1.Cells.Item($r,  9).Value2 = "$($stp.TableColumnNames)"
    $ws1.Cells.Item($r, 10).Value2 = "$($stp.Values)"
    $ws1.Cells.Item($r, 11).Value2 = "$($stp.DatasetColumnName)"
}
$ws1.Columns.AutoFit() | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SHEET 2 — TestData
# ══════════════════════════════════════════════════════════════════════════════
$td_headers = @(
    "CITY","COUNTRY",
    "ARRIVAL_DATE","PRESENTING_COMPLAINT","ATTENDANCE_TYPE","CP_SURNAME","CP_FORENAME",
    "ATTENDANCE_SOURCE","CONSULTATION_MEDIUM","ASSIGNED_TO","MODE_OF_ARRIVAL",
    "MODIFY_ATTENDANCE_TYPE","MODIFY_ATTENDANCE_REASON",
    "CHIEF_COMPLAINT_SEARCH","TRIAGED_ON","TRIAGE_CATEGORY",
    "MODIFY_ANALGESIA","MODIFY_TRIAGE_REASON",
    "SEEN_START_DATE",
    "DTA_DATE","DTA_ASSOCIATE_REFERRAL","DTA_REFERRED_TO_TYPE","DTA_SPECIALTY",
    "BR_PREFERRED_WARD",
    "TREATMENT_COMPLETED_ON","DISPOSAL_DATE","DISCHARGE_STATUS","PRINCIPAL_REASON"
)

$td_sample = @(
    "London","United Kingdom",
    "05/05/2026 09:00","Chest Pain","First","Smith","John",
    "Walk-in","Face to face","Doctor","Walk",
    "Follow-up","Data entry error",
    "Chest","05/05/2026 09:15","3 - Urgent",
    "Paracetamol","Clinical assessment",
    "05/05/2026 09:30",
    "05/05/2026 10:00","No Referral","Consultant","General Medicine",
    "General Medicine Ward",
    "05/05/2026 12:00","05/05/2026 12:00","Admitted","Emergency"
)

for ($c = 1; $c -le $td_headers.Count; $c++) {
    $ws2.Cells.Item(1, $c).Value2            = $td_headers[$c-1]
    $ws2.Cells.Item(1, $c).Interior.Color    = $headerColor
    $ws2.Cells.Item(1, $c).Font.Bold         = $boldTrue
    $ws2.Cells.Item(2, $c).Value2            = $td_sample[$c-1]
}
$ws2.Columns.AutoFit() | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SHEET 3 — ExecutionConfig
# ══════════════════════════════════════════════════════════════════════════════
$today = (Get-Date).ToString("dd/MM/yyyy")

$configData = @(
    @("Test Case ID",          "LSTP_EC_WF001"),
    @("Module",                "EC"),
    @("Sub-Module",            "Emergency Care Attendance Lifecycle"),
    @("Description",           "End-to-end verification of Emergency Care module covering ward navigation, patient registration via Create Attendance, attendance creation, modification, triage and stream, modify triage, seen, decision to admit with booking request, IP ward DTA validation, return to EC ward, and close attendance with actual disposal"),
    @("Complexity",            "Very High"),
    @("Priority",              "P1"),
    @("Estimated Duration",    "35-40 minutes"),
    @("Total Steps",           "206"),
    @("Total Pages",           "14"),
    @("Total Elements",        "48"),
    @("Author",                "KDF Generator"),
    @("Created Date",          $today),
    @("Last Updated",          $today),
    @("Status",                "Ready"),
    @("Prerequisites",         "Lorenzo EC module is accessible, Emergency Care Ward is available in department map, User has EC prescribing and DTA role, Care provider exists for CP lookup, Inpatient ward configured for preferred ward selection"),
    @("Test Data Variables",   "CITY, COUNTRY, ARRIVAL_DATE, PRESENTING_COMPLAINT, ATTENDANCE_TYPE, CP_SURNAME, CP_FORENAME, ATTENDANCE_SOURCE, CONSULTATION_MEDIUM, ASSIGNED_TO, MODE_OF_ARRIVAL, MODIFY_ATTENDANCE_TYPE, MODIFY_ATTENDANCE_REASON, CHIEF_COMPLAINT_SEARCH, TRIAGED_ON, TRIAGE_CATEGORY, MODIFY_ANALGESIA, MODIFY_TRIAGE_REASON, SEEN_START_DATE, DTA_DATE, DTA_ASSOCIATE_REFERRAL, DTA_REFERRED_TO_TYPE, DTA_SPECIALTY, BR_PREFERRED_WARD, TREATMENT_COMPLETED_ON, DISPOSAL_DATE, DISCHARGE_STATUS, PRINCIPAL_REASON"),
    @("Assertions",            "7"),
    @("Pages Used",            "pageLogin, pageHome, pageLORENZO, pageDepartment map, pageECWBCurrentview, pagePatientBasicSearch, pagePatientSearch, pageWarning - LORENZO, pageQuestion - LORENZO, pageECCreateAttendance, pageDef_Users, pageECTriage, page, pageECSeen, pageECRecordDecisionToAdmit, pageReschedule, pageECCloseReopenAttendance"),
    @("Workflows Covered",     "Login + Navigate to Emergency Department + Patient Registration via Create Attendance + Fill Create Attendance + Modify Attendance + Triage and Stream + Modify Triage and Stream + Seen + Decision to Admit + Create Booking Request + Navigate IP Ward (DTA Validation) + Return to Emergency Ward + Close Attendance with Actual Disposal + Logout")
)

$ws3.Cells.Item(1,1).Value2         = "Key"
$ws3.Cells.Item(1,1).Interior.Color = $headerColor
$ws3.Cells.Item(1,1).Font.Bold      = $boldTrue
$ws3.Cells.Item(1,2).Value2         = "Value"
$ws3.Cells.Item(1,2).Interior.Color = $headerColor
$ws3.Cells.Item(1,2).Font.Bold      = $boldTrue

for ($i = 0; $i -lt $configData.Count; $i++) {
    $r = $i + 2
    $ws3.Cells.Item($r,1).Value2 = "$($configData[$i][0])"
    $ws3.Cells.Item($r,2).Value2 = "$($configData[$i][1])"
}
$ws3.Columns.AutoFit() | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SHEET 4 — TestValues
# ══════════════════════════════════════════════════════════════════════════════
$tv_headers = @("VariableName","Description","SampleValue")
for ($c = 1; $c -le $tv_headers.Count; $c++) {
    $ws4.Cells.Item(1,$c).Value2            = $tv_headers[$c-1]
    $ws4.Cells.Item(1,$c).Interior.Color    = $headerColor
    $ws4.Cells.Item(1,$c).Font.Bold         = $boldTrue
}

$tvData = @(
    @("_RandomSurname", "Auto-generated surname for EC patient registration",      "AutoGenerated"),
    @("_USERNAME",      "Login username from environment configuration",            "From config"),
    @("_PASSWORD",      "Login password from environment configuration",            "From config")
)

for ($i = 0; $i -lt $tvData.Count; $i++) {
    $r = $i + 2
    $ws4.Cells.Item($r,1).Value2 = "$($tvData[$i][0])"
    $ws4.Cells.Item($r,2).Value2 = "$($tvData[$i][1])"
    $ws4.Cells.Item($r,3).Value2 = "$($tvData[$i][2])"
}
$ws4.Columns.AutoFit() | Out-Null

# ── Save ───────────────────────────────────────────────────────────────────────
$wb.SaveAs($outFile, 51)   # 51 = xlOpenXMLWorkbook (.xlsx)
$wb.Close($false)
$xl.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null

Write-Host "Excel workbook generated: $outFile"
