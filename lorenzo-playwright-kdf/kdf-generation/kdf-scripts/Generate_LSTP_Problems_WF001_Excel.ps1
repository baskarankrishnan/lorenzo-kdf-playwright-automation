# Generate_LSTP_Problems_WF001_Excel.ps1
# Generates LSTP_Problems_WF001.xlsx in excelFramework\testcases\Problems\

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_Problems_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\Problems"
$outFile   = Join-Path $outDir  "LSTP_Problems_WF001.xlsx"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$steps = Get-Content $jsonPath -Raw | ConvertFrom-Json

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Add()

# ── Sheet 1: TestExecution ──────────────────────────────────────────────────
$ws1 = $wb.Sheets.Item(1)
$ws1.Name = "TestExecution"

$headers = @("StepNo","StepDescription","Page","Element","ElementText",
             "ActionKeyword","Property","Condition","TableColumnNames","Values","DatasetColumnName")

for ($c = 1; $c -le $headers.Count; $c++) {
    $ws1.Cells.Item(1, $c).Value2 = $headers[$c - 1]
}

$hdrRange1 = $ws1.Range($ws1.Cells.Item(1,1), $ws1.Cells.Item(1, $headers.Count))
$hdrRange1.Interior.Color = 13882323
$hdrRange1.Font.Bold = $true

for ($i = 0; $i -lt $steps.Count; $i++) {
    $s   = $steps[$i]
    $row = $i + 2
    $ws1.Cells.Item($row,  1).Value2 = [int]$s.StepNo
    $ws1.Cells.Item($row,  2).Value2 = "$($s.StepDescription)"
    $ws1.Cells.Item($row,  3).Value2 = "$($s.Page)"
    $ws1.Cells.Item($row,  4).Value2 = "$($s.Element)"
    $ws1.Cells.Item($row,  5).Value2 = "$($s.ElementText)"
    $ws1.Cells.Item($row,  6).Value2 = "$($s.ActionKeyword)"
    $ws1.Cells.Item($row,  7).Value2 = "$($s.Property)"
    $ws1.Cells.Item($row,  8).Value2 = "$($s.Condition)"
    $ws1.Cells.Item($row,  9).Value2 = "$($s.TableColumnNames)"
    $ws1.Cells.Item($row, 10).Value2 = "$($s.Values)"
    $ws1.Cells.Item($row, 11).Value2 = "$($s.DatasetColumnName)"
}

$ws1.Columns.AutoFit() | Out-Null

# ── Sheet 2: TestData ───────────────────────────────────────────────────────
$ws2 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws1)
$ws2.Name = "TestData"

$dataHeaders = @(
    "FORENAME","POSTALCODE","CITY","COUNTRY","TELEPHONEHOME","TELEPHONEMOBILE","EMAIL",
    "PREFERENCETYPE","COUNTRYOFBIRTH","NATIONALITY","RELIGION","SEXUALORIENTATION","ETHNICITY",
    "PROCEDURE_SEARCH",
    "PROBLEM1_TYPE","PROBLEM1_NAME",
    "PROBLEM2_TYPE","PROBLEM2_NAME",
    "INACTIVE_STATUS","INACTIVE_REASON",
    "LINK_CARE_RECORD_TYPE",
    "STRIKEOUT_STATUS"
)

$sampleValues = @(
    "John","LS1 1AA","Leeds","United Kingdom","01234567890","07700900000","john.test@test.com",
    "No Preference","United Kingdom","British","Not stated","Not stated","British or Mixed British",
    "Appendicectomy",
    "Diagnosis","Hypertension",
    "Diagnosis","Asthma",
    "Inactive","Resolved",
    "Procedure",
    "Struck Out"
)

for ($c = 1; $c -le $dataHeaders.Count; $c++) {
    $ws2.Cells.Item(1, $c).Value2 = $dataHeaders[$c - 1]
    $ws2.Cells.Item(2, $c).Value2 = $sampleValues[$c - 1]
}

$hdrRange2 = $ws2.Range($ws2.Cells.Item(1,1), $ws2.Cells.Item(1, $dataHeaders.Count))
$hdrRange2.Interior.Color = 13882323
$hdrRange2.Font.Bold = $true
$ws2.Columns.AutoFit() | Out-Null

# ── Sheet 3: ExecutionConfig ────────────────────────────────────────────────
$ws3 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws2)
$ws3.Name = "ExecutionConfig"

$totalSteps    = $steps.Count
$totalPages    = ($steps | Where-Object { $_.Page -ne "" } | Select-Object -ExpandProperty Page | Sort-Object -Unique).Count
$totalElements = ($steps | Where-Object { $_.Element -ne "" } | Select-Object -ExpandProperty Element | Sort-Object -Unique).Count
$assertions    = ($steps | Where-Object { $_.ActionKeyword -eq "verifyProperty" }).Count
$pagesUsed     = ($steps | Where-Object { $_.Page -ne "" } | Select-Object -ExpandProperty Page | Sort-Object -Unique) -join ", "
$datasetCols   = ($steps | Where-Object { $_.DatasetColumnName -ne "" } | Select-Object -ExpandProperty DatasetColumnName | Sort-Object -Unique) -join ", "
$today         = (Get-Date).ToString("dd/MM/yyyy")

$configData = @(
    @("Test Case ID",           "LSTP_Problems_WF001"),
    @("Module",                 "Problems"),
    @("Sub-Module",             "Problem Lifecycle Management with Procedure Linking"),
    @("Description",            "End-to-end workflow covering patient registration, EPR navigation, procedure recording, problem creation, main problem designation, scope change, status management, procedure linking, and problem strikeout"),
    @("Complexity",             "Very High"),
    @("Priority",               "P1"),
    @("Estimated Duration",     "30-35 minutes"),
    @("Total Steps",            "$totalSteps"),
    @("Total Pages",            "$totalPages"),
    @("Total Elements",         "$totalElements"),
    @("Author",                 "KDF Generator"),
    @("Created Date",           $today),
    @("Last Updated",           $today),
    @("Status",                 "Ready"),
    @("Prerequisites",          "Lorenzo application accessible, valid clinical codes for problems and procedures, patient registration enabled"),
    @("Test Data Variables",    $datasetCols),
    @("Assertions",             "$assertions"),
    @("Pages Used",             $pagesUsed),
    @("Workflows Covered",      "Login + Patient Registration + NHS Number Capture + Find Record + EPR Navigation + Procedure Intervention Tab + Record Procedure + Health Issues Tab + Record Problem 1 + Record Problem 2 + Mark as Main Problem + Edit Encounter Scope + Inactive Status + Link Procedure + Strikeout Problem + Logout")
)

$ws3.Cells.Item(1,1).Value2 = "Key"
$ws3.Cells.Item(1,2).Value2 = "Value"
$hdrRange3 = $ws3.Range("A1:B1")
$hdrRange3.Interior.Color = 13882323
$hdrRange3.Font.Bold = $true

for ($i = 0; $i -lt $configData.Count; $i++) {
    $ws3.Cells.Item($i + 2, 1).Value2 = "$($configData[$i][0])"
    $ws3.Cells.Item($i + 2, 2).Value2 = "$($configData[$i][1])"
}

$ws3.Columns.AutoFit() | Out-Null

# ── Sheet 4: TestValues ─────────────────────────────────────────────────────
$ws4 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws3)
$ws4.Name = "TestValues"

$ws4.Cells.Item(1,1).Value2 = "VariableName"
$ws4.Cells.Item(1,2).Value2 = "Description"
$ws4.Cells.Item(1,3).Value2 = "SampleValue"
$hdrRange4 = $ws4.Range("A1:C1")
$hdrRange4.Interior.Color = 13882323
$hdrRange4.Font.Bold = $true

$testValues = @(
    @("_RandomSurname", "Auto-generated surname for patient registration", "AutoGenerated"),
    @("_NHSNUMBER",     "NHS Number captured from registration confirmation popup", "Captured at runtime"),
    @("_PASID",         "PAS ID of registered patient",                            "Captured at runtime"),
    @("_USERNAME",      "Login username",                                           "From config"),
    @("_PASSWORD",      "Login password",                                           "From config")
)

for ($i = 0; $i -lt $testValues.Count; $i++) {
    $ws4.Cells.Item($i + 2, 1).Value2 = "$($testValues[$i][0])"
    $ws4.Cells.Item($i + 2, 2).Value2 = "$($testValues[$i][1])"
    $ws4.Cells.Item($i + 2, 3).Value2 = "$($testValues[$i][2])"
}

$ws4.Columns.AutoFit() | Out-Null

# ── Save & Close ────────────────────────────────────────────────────────────
$wb.SaveAs($outFile, 51)
$wb.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host "Excel workbook created: $outFile"
