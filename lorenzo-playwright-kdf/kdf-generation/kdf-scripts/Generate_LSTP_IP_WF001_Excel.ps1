# Generate_LSTP_IP_WF001_Excel.ps1
# Generates Excel workbook for LSTP_IP_WF001 - IP (Inpatient) Module

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_IP_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\IP"
$outFile   = Join-Path $outDir "LSTP_IP_WF001.xlsx"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$steps = Get-Content $jsonPath -Raw | ConvertFrom-Json

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Add()

# ── Sheet 1: TestExecution ──────────────────────────────────────────
$ws1 = $wb.Sheets.Item(1)
$ws1.Name = "TestExecution"

$teHeaders = @("StepNo","StepDescription","Page","Element","ElementText","ActionKeyword","Property","Condition","TableColumnNames","Values","DatasetColumnName")
for ($c = 0; $c -lt $teHeaders.Count; $c++) {
    $cell = $ws1.Cells.Item(1, $c + 1)
    $cell.Value2 = $teHeaders[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

for ($i = 0; $i -lt $steps.Count; $i++) {
    $s = $steps[$i]
    $r = $i + 2
    $ws1.Cells.Item($r, 1).Value2  = [int]$s.StepNo
    $ws1.Cells.Item($r, 2).Value2  = "$($s.StepDescription)"
    $ws1.Cells.Item($r, 3).Value2  = "$($s.Page)"
    $ws1.Cells.Item($r, 4).Value2  = "$($s.Element)"
    $ws1.Cells.Item($r, 5).Value2  = "$($s.ElementText)"
    $ws1.Cells.Item($r, 6).Value2  = "$($s.ActionKeyword)"
    $ws1.Cells.Item($r, 7).Value2  = "$($s.Property)"
    $ws1.Cells.Item($r, 8).Value2  = "$($s.Condition)"
    $ws1.Cells.Item($r, 9).Value2  = "$($s.TableColumnNames)"
    $ws1.Cells.Item($r, 10).Value2 = "$($s.Values)"
    $ws1.Cells.Item($r, 11).Value2 = "$($s.DatasetColumnName)"
}

# ── Sheet 2: TestData ───────────────────────────────────────────────
$ws2 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws1)
$ws2.Name = "TestData"

$tdHeaders = @("CITY","COUNTRY","WARD_NAME","INTENDED_MANAGEMENT","SERVICE_TYPE","REFERRAL_PRIORITY","REFERRAL_TYPE","REFERRAL_SOURCE","MANAGEMENT_INTENTION","BOOKING_PRIORITY","ADMISSION_SOURCE","ADMISSION_TYPE","CARE_PROVIDER_ID","MODIFY_ADMISSION_SOURCE","EXPECTED_LOS","TRANSFER_WARD","TRANSFER_REASON","LEAVE_TYPE","LEAVE_REASON","LEAVE_OUTCOME","MEDICAL_DISCHARGE_STATUS","DISCHARGE_METHOD","DISCHARGE_OUTCOME")
for ($c = 0; $c -lt $tdHeaders.Count; $c++) {
    $cell = $ws2.Cells.Item(1, $c + 1)
    $cell.Value2 = $tdHeaders[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$tdSample = @("London","United Kingdom","Ward A","Day case","Inpatient","Routine","Inpatient","General Practitioner","Day case","Routine","GP Referral","Elective Admission: Waiting list","996289289011","GP Referral","5","Ward B","Clinical","Informal","Personal choice","Return","Medically fit for discharge","Usual place of residence","Discharged")
for ($c = 0; $c -lt $tdSample.Count; $c++) {
    $ws2.Cells.Item(2, $c + 1).Value2 = $tdSample[$c]
}

# ── Sheet 3: ExecutionConfig ────────────────────────────────────────
$ws3 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws2)
$ws3.Name = "ExecutionConfig"

$configHeaders = @("Key","Value")
for ($c = 0; $c -lt $configHeaders.Count; $c++) {
    $cell = $ws3.Cells.Item(1, $c + 1)
    $cell.Value2 = $configHeaders[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$today = (Get-Date).ToString("dd/MM/yyyy")
$totalSteps = $steps.Count
$uniquePages = ($steps | Select-Object -ExpandProperty Page -Unique | Where-Object { $_ -ne "" }).Count
$uniqueElements = ($steps | Select-Object -ExpandProperty Element -Unique | Where-Object { $_ -ne "" }).Count
$assertCount = ($steps | Where-Object { $_.ActionKeyword -eq "verifyProperty" }).Count
$pagesUsed = ($steps | Select-Object -ExpandProperty Page -Unique | Where-Object { $_ -ne "" }) -join ", "
$datasetCols = ($steps | Select-Object -ExpandProperty DatasetColumnName -Unique | Where-Object { $_ -ne "" }) -join ", "

$configData = @(
    @("Test Case ID", "LSTP_IP_WF001"),
    @("Module", "IP (Inpatient)"),
    @("Sub-Module", "IP Ward Booking and Inpatient Workflow"),
    @("Description", "End-to-end inpatient workflow: Ward A booking with patient registration and referral, edit booking, admit, modify admit, transfer to Ward B, patient leave, leave return, medical discharge, and actual discharge"),
    @("Complexity", "Very High"),
    @("Priority", "P1"),
    @("Estimated Duration", "30-40 minutes"),
    @("Total Steps", "$totalSteps"),
    @("Total Pages", "$uniquePages"),
    @("Total Elements", "$uniqueElements"),
    @("Author", "KDF Generator"),
    @("Created Date", $today),
    @("Last Updated", $today),
    @("Status", "Ready"),
    @("Prerequisites", "Valid Lorenzo credentials, Ward A and Ward B configured, Care provider identifier available"),
    @("Test Data Variables", $datasetCols),
    @("Assertions", "$assertCount"),
    @("Pages Used", $pagesUsed),
    @("Workflows Covered", "IP Ward Booking + Patient Registration + Referral Creation + Edit Booking + Admit + Modify Admit + Patient Transfer + Patient Leave + Leave Return + Medical Discharge + Actual Discharge")
)

for ($i = 0; $i -lt $configData.Count; $i++) {
    $ws3.Cells.Item($i + 2, 1).Value2 = "$($configData[$i][0])"
    $ws3.Cells.Item($i + 2, 2).Value2 = "$($configData[$i][1])"
}

# ── Sheet 4: TestValues ─────────────────────────────────────────────
$ws4 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws3)
$ws4.Name = "TestValues"

$tvHeaders = @("VariableName","Description","SampleValue")
for ($c = 0; $c -lt $tvHeaders.Count; $c++) {
    $cell = $ws4.Cells.Item(1, $c + 1)
    $cell.Value2 = $tvHeaders[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$tvData = @(
    @("_RandomSurname",   "Auto-generated surname for new patient",          "AutoGenerated"),
    @("_USERNAME",        "Login username",                                   "From config"),
    @("_PASSWORD",        "Login password",                                   "From config")
)

for ($i = 0; $i -lt $tvData.Count; $i++) {
    $ws4.Cells.Item($i + 2, 1).Value2 = "$($tvData[$i][0])"
    $ws4.Cells.Item($i + 2, 2).Value2 = "$($tvData[$i][1])"
    $ws4.Cells.Item($i + 2, 3).Value2 = "$($tvData[$i][2])"
}

# ── Save and close ──────────────────────────────────────────────────
$wb.SaveAs($outFile, 51)  # 51 = xlOpenXMLWorkbook (.xlsx)
$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host "Excel workbook saved: $outFile"
