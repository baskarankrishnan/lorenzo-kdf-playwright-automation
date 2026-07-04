# Generate_LSTP_ePMA_WF001_Excel.ps1
# Generates the Excel workbook for LSTP_ePMA_WF001 from the KDF JSON script

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_ePMA_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\ePMA"
$outFile   = Join-Path $outDir "LSTP_ePMA_WF001.xlsx"

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
    $ws1.Cells.Item(1, $c).Value2     = $te_headers[$c-1]
    $ws1.Cells.Item(1, $c).Interior.Color = $headerColor
    $ws1.Cells.Item(1, $c).Font.Bold  = $boldTrue
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
    "FORENAME","POSTALCODE","CITY","COUNTRY","TELEPHONEHOME","TELEPHONEMOBILE","EMAIL",
    "PREFERENCETYPE","COUNTRYOFBIRTH","NATIONALITY","RELIGION","SEXUALORIENTATION","ETHNICITY",
    "SURNAME_SEARCH",
    "MED1_DRUG","MED1_ROUTE","MED1_DOSAGE_FORM","MED1_DOSE_TYPE","MED1_DOSE","MED1_UOM","MED1_FREQUENCY",
    "MED2_DRUG","MED2_ROUTE","MED2_DOSAGE_FORM","MED2_DOSE_TYPE","MED2_DOSE","MED2_UOM","MED2_FREQUENCY",
    "MED3_DRUG","MED3_ROUTE","MED3_DOSAGE_FORM","MED3_DOSE_TYPE","MED3_DOSE","MED3_UOM","MED3_FREQUENCY",
    "MED3_MOD_DOSE_TYPE","MED3_MOD_DOSE_MIN","MED3_MOD_DOSE_MAX","MED3_MOD_REASON",
    "CONFLICT_REASON","MED3_DOSE_RANGE_CHECK",
    "MED4_DRUG","MED4_ROUTE","MED4_DOSAGE_FORM","MED4_DOSE_TYPE","MED4_DOSE","MED4_UOM","MED4_FREQUENCY","MED4_DOSE_RANGE_CHECK",
    "ADMIN_DOSE",
    "OMIT_COMMENT","REINSTATE_REASON"
)

$td_sample = @(
    "John","L1 4JH","Liverpool","United Kingdom","01512345678","07712345678","john.epma@test.nhs.uk",
    "English","England","British","Not Stated","Not Stated","Not Stated",
    "ePMA",
    "paracetamol","Oral","Tablet","Normal","500","mg","Four times daily",
    "senna","Oral","Tablet","Normal","7.5","mg","Twice daily",
    "flucloxacillin","Oral","Capsule","Normal","500","mg","Four times daily",
    "Range","250","500","Dose Adjustment",
    "Clinically acceptable","Aware - accept",
    "sodium chloride 0.9%","Intravenous","Infusion","Normal","500","ml","Twice daily","Aware - accept",
    "500",
    "Patient refused medication","Patient consented to medication"
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
    @("Test Case ID",          "LSTP_ePMA_WF001"),
    @("Module",                "ePMA"),
    @("Sub-Module",            "Medication Clerking, Administration and Prescription Chart"),
    @("Description",           "End-to-end verification of ePMA module covering medication clerking for four medications, copy to inpatient prescription list with conflict resolution, administration recording, overview validation, and prescription chart omit and reinstate operations"),
    @("Complexity",            "Very High"),
    @("Priority",              "P1"),
    @("Estimated Duration",    "35-40 minutes"),
    @("Total Steps",           "206"),
    @("Total Pages",           "14"),
    @("Total Elements",        "76"),
    @("Author",                "KDF Generator"),
    @("Created Date",          $today),
    @("Last Updated",          $today),
    @("Status",                "Ready"),
    @("Prerequisites",         "Patient record does not exist, Lorenzo ePMA module is accessible, User has ePMA prescribing and administration role"),
    @("Test Data Variables",   "FORENAME, POSTALCODE, CITY, COUNTRY, TELEPHONEHOME, TELEPHONEMOBILE, EMAIL, PREFERENCETYPE, COUNTRYOFBIRTH, NATIONALITY, RELIGION, SEXUALORIENTATION, ETHNICITY, SURNAME_SEARCH, MED1_DRUG, MED1_ROUTE, MED1_DOSAGE_FORM, MED1_DOSE_TYPE, MED1_DOSE, MED1_UOM, MED1_FREQUENCY, MED2_DRUG, MED2_ROUTE, MED2_DOSAGE_FORM, MED2_DOSE_TYPE, MED2_DOSE, MED2_UOM, MED2_FREQUENCY, MED3_DRUG, MED3_ROUTE, MED3_DOSAGE_FORM, MED3_DOSE_TYPE, MED3_DOSE, MED3_UOM, MED3_FREQUENCY, MED3_MOD_DOSE_TYPE, MED3_MOD_DOSE_MIN, MED3_MOD_DOSE_MAX, MED3_MOD_REASON, CONFLICT_REASON, MED3_DOSE_RANGE_CHECK, MED4_DRUG, MED4_ROUTE, MED4_DOSAGE_FORM, MED4_DOSE_TYPE, MED4_DOSE, MED4_UOM, MED4_FREQUENCY, MED4_DOSE_RANGE_CHECK, ADMIN_DOSE, OMIT_COMMENT, REINSTATE_REASON"),
    @("Assertions",            "17"),
    @("Pages Used",            "pageLogin, pageHome, pageSearchPatient, pageRoadMapButtons, pageRegRegistration, pageRegConfirmationpopup, pagePatientSearchGrid, pageEPRView, pageMedicationClerkingSource, pagePrint Note, pagePrintdocument, page.., pageMedicationadministrationchart, PagePrescriptionchart"),
    @("Workflows Covered",     "Patient Registration + NHS Capture + Medication Clerking (4 Medications) + IP Prescription Copy and Conflict Resolution + Med3 Modification + Med4 Sodium Chloride Addition + Medication Administration Recording + Overview Validation + Prescription Chart Omit + Reinstate Dose + Final Medication Validation")
)

# Headers row
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
    @("_RandomSurname", "Auto-generated surname for patient registration",    "AutoGenerated"),
    @("_NHSNUMBER",     "NHS Number captured from registration confirmation popup", "Captured at runtime"),
    @("_PASID",         "PAS ID of the registered patient",                   "Captured at runtime"),
    @("_USERNAME",      "Login username from environment configuration",      "From config"),
    @("_PASSWORD",      "Login password from environment configuration",      "From config")
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
