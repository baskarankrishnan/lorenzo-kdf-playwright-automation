# Generate_LSTP_CDC_WF001_Excel.ps1
# Generates the Excel workbook for LSTP_CDC_WF001 - CDC (Clinical Document/Form Lifecycle)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_CDC_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\CDC"
$outFile   = Join-Path $outDir "LSTP_CDC_WF001.xlsx"

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
    "CLINIC_NAME",
    "FORENAME","CITY","COUNTRY","COUNTRY_OF_BIRTH","NATIONALITY","ETHNICITY",
    "LOCATION","APPOINTMENT_TYPE","APPOINTMENT_PRIORITY",
    "SERVICE_TYPE","REFERRAL_SOURCE","REFERRAL_PRIORITY","REFERRAL_TYPE",
    "ATTEND_STATUS",
    "CDC_FORM_NAME","SERVICE_TEAM_NAME","CORRECTION_REASON"
)

for ($c = 0; $c -lt $datasetCols.Count; $c++) {
    $cell = $ws2.Cells.Item(1, $c + 1)
    $cell.Value2 = $datasetCols[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$sampleValues = @(
    "CDC Clinic",
    "John","London","United Kingdom","United Kingdom","British","White British",
    "Main Location","New","Routine",
    "Community","GP Referral","Routine","New Referral",
    "Attended",
    "Community Development Centre Form","CDC Assessment Team","Information added in error"
)

for ($c = 0; $c -lt $sampleValues.Count; $c++) {
    $ws2.Cells.Item(2, $c + 1).Value2 = "$($sampleValues[$c])"
}

$ws2.Columns.AutoFit() | Out-Null

# --- Sheet 3: ExecutionConfig ---
$ws3 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws2)
$ws3.Name = "ExecutionConfig"

$configData = @(
    @("Test Case ID",          "LSTP_CDC_WF001"),
    @("Module",                "CDC"),
    @("Sub-Module",            "CDC Clinic Forms EPR Lifecycle"),
    @("Description",           "End-to-end CDC workflow covering login, My Work Clinics navigation, clinic session search, empty slot booking, patient registration, clinic appointment booking with referral, Arrived status management, View EPR, Forms EPR tab navigation, CDC form initiation with name and description recording, mandatory form details entry, verification of return to Clinic Peg Board, List and Details tab validation, Continue Form, Correct Form, Copy Entire Form, Finalise Draft Form, Mark as Obsolete with justification, and Print Preview validation."),
    @("Complexity",            "Very High"),
    @("Priority",              "P1"),
    @("Estimated Duration",    "35-45 minutes"),
    @("Total Steps",           "155"),
    @("Total Pages",           "21"),
    @("Total Elements",        "46"),
    @("Author",                "KDF Generator"),
    @("Created Date",          (Get-Date -Format "dd/MM/yyyy")),
    @("Last Updated",          (Get-Date -Format "dd/MM/yyyy")),
    @("Status",                "Ready"),
    @("Prerequisites",         "Active CDC clinic session with available slots, valid login credentials, Forms EPR module enabled, CDC form available in form library"),
    @("Test Data Variables",   "CLINIC_NAME, FORENAME, CITY, COUNTRY, COUNTRY_OF_BIRTH, NATIONALITY, ETHNICITY, LOCATION, APPOINTMENT_TYPE, APPOINTMENT_PRIORITY, SERVICE_TYPE, REFERRAL_SOURCE, REFERRAL_PRIORITY, REFERRAL_TYPE, ATTEND_STATUS, CDC_FORM_NAME, SERVICE_TEAM_NAME, CORRECTION_REASON"),
    @("Assertions",            "11"),
    @("Pages Used",            "pageLogin, pageHome, page.., pagePatientBasicSearch, pagePatientSearch, pageRegRegistration, pageWarning - LORENZO, pageQuestion - LORENZO, pageRegConfirmationpopup, pageCBookAppointment, pageReferralDetails, pagefmMngAppStatDepart, pageLORENZO, pageEPRView, pageInitiate, pageFormsListDetailsView, pageContinue, pageReasonforCorrection, pageFinalise , pageMark as Obsolete, pageSelectPrinter"),
    @("Workflows Covered",     "Login + Clinics Navigation + Clinic Session Selection + Patient Registration + Clinic Appointment Booking + Referral Creation + Validate Booked + Arrived Status Management + View EPR + Forms EPR Tab Navigation + CDC Form Initiation + Record CDC Name and Description + Mandatory Form Details Entry + Verify Return to Clinic Peg Board + Second View EPR + List and Details Validation + Continue Form + Correct Form + Re-validate + Copy Entire Form + Copy Validate + Finalise Draft Form + Mark as Obsolete + Preview + Logout")
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
