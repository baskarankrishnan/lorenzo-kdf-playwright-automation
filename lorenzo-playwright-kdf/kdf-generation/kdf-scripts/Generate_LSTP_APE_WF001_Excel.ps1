# Generate_LSTP_APE_WF001_Excel.ps1
# Generates the Excel workbook for LSTP_APE_WF001 from the KDF JSON script

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_APE_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\APE"
$outFile   = Join-Path $outDir "LSTP_APE_WF001.xlsx"

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
    "FORENAME","POSTALCODE","CITY","COUNTRY","TELEPHONEHOME","TELEPHONEMOBILE","EMAIL",
    "PREFERENCETYPE","COUNTRYOFBIRTH","NATIONALITY","RELIGION","SEXUALORIENTATION","ETHNICITY",
    "REFERRAL_SERVICE_TYPE","REFERRAL_SOURCE","REFERRAL_PRIORITY","REFERRAL_TYPE","REFERRED_TO_TYPE",
    "APE_PLAN_TYPE","APE_SPECIALTY","APE_TREATMENT_FUNCTION","APE_PRIORITY","APE_ADMIN_CATEGORY",
    "APE_ELECTIVE_ADMISSION_TYPE","APE_INTENDED_MANAGEMENT","APE_GUARANTEED_DATE","APE_OVERRIDE_REASON",
    "MODIFY1_ELECTIVE_ADMISSION_TYPE","MODIFY1_INTENDED_MANAGEMENT",
    "MODIFY2_ELECTIVE_ADMISSION_TYPE","MODIFY2_INTENDED_MANAGEMENT",
    "TRANSFER1_REASON","TRANSFER1_REQUESTED_BY",
    "TRANSFER2_REASON","TRANSFER2_REQUESTED_BY",
    "COPY_GUARANTEED_DATE","COPY_OVERRIDE_REASON",
    "OFFER_NONADV_DISCHARGE_DATE","OFFER_NONADV_SEARCH_FOR","OFFER_NONADV_EXPECTED_LOS",
    "OFFER_ADV_SPECIALITY","OFFER_ADV_TREATMENT_FUNCTION"
)

$td_sample = @(
    "John","SW1A 1AA","London","United Kingdom","02012345678","07712345678","john.ape@test.nhs.uk",
    "English","England","British","Not Stated","Not Stated","Not Stated",
    "Elective Inpatient","GP Referral","Routine","Elective","Consultant",
    "Inpatient","General Surgery","General Surgery","Routine","NHS","Elective",
    "Day Case","01/06/2026","Clinical need",
    "Elective","Day Case",
    "Elective","Inpatient",
    "Clinical Need","Patient",
    "Clinical Need","Patient",
    "01/07/2026","Clinical need",
    "01/08/2026","Inpatient","2",
    "General Surgery","General Surgery"
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
    @("Test Case ID",          "LSTP_APE_WF001"),
    @("Module",                "APE"),
    @("Sub-Module",            "Access Plan Entry Lifecycle Management"),
    @("Description",           "End-to-end verification of Access Plan Entry module covering patient registration with referral, creation, two modifications, two transfers, copy, close, Manage Offer Non-Advance (TCI) and Manage Offer Advance (ward appointment) operations"),
    @("Complexity",            "Very High"),
    @("Priority",              "P1"),
    @("Estimated Duration",    "35-40 minutes"),
    @("Total Steps",           "178"),
    @("Total Pages",           "22"),
    @("Total Elements",        "55"),
    @("Author",                "KDF Generator"),
    @("Created Date",          $today),
    @("Last Updated",          $today),
    @("Status",                "Ready"),
    @("Prerequisites",         "Patient record does not exist, Lorenzo Access Planning module is accessible, User has Access Planning prescribing and offer management role, Referral service type and ward availability configured"),
    @("Test Data Variables",   "FORENAME, POSTALCODE, CITY, COUNTRY, TELEPHONEHOME, TELEPHONEMOBILE, EMAIL, PREFERENCETYPE, COUNTRYOFBIRTH, NATIONALITY, RELIGION, SEXUALORIENTATION, ETHNICITY, REFERRAL_SERVICE_TYPE, REFERRAL_SOURCE, REFERRAL_PRIORITY, REFERRAL_TYPE, REFERRED_TO_TYPE, APE_PLAN_TYPE, APE_SPECIALTY, APE_TREATMENT_FUNCTION, APE_PRIORITY, APE_ADMIN_CATEGORY, APE_ELECTIVE_ADMISSION_TYPE, APE_INTENDED_MANAGEMENT, APE_GUARANTEED_DATE, APE_OVERRIDE_REASON, MODIFY1_ELECTIVE_ADMISSION_TYPE, MODIFY1_INTENDED_MANAGEMENT, MODIFY2_ELECTIVE_ADMISSION_TYPE, MODIFY2_INTENDED_MANAGEMENT, TRANSFER1_REASON, TRANSFER1_REQUESTED_BY, TRANSFER2_REASON, TRANSFER2_REQUESTED_BY, COPY_GUARANTEED_DATE, COPY_OVERRIDE_REASON, OFFER_NONADV_DISCHARGE_DATE, OFFER_NONADV_SEARCH_FOR, OFFER_NONADV_EXPECTED_LOS, OFFER_ADV_SPECIALITY, OFFER_ADV_TREATMENT_FUNCTION"),
    @("Assertions",            "9"),
    @("Pages Used",            "pageLogin, pageHome, pageSearchPatient, pageRoadMapButtons, pagePatientSearchResult, pageRegRegistration, pageRegConfirmationpopup, pagePatientBasicSearch, pagePatientSearchGrid, pageEPRView, pageCreateReferral, pageAdditionaloptionsRef, pageAppAPCreapeSourceSelection, pageAccess Plan Details, pageappAPCreapeResourceMonitoring, pageLorenzo, PageModifyAccessPlanEntry, PageAccessPlanDetails, pageTransferAccessPlanEntry, pageCopyaccessplanentry, pageCopyAccessPlanEntry, pageappAPCreOfferTCIBasicSrchCriteria, pageSearchResults, pageCreatetocomeinoffer, pageManageoffer, pageFmFindBook, PageFindbooking, PageWardAppoinment"),
    @("Workflows Covered",     "Patient Registration + NHS Capture + Create Referral + Access Planning EPR + Create Access Plan Entry + Modify Access Plan Entry (x2) + Transfer Access Plan Entry (x2) + Copy Access Plan Entry + Close Access Plan Entry + Manage Offer Non-Advance (TCI) + Manage Offer Advance (Ward Appointment)")
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
    @("_RandomSurname", "Auto-generated surname for patient registration",         "AutoGenerated"),
    @("_NHSNUMBER",     "NHS Number captured from registration confirmation popup", "Captured at runtime"),
    @("_PASID",         "PAS ID of the registered patient",                         "Captured at runtime"),
    @("_USERNAME",      "Login username from environment configuration",             "From config"),
    @("_PASSWORD",      "Login password from environment configuration",             "From config")
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
