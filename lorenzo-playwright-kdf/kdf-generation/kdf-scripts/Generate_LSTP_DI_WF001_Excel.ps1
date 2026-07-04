# Generate_LSTP_DI_WF001_Excel.ps1
# Generates the Excel workbook for LSTP_DI_WF001 (DI - Digital Integration)
# Sheets: TestExecution | TestData | ExecutionConfig | TestValues

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$outDir    = Join-Path $repoRoot "excelFramework\testcases\DI"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$outFile  = Join-Path $outDir "LSTP_DI_WF001.xlsx"
$jsonFile = Join-Path $scriptDir "LSTP_DI_WF001.json"

# Load JSON steps
$steps = Get-Content $jsonFile -Raw | ConvertFrom-Json

# ---------------------------------------------------------------------------
# COM Excel
# ---------------------------------------------------------------------------
$xl = New-Object -ComObject Excel.Application
$xl.Visible       = $false
$xl.DisplayAlerts = $false

$wb = $xl.Workbooks.Add()

# ---------------------------------------------------------------------------
# Sheet 1 -- TestExecution
# ---------------------------------------------------------------------------
$ws1 = $wb.Sheets.Item(1)
$ws1.Name = "TestExecution"

$headers1 = @("StepNo","StepDescription","Page","Element","ElementText",
              "ActionKeyword","Property","Condition","TableColumnNames","Values","DatasetColumnName")

for ($c = 0; $c -lt $headers1.Count; $c++) {
    $cell = $ws1.Cells.Item(1, $c + 1)
    $cell.Value2 = $headers1[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

for ($i = 0; $i -lt $steps.Count; $i++) {
    $s   = $steps[$i]
    $row = $i + 2
    $ws1.Cells.Item($row, 1).Value2  = [int]$s.StepNo
    $ws1.Cells.Item($row, 2).Value2  = "$($s.StepDescription)"
    $ws1.Cells.Item($row, 3).Value2  = "$($s.Page)"
    $ws1.Cells.Item($row, 4).Value2  = "$($s.Element)"
    $ws1.Cells.Item($row, 5).Value2  = "$($s.ElementText)"
    $ws1.Cells.Item($row, 6).Value2  = "$($s.ActionKeyword)"
    $ws1.Cells.Item($row, 7).Value2  = "$($s.Property)"
    $ws1.Cells.Item($row, 8).Value2  = "$($s.Condition)"
    $ws1.Cells.Item($row, 9).Value2  = "$($s.TableColumnNames)"
    $ws1.Cells.Item($row, 10).Value2 = "$($s.Values)"
    $ws1.Cells.Item($row, 11).Value2 = "$($s.DatasetColumnName)"
}

# ---------------------------------------------------------------------------
# Sheet 2 -- TestData
# ---------------------------------------------------------------------------
$ws2 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws1)
$ws2.Name = "TestData"

$dataHeaders = @(
    "CLINIC_NAME","CLINIC_LOCATION","APPOINTMENT_TYPE","APPOINTMENT_PRIORITY",
    "PATIENT_FORENAME","CITY","COUNTRY","COUNTRY_OF_BIRTH","NATIONALITY","ETHNICITY",
    "SERVICE_TYPE","REFERRAL_SOURCE","REFERRAL_PRIORITY","REFERRAL_TYPE",
    "WARD_NAME","INTENDED_MANAGEMENT"
)

for ($c = 0; $c -lt $dataHeaders.Count; $c++) {
    $cell = $ws2.Cells.Item(1, $c + 1)
    $cell.Value2 = $dataHeaders[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$sampleData = @(
    "General Medicine Clinic","Outpatient Clinic 1","New","Routine",
    "Test","London","United Kingdom","United Kingdom","British","White British",
    "General Medicine","GP","Routine","GP Referral",
    "Ward A","Elective"
)

for ($c = 0; $c -lt $sampleData.Count; $c++) {
    $ws2.Cells.Item(2, $c + 1).Value2 = $sampleData[$c]
}

# ---------------------------------------------------------------------------
# Sheet 3 -- ExecutionConfig
# ---------------------------------------------------------------------------
$ws3 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws2)
$ws3.Name = "ExecutionConfig"

$ws3.Cells.Item(1,1).Value2 = "Key"
$ws3.Cells.Item(1,2).Value2 = "Value"
$ws3.Cells.Item(1,1).Font.Bold = $true
$ws3.Cells.Item(1,2).Font.Bold = $true
$ws3.Cells.Item(1,1).Interior.Color = 13882323
$ws3.Cells.Item(1,2).Interior.Color = 13882323

$configData = @(
    @("Test Case ID",           "LSTP_DI_WF001"),
    @("Module",                 "DI (Digital Integration)"),
    @("Sub-Module",             "Globe Icon - DI Link - OP and IP Encounter Viewing"),
    @("Description",            "Covers clinic session booking with patient registration, OP and IP encounter viewing via Globe icon (Sample DI link) in inline and detached window modes, and IP bed booking from the OP context"),
    @("Complexity",             "High"),
    @("Priority",               "P1"),
    @("Estimated Duration",     "25-30 minutes"),
    @("Total Steps",            "116"),
    @("Total Pages",            "18"),
    @("Total Elements",         "35"),
    @("Author",                 "KDF Generator"),
    @("Created Date",           "06/05/2026"),
    @("Last Updated",           "06/05/2026"),
    @("Status",                 "Ready"),
    @("Prerequisites",          "Valid login credentials, Active clinic session available, Ward A IP bed available, Sample DI link configured in Lorenzo DI settings"),
    @("Test Data Variables",    "CLINIC_NAME,CLINIC_LOCATION,APPOINTMENT_TYPE,APPOINTMENT_PRIORITY,PATIENT_FORENAME,CITY,COUNTRY,COUNTRY_OF_BIRTH,NATIONALITY,ETHNICITY,SERVICE_TYPE,REFERRAL_SOURCE,REFERRAL_PRIORITY,REFERRAL_TYPE,WARD_NAME,INTENDED_MANAGEMENT"),
    @("Assertions",             "5"),
    @("Pages Used",             "pageLogin,pageHome,page..,pagePatientSearch,pagePatientBasicSearch,pageRegRegistration,pageRegConfirmationpopup,pageCBookAppointment,pageReferralDetails,page,LORENZO,pageLORENZO,pageEPRView,pageInpatient,pageIPSMBasicSearchCriteria,pageBookWardappointment,pageIPPegboardCurrentView,pagePatientBasicSearch"),
    @("Workflows Covered",      "Login + Clinic Session Search + OP Booking (Patient Registration + Appointment) + DI Globe Link (OP inline) + DI Globe Link (OP detached) + View EPR Referral Tab + DI Globe Link (EPR inline) + DI Globe Link (EPR detached) + IP Booking + Booked IP Ward + DI Globe Link (IP inline) + DI Globe Link (IP detached) + Logout")
)

for ($i = 0; $i -lt $configData.Count; $i++) {
    $row = $i + 2
    $ws3.Cells.Item($row, 1).Value2 = "$($configData[$i][0])"
    $ws3.Cells.Item($row, 2).Value2 = "$($configData[$i][1])"
}

# ---------------------------------------------------------------------------
# Sheet 4 -- TestValues
# ---------------------------------------------------------------------------
$ws4 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws3)
$ws4.Name = "TestValues"

$tvHeaders = @("VariableName","Description","SampleValue")
for ($c = 0; $c -lt $tvHeaders.Count; $c++) {
    $cell = $ws4.Cells.Item(1, $c + 1)
    $cell.Value2 = $tvHeaders[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$testValues = @(
    @("_RandomSurname", "Auto-generated surname for new patient",  "AutoGenerated"),
    @("_NHSNUMBER",     "NHS Number captured from registration",   "Captured at runtime"),
    @("_PASID",         "PAS ID of registered patient",            "Captured at runtime"),
    @("_USERNAME",      "Login username",                          "From config"),
    @("_PASSWORD",      "Login password",                          "From config")
)

for ($i = 0; $i -lt $testValues.Count; $i++) {
    $row = $i + 2
    $ws4.Cells.Item($row, 1).Value2 = $testValues[$i][0]
    $ws4.Cells.Item($row, 2).Value2 = $testValues[$i][1]
    $ws4.Cells.Item($row, 3).Value2 = $testValues[$i][2]
}

# ---------------------------------------------------------------------------
# Save and close
# ---------------------------------------------------------------------------
if (Test-Path $outFile) { Remove-Item $outFile -Force }
$wb.SaveAs($outFile, 51)
$wb.Close($false)
$xl.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null

Write-Host "Done: $outFile"

# Verification
$xl2 = New-Object -ComObject Excel.Application
$xl2.Visible = $false
$xl2.DisplayAlerts = $false
$wb2 = $xl2.Workbooks.Open($outFile)

Write-Host "`nSheet names:"
$sheetNames = $wb2.Sheets | ForEach-Object { $_.Name }
for ($i = 0; $i -lt $sheetNames.Count; $i++) {
    Write-Host ("  " + ($i+1) + " : " + $sheetNames[$i])
}

$ws = $wb2.Sheets.Item("TestExecution")
Write-Host "`nStepNo spot-checks:"
Write-Host ("  Row 2   (expect   1): " + $ws.Cells.Item(2,   1).Value2)
Write-Host ("  Row 117 (expect 116): " + $ws.Cells.Item(117, 1).Value2)

$wb2.Close($false)
$xl2.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl2) | Out-Null
