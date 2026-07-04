# Generate_LSTP_Maternity_WF001_Excel.ps1
# Generates the Excel workbook for LSTP_Maternity_WF001 - Maternity

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jsonPath  = Join-Path $scriptDir "LSTP_Maternity_WF001.json"
$outDir    = Join-Path $repoRoot "excelFramework\testcases\Maternity"
$outFile   = Join-Path $outDir "LSTP_Maternity_WF001.xlsx"

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
    "FORENAME","CITY","COUNTRY","COUNTRY_OF_BIRTH","NATIONALITY","ETHNICITY",
    "REFERRAL_SOURCE","REFERRAL_PRIORITY","REFERRAL_TYPE",
    "INTENDED_MANAGEMENT","BOOKING_REFERRAL","BOOKING_PRIORITY",
    "ADMISSION_SOURCE","ADMISSION_TYPE","CARE_PROVIDER_ID",
    "EDD_BASIS","GRAVIDA","PREGNANCY_RISK","FIRST_CONTACT_TYPE",
    "LABOUR_ONSET_TYPE","PRESENTATION_BEFORE_DELIVERY",
    "INTENDED_DELIVERY_PLACE","INTRAPARTUM_CARE_START_PLACE",
    "ACTUAL_BIRTH_PLACE","DELIVERY_METHOD","BIRTH_OUTCOME",
    "BIRTH_WEIGHT","BABY_SEX","BABY_CARED_BY_MATERNITY"
)

for ($c = 0; $c -lt $datasetCols.Count; $c++) {
    $cell = $ws2.Cells.Item(1, $c + 1)
    $cell.Value2 = $datasetCols[$c]
    $cell.Font.Bold = $true
    $cell.Interior.Color = 13882323
}

$sampleValues = @(
    "Jane","London","United Kingdom","United Kingdom","British","White British",
    "GP Referral","Routine","New Referral",
    "Elective","Obstetrics Referral","Routine",
    "GP Referral","Elective","AUTUSER001",
    "Ultrasound scan","1","Low Risk","First contact",
    "Spontaneous","Cephalic",
    "Hospital","Hospital",
    "Hospital","Spontaneous vaginal delivery","Live birth",
    "3200","Female","Yes"
)

for ($c = 0; $c -lt $sampleValues.Count; $c++) {
    $ws2.Cells.Item(2, $c + 1).Value2 = "$($sampleValues[$c])"
}

$ws2.Columns.AutoFit() | Out-Null

# --- Sheet 3: ExecutionConfig ---
$ws3 = $wb.Sheets.Add([System.Reflection.Missing]::Value, $ws2)
$ws3.Name = "ExecutionConfig"

$configData = @(
    @("Test Case ID",          "LSTP_Maternity_WF001"),
    @("Module",                "Maternity"),
    @("Sub-Module",            "Maternity Inpatient Booking, Admission and EPR Workflow"),
    @("Description",           "End-to-end Maternity workflow covering female patient registration, Obstetrics referral creation, IP booking, ward admission, View EPR, Maternity EPR navigation, Antenatal current pregnancy details, Intrapartum labour and delivery with fetal record newborn details, and validation of mother and baby records."),
    @("Complexity",            "Very High"),
    @("Priority",              "P1"),
    @("Estimated Duration",    "30-40 minutes"),
    @("Total Steps",           "126"),
    @("Total Pages",           "22"),
    @("Total Elements",        "45"),
    @("Author",                "KDF Generator"),
    @("Created Date",          (Get-Date -Format "dd/MM/yyyy")),
    @("Last Updated",          (Get-Date -Format "dd/MM/yyyy")),
    @("Status",                "Ready"),
    @("Prerequisites",         "Available Maternity ward bed, valid login credentials, NHS spine connectivity, Obstetrics service configured"),
    @("Test Data Variables",   "FORENAME, CITY, COUNTRY, COUNTRY_OF_BIRTH, NATIONALITY, ETHNICITY, REFERRAL_SOURCE, REFERRAL_PRIORITY, REFERRAL_TYPE, INTENDED_MANAGEMENT, BOOKING_REFERRAL, BOOKING_PRIORITY, ADMISSION_SOURCE, ADMISSION_TYPE, CARE_PROVIDER_ID, EDD_BASIS, GRAVIDA, PREGNANCY_RISK, FIRST_CONTACT_TYPE, LABOUR_ONSET_TYPE, PRESENTATION_BEFORE_DELIVERY, INTENDED_DELIVERY_PLACE, INTRAPARTUM_CARE_START_PLACE, ACTUAL_BIRTH_PLACE, DELIVERY_METHOD, BIRTH_OUTCOME, BIRTH_WEIGHT, BABY_SEX, BABY_CARED_BY_MATERNITY"),
    @("Assertions",            "5"),
    @("Pages Used",            "pageLogin, pageHome, pagePatientBasicSearch, pagePatientSearch, pageRegRegistration, pageWarning - LORENZO, pageQuestion - LORENZO, pageRegConfirmationpopup, pageReferralEPRLinks, pageCreateReferral, pageEPRView, pageIPSMBasicSearchCriteria, pageBookWardappointment, pageIPPegboardCurrentView, pageInpatient, pagePatADMAdmission, pageAdmitIPAdmitRoad, pageAdmitIPAdmitRoadCPSFS, pageAdmitIPAdmitRoadCG, pageLORENZO, pageAssesment Details, pageAdditionalDetails, pageManagecurrentpregnancyrecordLORENZO, pageIntray, pageLabourdetails, pageLabour and delivery, pageDelivery details, pageManagelabouranddeliverysummary-LORENZO, pageNewborndetails, pageLorenzo"),
    @("Workflows Covered",     "Female Patient Registration + Obstetrics Referral Creation + IP Booking + Booked IP Ward Navigation + Admission + View EPR + Maternity EPR + Antenatal Current Pregnancy + Intrapartum Labour and Delivery + Fetal Record Newborn Details + Mother and Baby Validation + Logout")
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
