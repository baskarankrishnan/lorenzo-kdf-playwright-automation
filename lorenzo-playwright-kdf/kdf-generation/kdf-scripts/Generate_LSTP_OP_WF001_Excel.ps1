# Generate_LSTP_OP_WF001_Excel.ps1
# Generates the Excel workbook for LSTP_OP_WF001 - OP (Outpatient)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_OP_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\OP"
$outFile   = Join-Path $outDir "LSTP_OP_WF001.xlsx"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$steps = Get-Content $jsonPath -Raw | ConvertFrom-Json

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Add()

# --- Sheet 1: TestExecution ---
$ws1 = $wb.Sheets.Item(1)
$ws1.Name = "TestExecution"

$headers = @("StepNo","StepDescription","Page","Element","ElementText","ActionKeyword","Property","Condition","TableColumnNames","Values","DatasetColumnName")
for ($c = 0; $c -lt $headers.Count; $c++) {
    $cell = $ws1.Cells.Item(1, $c + 1)
    $cell.Value2 = $headers[$c]
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

$ws1.Columns.AutoFit() | Out-Null

# --- Sheet 2: TestData ---
$ws2 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws1)
$ws2.Name = "TestData"

$datasetCols = @(
    "CLINIC_NAME","FORENAME","CITY","COUNTRY","COUNTRY_OF_BIRTH","NATIONALITY",
    "ETHNICITY","LOCATION","APPOINTMENT_TYPE","APPOINTMENT_PRIORITY",
    "SERVICE_TYPE","REFERRAL_SOURCE","REFERRAL_PRIORITY","REFERRAL_TYPE",
    "MODIFIED_APPOINTMENT_TYPE","ATTEND_STATUS","SEEN_OUTCOME",
    "DEPART_ATTEND_STATUS","DEPARTURE_OUTCOME"
)

for ($c = 0; $c -lt $datasetCols.Count; $c++) {
    $cell = $ws2.Cells.Item(1, $c + 1)
    $cell.Value2 = $datasetCols[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$sampleValues = @(
    "General Medicine","John","London","United Kingdom","United Kingdom","British",
    "White British","Main Outpatient","New Patient","Routine",
    "General Medicine","GP Referral","Routine","New Referral",
    "Follow-up","Arrived","Appointment Kept",
    "Seen","Appointment Kept"
)

for ($c = 0; $c -lt $sampleValues.Count; $c++) {
    $ws2.Cells.Item(2, $c + 1).Value2 = "$($sampleValues[$c])"
}

$ws2.Columns.AutoFit() | Out-Null

# --- Sheet 3: ExecutionConfig ---
$ws3 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws2)
$ws3.Name = "ExecutionConfig"

$configData = @(
    @("Test Case ID",          "LSTP_OP_WF001"),
    @("Module",                "OP (Outpatient)"),
    @("Sub-Module",            "Outpatient Appointment Booking and Status Workflow"),
    @("Description",           "End-to-end outpatient workflow covering clinic session search, patient registration, appointment booking with referral creation, modify booking, and appointment status transitions: Arrived, Called, Seen, Departed."),
    @("Complexity",            "High"),
    @("Priority",              "P1"),
    @("Estimated Duration",    "20-25 minutes"),
    @("Total Steps",           "86"),
    @("Total Pages",           "14"),
    @("Total Elements",        "30"),
    @("Author",                "KDF Generator"),
    @("Created Date",          (Get-Date -Format "dd/MM/yyyy")),
    @("Last Updated",          (Get-Date -Format "dd/MM/yyyy")),
    @("Status",                "Ready"),
    @("Prerequisites",         "Active clinic session with empty slots, valid login credentials, NHS spine connectivity"),
    @("Test Data Variables",   "CLINIC_NAME, FORENAME, CITY, COUNTRY, COUNTRY_OF_BIRTH, NATIONALITY, ETHNICITY, LOCATION, APPOINTMENT_TYPE, APPOINTMENT_PRIORITY, SERVICE_TYPE, REFERRAL_SOURCE, REFERRAL_PRIORITY, REFERRAL_TYPE, MODIFIED_APPOINTMENT_TYPE, ATTEND_STATUS, SEEN_OUTCOME, DEPART_ATTEND_STATUS, DEPARTURE_OUTCOME"),
    @("Assertions",            "6"),
    @("Pages Used",            "pageLogin, pageHome, page.., pagePatientBasicSearch, pagePatientSearch, pageRegRegistration, pageWarning - LORENZO, pageQuestion - LORENZO, pageRegConfirmationpopup, pageCBookAppointment, pageReferralDetails, pageEdit Appointment, pagefmMngAppStatDepart"),
    @("Workflows Covered",     "Clinic Session Search + Slot Selection + Patient Registration + Appointment Booking with Referral + Modify Booking + Arrived + Called + Seen + Departed + Logout")
)

$ws3.Cells.Item(1, 1).Value2 = "Key"
$ws3.Cells.Item(1, 1).Font.Bold = $true
$ws3.Cells.Item(1, 1).Interior.Color = 13882323
$ws3.Cells.Item(1, 2).Value2 = "Value"
$ws3.Cells.Item(1, 2).Font.Bold = $true
$ws3.Cells.Item(1, 2).Interior.Color = 13882323

for ($i = 0; $i -lt $configData.Count; $i++) {
    $ws3.Cells.Item($i + 2, 1).Value2 = "$($configData[$i][0])"
    $ws3.Cells.Item($i + 2, 2).Value2 = "$($configData[$i][1])"
}

$ws3.Columns.AutoFit() | Out-Null

# --- Sheet 4: TestValues ---
$ws4 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws3)
$ws4.Name = "TestValues"

$tvHeaders = @("VariableName", "Description", "SampleValue")
for ($c = 0; $c -lt $tvHeaders.Count; $c++) {
    $cell = $ws4.Cells.Item(1, $c + 1)
    $cell.Value2 = $tvHeaders[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$testValues = @(
    @("_RandomSurname", "Auto-generated surname for new patient",    "AutoGenerated"),
    @("_NHSNUMBER",     "Captured from registration popup",          "Captured at runtime"),
    @("_PASID",         "PAS ID of registered patient",              "Captured at runtime"),
    @("_USERNAME",      "Login username",                            "From config"),
    @("_PASSWORD",      "Login password",                            "From config")
)

for ($i = 0; $i -lt $testValues.Count; $i++) {
    $ws4.Cells.Item($i + 2, 1).Value2 = "$($testValues[$i][0])"
    $ws4.Cells.Item($i + 2, 2).Value2 = "$($testValues[$i][1])"
    $ws4.Cells.Item($i + 2, 3).Value2 = "$($testValues[$i][2])"
}

$ws4.Columns.AutoFit() | Out-Null

# Save and close
$wb.SaveAs($outFile)
$wb.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host "Excel workbook generated: $outFile"
