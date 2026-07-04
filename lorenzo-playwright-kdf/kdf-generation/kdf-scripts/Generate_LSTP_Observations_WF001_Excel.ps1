# Generate_LSTP_Observations_WF001_Excel.ps1
# Generates LSTP_Observations_WF001.xlsx from the KDF JSON script

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$jsonPath  = Join-Path $scriptDir "LSTP_Observations_WF001.json"
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$outDir    = Join-Path $repoRoot "excelFramework\testcases\Observations"
$outFile   = Join-Path $outDir "LSTP_Observations_WF001.xlsx"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
if (Test-Path $outFile)        { Remove-Item $outFile -Force }

$steps = Get-Content $jsonPath -Raw | ConvertFrom-Json

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Add()

# ── Sheet 1 : TestExecution ──────────────────────────────────────────────────
$ws1 = $wb.Sheets.Item(1)
$ws1.Name = "TestExecution"

$headers = @("StepNo","StepDescription","Page","Element","ElementText",
             "ActionKeyword","Property","Condition","TableColumnNames","Values","DatasetColumnName")

for ($c = 0; $c -lt $headers.Count; $c++) {
    $cell = $ws1.Cells.Item(1, $c + 1)
    $cell.Value2 = $headers[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$row = 2
foreach ($s in $steps) {
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
    $row++
}

$ws1.Columns.AutoFit() | Out-Null

# ── Sheet 2 : TestData ───────────────────────────────────────────────────────
$ws2 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws1)
$ws2.Name = "TestData"

$datasetCols = @(
    "FORENAME","POSTALCODE","CITY","COUNTRY","TELEPHONEHOME","TELEPHONEMOBILE","EMAIL",
    "PREFERENCETYPE","COUNTRYOFBIRTH","NATIONALITY","RELIGION","SEXUALORIENTATION","ETHNICITY",
    "SERVICE_TYPE","REFERRAL_SOURCE","REFERRAL_PRIORITY","REFERRAL_TYPE",
    "ADMISSION_SOURCE","ADMISSION_TYPE","INTENDED_MANAGEMENT","WARD_NAME",
    "OBSERVATION_CHART",
    "OBS_O2_SAT","OBS_BP_SYSTOLIC","OBS_RHYTHM","OBS_SKIN_COLOR"
)

$sampleValues = @(
    "John","SW1A 1AA","London","United Kingdom","01234567890","07890123456","john.doe@example.com",
    "Letter","United Kingdom","British","Christian","Not stated","White British",
    "General Medicine","GP","Routine","Outpatient",
    "Emergency","Elective","Inpatient","Ward A",
    "NEWS2",
    "98","120","Regular","Normal"
)

for ($c = 0; $c -lt $datasetCols.Count; $c++) {
    $hCell = $ws2.Cells.Item(1, $c + 1)
    $hCell.Value2 = $datasetCols[$c]
    $hCell.Font.Bold = $true
    $hCell.Interior.Color = 13882323
    $ws2.Cells.Item(2, $c + 1).Value2 = $sampleValues[$c]
}

$ws2.Columns.AutoFit() | Out-Null

# ── Sheet 3 : ExecutionConfig ─────────────────────────────────────────────────
$ws3 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws2)
$ws3.Name = "ExecutionConfig"

$today = Get-Date -Format "dd/MM/yyyy"

$totalSteps     = $steps.Count
$uniquePages    = ($steps | Where-Object { $_.Page -ne "" } | Select-Object -ExpandProperty Page -Unique).Count
$uniqueElements = ($steps | Where-Object { $_.Element -ne "" } | Select-Object -ExpandProperty Element -Unique).Count
$assertions     = ($steps | Where-Object { $_.ActionKeyword -eq "verifyProperty" }).Count
$dsColsUsed     = ($steps | Where-Object { $_.DatasetColumnName -ne "" } | Select-Object -ExpandProperty DatasetColumnName -Unique) -join ", "
$pagesUsed      = ($steps | Where-Object { $_.Page -ne "" } | Select-Object -ExpandProperty Page -Unique) -join ", "

$configData = @(
    @("Test Case ID",        "LSTP_Observations_WF001"),
    @("Module",              "Observations"),
    @("Sub-Module",          "Clinical Observations Management"),
    @("Description",         "Validates navigation to the Observations EPR View, searching for a configured Observations chart via Manage Observations, entering clinical data and verifying saved results."),
    @("Complexity",          "High"),
    @("Priority",            "P1"),
    @("Estimated Duration",  "15-20 minutes"),
    @("Total Steps",         "$totalSteps"),
    @("Total Pages",         "$uniquePages"),
    @("Total Elements",      "$uniqueElements"),
    @("Author",              "KDF Generator"),
    @("Created Date",        $today),
    @("Last Updated",        $today),
    @("Status",              "Ready"),
    @("Prerequisites",       "Lorenzo application accessible, valid login credentials, patient registration enabled, Observations EPR tab available, NEWS2 chart template configured"),
    @("Test Data Variables", $dsColsUsed),
    @("Assertions",          "$assertions"),
    @("Pages Used",          $pagesUsed),
    @("Workflows Covered",   "Login + Patient Registration + Create Referral + IP Admission + Navigate Observations EPR View + Manage Observations + Search Chart + Start New Chart + Update Observation Data + Validate Data + Logout")
)

$ws3.Cells.Item(1,1).Value2 = "Key"
$ws3.Cells.Item(1,2).Value2 = "Value"
$ws3.Cells.Item(1,1).Font.Bold = $true
$ws3.Cells.Item(1,2).Font.Bold = $true
$ws3.Cells.Item(1,1).Interior.Color = 13882323
$ws3.Cells.Item(1,2).Interior.Color = 13882323

for ($i = 0; $i -lt $configData.Count; $i++) {
    $ws3.Cells.Item($i + 2, 1).Value2 = "$($configData[$i][0])"
    $ws3.Cells.Item($i + 2, 2).Value2 = "$($configData[$i][1])"
}

$ws3.Columns.AutoFit() | Out-Null

# ── Sheet 4 : TestValues ──────────────────────────────────────────────────────
$ws4 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws3)
$ws4.Name = "TestValues"

$tvHeaders = @("VariableName","Description","SampleValue")
for ($c = 0; $c -lt $tvHeaders.Count; $c++) {
    $hCell = $ws4.Cells.Item(1, $c + 1)
    $hCell.Value2 = $tvHeaders[$c]
    $hCell.Font.Bold = $true
    $hCell.Interior.Color = 13882323
}

$testValues = @(
    @("_RandomSurname", "Auto-generated surname for patient registration", "AutoGenerated"),
    @("_NHSNUMBER",     "Captured from registration popup",               "Captured at runtime"),
    @("_PASID",         "PAS ID of registered patient",                   "Captured at runtime"),
    @("_USERNAME",      "Login username",                                 "From config"),
    @("_PASSWORD",      "Login password",                                 "From config")
)

for ($i = 0; $i -lt $testValues.Count; $i++) {
    $ws4.Cells.Item($i + 2, 1).Value2 = $testValues[$i][0]
    $ws4.Cells.Item($i + 2, 2).Value2 = $testValues[$i][1]
    $ws4.Cells.Item($i + 2, 3).Value2 = $testValues[$i][2]
}

$ws4.Columns.AutoFit() | Out-Null

# ── Save ──────────────────────────────────────────────────────────────────────
$wb.SaveAs($outFile, 51)
$wb.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host "Done: $outFile"

# Verify
$verifyExcel = New-Object -ComObject Excel.Application
$verifyExcel.Visible = $false
$vwb = $verifyExcel.Workbooks.Open($outFile)

Write-Host "`nSheet names:"
for ($i = 1; $i -le $vwb.Sheets.Count; $i++) {
    Write-Host "  $i : $($vwb.Sheets.Item($i).Name)"
}

$vws1 = $vwb.Sheets.Item("TestExecution")
Write-Host "`nStepNo spot-checks:"
Write-Host "  Row 2   (expect   1): $($vws1.Cells.Item(2,1).Value2)"
Write-Host "  Row 106 (expect 105): $($vws1.Cells.Item(106,1).Value2)"

$vwb.Close($false)
$verifyExcel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($verifyExcel) | Out-Null
