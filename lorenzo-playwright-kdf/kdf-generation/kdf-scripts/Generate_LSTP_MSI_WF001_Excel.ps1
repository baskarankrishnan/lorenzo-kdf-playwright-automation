# ============================================================
# Generate_LSTP_MSI_WF001_Excel.ps1
# Generates Excel workbook for LSTP_MSI_WF001
# MSI (Managed Service Integration) - Temporary Registration,
# Full Registration, Referral, Clinical Note, Document/Letter
# ============================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_MSI_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\MSI"
$outFile   = Join-Path $outDir "LSTP_MSI_WF001.xlsx"

# Load JSON
$steps = Get-Content $jsonPath -Raw | ConvertFrom-Json

# Create output directory if needed
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

# Remove existing file
if (Test-Path $outFile) { Remove-Item $outFile -Force }

# Launch Excel
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

$wb = $xl.Workbooks.Add()

# ── Sheet 1: TestExecution ──────────────────────────────────
$ws1 = $wb.Sheets.Item(1)
$ws1.Name = "TestExecution"

$headers = @("StepNo","StepDescription","Page","Element","ElementText",
             "ActionKeyword","Property","Condition","TableColumnNames",
             "Values","DatasetColumnName")

for ($c = 0; $c -lt $headers.Count; $c++) {
    $ws1.Cells.Item(1, $c + 1).Value2 = $headers[$c]
}

# Header styling
$hdr1 = $ws1.Range("A1:K1")
$hdr1.Interior.Color = 13882323
$hdr1.Font.Bold = $true

# Data rows
for ($i = 0; $i -lt $steps.Count; $i++) {
    $r = $i + 2
    $s = $steps[$i]
    $ws1.Cells.Item($r,  1).Value2 = [int]$s.StepNo
    $ws1.Cells.Item($r,  2).Value2 = "$($s.StepDescription)"
    $ws1.Cells.Item($r,  3).Value2 = "$($s.Page)"
    $ws1.Cells.Item($r,  4).Value2 = "$($s.Element)"
    $ws1.Cells.Item($r,  5).Value2 = "$($s.ElementText)"
    $ws1.Cells.Item($r,  6).Value2 = "$($s.ActionKeyword)"
    $ws1.Cells.Item($r,  7).Value2 = "$($s.Property)"
    $ws1.Cells.Item($r,  8).Value2 = "$($s.Condition)"
    $ws1.Cells.Item($r,  9).Value2 = "$($s.TableColumnNames)"
    $ws1.Cells.Item($r, 10).Value2 = "$($s.Values)"
    $ws1.Cells.Item($r, 11).Value2 = "$($s.DatasetColumnName)"
}

$ws1.Columns.AutoFit() | Out-Null

# ── Sheet 2: TestData ───────────────────────────────────────
$ws2 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws1)
$ws2.Name = "TestData"

$tdHeaders = @("FORENAME","CITY","COUNTRY","COUNTRY_OF_BIRTH","NATIONALITY",
               "ETHNICITY","SERVICE_TYPE","REFERRAL_SOURCE","REFERRAL_PRIORITY",
               "REFERRAL_TYPE","NOTE_TEMPLATE","LETTER_TEMPLATE")

for ($c = 0; $c -lt $tdHeaders.Count; $c++) {
    $ws2.Cells.Item(1, $c + 1).Value2 = $tdHeaders[$c]
}

# Sample values row
$sampleValues = @("John","Manchester","United Kingdom","United Kingdom","British",
                  "White British","Outpatient","GP Referral","Urgent","Referral",
                  "General Assessment Note","Discharge Summary Letter")

for ($c = 0; $c -lt $sampleValues.Count; $c++) {
    $ws2.Cells.Item(2, $c + 1).Value2 = $sampleValues[$c]
}

$hdr2 = $ws2.Range($ws2.Cells.Item(1,1), $ws2.Cells.Item(1, $tdHeaders.Count))
$hdr2.Interior.Color = 13882323
$hdr2.Font.Bold = $true
$ws2.Columns.AutoFit() | Out-Null

# ── Sheet 3: ExecutionConfig ────────────────────────────────
$ws3 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws2)
$ws3.Name = "ExecutionConfig"

$ws3.Cells.Item(1,1).Value2 = "Key"
$ws3.Cells.Item(1,2).Value2 = "Value"

$configData = @(
    @("Test Case ID",         "LSTP_MSI_WF001"),
    @("Module",               "MSI (Managed Service Integration)"),
    @("Sub-Module",           "Temporary Registration, Full Registration, Referral, Clinical Note, Document/Letter"),
    @("Description",          "End-to-end MSI workflow covering temporary patient registration, convert to full registration, referral acceptance, clinical note creation with print preview, and document/letter creation with print preview"),
    @("Complexity",           "High"),
    @("Priority",             "P1"),
    @("Estimated Duration",   "25-30 minutes"),
    @("Total Steps",          "112"),
    @("Total Pages",          "19"),
    @("Total Elements",       "57"),
    @("Author",               "KDF Generator"),
    @("Created Date",         "06/05/2026"),
    @("Last Updated",         "06/05/2026"),
    @("Status",               "Ready"),
    @("Prerequisites",        "Valid login credentials, Patient registration module enabled, Referral module enabled, Clinical Note module enabled, Documents/Letters module enabled"),
    @("Test Data Variables",  "FORENAME, CITY, COUNTRY, COUNTRY_OF_BIRTH, NATIONALITY, ETHNICITY, SERVICE_TYPE, REFERRAL_SOURCE, REFERRAL_PRIORITY, REFERRAL_TYPE, NOTE_TEMPLATE, LETTER_TEMPLATE"),
    @("Assertions",           "12"),
    @("Pages Used",           "pageLogin, pageHome, pageSearchPatient, pageRoadMapButtons, pageRegRegistration, pageRegistrationtemporary, pageRegConfirmationpopup, pageEPRView, pagePatientregistration, pageConverttofullregistration, pageReferralDetails, pageLORENZO, pageManageReferral, pageCreatenote, pageClinicalnoteListandDetails, pagePrintnote, pageSearch And Choose Template, pageCreate document - LORENZO, pagePrintdocument"),
    @("Workflows Covered",    "Login + Temporary Registration + Full Registration Conversion + Referral Accept + Clinical Note with Print Preview + Document/Letter with Print Preview + Logout")
)

for ($i = 0; $i -lt $configData.Count; $i++) {
    $r = $i + 2
    $ws3.Cells.Item($r, 1).Value2 = "$($configData[$i][0])"
    $ws3.Cells.Item($r, 2).Value2 = "$($configData[$i][1])"
}

$hdr3 = $ws3.Range("A1:B1")
$hdr3.Interior.Color = 13882323
$hdr3.Font.Bold = $true
$ws3.Columns.AutoFit() | Out-Null

# ── Sheet 4: TestValues ─────────────────────────────────────
$ws4 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws3)
$ws4.Name = "TestValues"

$ws4.Cells.Item(1,1).Value2 = "VariableName"
$ws4.Cells.Item(1,2).Value2 = "Description"
$ws4.Cells.Item(1,3).Value2 = "SampleValue"

$tvData = @(
    @("_RandomSurname", "Auto-generated surname for temporary patient",   "AutoGenerated"),
    @("_NHSNUMBER",     "NHS Number captured from registration popup",     "Captured at runtime"),
    @("_PASID",         "PAS ID captured from full registration confirmation", "Captured at runtime"),
    @("_USERNAME",      "Login username",                                  "From config"),
    @("_PASSWORD",      "Login password",                                  "From config")
)

for ($i = 0; $i -lt $tvData.Count; $i++) {
    $r = $i + 2
    $ws4.Cells.Item($r, 1).Value2 = "$($tvData[$i][0])"
    $ws4.Cells.Item($r, 2).Value2 = "$($tvData[$i][1])"
    $ws4.Cells.Item($r, 3).Value2 = "$($tvData[$i][2])"
}

$hdr4 = $ws4.Range("A1:C1")
$hdr4.Interior.Color = 13882323
$hdr4.Font.Bold = $true
$ws4.Columns.AutoFit() | Out-Null

# ── Save and close ──────────────────────────────────────────
$wb.SaveAs($outFile, 51)   # 51 = xlOpenXMLWorkbook
$wb.Close($false)
$xl.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null

Write-Host "Excel workbook created: $outFile"
Write-Host "Total steps written: $($steps.Count)"
