# Generate_LSTP_CaseNote_WF001_Excel.ps1
# Generates the Excel workbook for LSTP_CaseNote_WF001 from the KDF JSON script

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_CaseNote_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\CaseNote"
$outFile   = Join-Path $outDir "LSTP_CaseNote_WF001.xlsx"

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
    "CLINIC_NAME",
    "FORENAME", "CITY", "COUNTRY",
    "COUNTRY_OF_BIRTH", "NATIONALITY", "ETHNICITY",
    "APPOINTMENT_TYPE",
    "VOLUME_TYPE", "VOLUME_NATURE", "HOME_LOCATION",
    "REQUEST_REASON"
)

$td_sample = @(
    "General Medicine Clinic",
    "Jane", "London", "United Kingdom",
    "United Kingdom", "British", "A - White British",
    "First Appointment",
    "X-ray", "Permanent", "Medical Records",
    "Outpatient Appointment"
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
    @("Test Case ID",          "LSTP_CaseNote_WF001"),
    @("Module",                "CaseNote"),
    @("Sub-Module",            "Clinic Appointment and Volume Management Lifecycle"),
    @("Description",           "End-to-end verification of CaseNote module covering clinic session navigation, empty slot booking, full patient registration via roadmap, appointment validation, volume creation (X-ray/Permanent) by PASID, request volume with location and reason, despatch volume with destination, and volume lifecycle transaction validation"),
    @("Complexity",            "Very High"),
    @("Priority",              "P1"),
    @("Estimated Duration",    "30-35 minutes"),
    @("Total Steps",           "109"),
    @("Total Pages",           "17"),
    @("Total Elements",        "42"),
    @("Author",                "KDF Generator"),
    @("Created Date",          $today),
    @("Last Updated",          $today),
    @("Status",                "Ready"),
    @("Prerequisites",         "Lorenzo Clinics module accessible, at least one clinic session with empty time slots available, Volume Management module enabled for user role, patient registration rights enabled, PASID search available on patient search forms"),
    @("Test Data Variables",   "CLINIC_NAME, FORENAME, CITY, COUNTRY, COUNTRY_OF_BIRTH, NATIONALITY, ETHNICITY, APPOINTMENT_TYPE, VOLUME_TYPE, VOLUME_NATURE, HOME_LOCATION, REQUEST_REASON"),
    @("Assertions",            "3"),
    @("Pages Used",            "pageLogin, pageHome, pageLORENZO, page.., pagePatientBasicSearch, pagePatientSearch, pageRegRegistration, pageWarning - LORENZO, pageQuestion - LORENZO, pageRegConfirmationpopup, pageCBookAppointment, pageCreateVolume, pageCreateaVolume, pagePatientSearchGrid, pageRequestVolume, pageCNTAddRequestInformation, pageCreatedocument, pageCNTDespatchVolume, pageDispatch volume(s)"),
    @("Workflows Covered",     "Login + Navigate Clinics (My Work) + Search Clinic Session + Select Session + Click Empty Slot + Book Appointment + Patient Registration (Full Roadmap 2 Sections) + NHS Allocation + Capture PAS ID + Complete Clinic Appointment Booking + Validate Booked + Navigate Volume Management + Create Volume (X-ray/Permanent/PASID) + Validate Volume Created + Request Volume (PASID/Add/Location/Reason) + Cancel Document + Despatch Volume (PASID/Select/Destination) + Validate Volume Transaction + Logout")
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
    @("_RandomSurname", "Auto-generated surname used for new patient registration to ensure uniqueness",     "AutoGenerated"),
    @("_PASID",         "PAS ID captured from registration confirmation popup, used in Volume Management",  "Captured at runtime"),
    @("_USERNAME",      "Login username from environment configuration",                                     "From config"),
    @("_PASSWORD",      "Login password from environment configuration",                                     "From config")
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
