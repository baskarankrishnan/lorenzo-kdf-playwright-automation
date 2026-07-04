# Comprehensive Excel File Verification Script
# Checks all 11 test case files for format compliance and data consistency

$testcasesPath = "C:\Users\bkrishnan6\ORBIS PAS UKI-LZO\lorenzo-playwright-kdf\excelFramework\testcases"

$testCases = @(
    @{ID="009"; Name="Ward_Patient_Complete_Lifecycle"; Path="Inpatient"; ExpSteps=102; ExpVars=32},
    @{ID="010"; Name="Patient_Registration_and_Demographics"; Path="Patient Management"; ExpSteps=101; ExpVars=27},
    @{ID="011"; Name="Referral_Complete_Lifecycle"; Path="Referral"; ExpSteps=84; ExpVars=26},
    @{ID="012"; Name="Clinic_Appointment_Complete_Lifecycle"; Path="Clinic"; ExpSteps=74; ExpVars=27},
    @{ID="013"; Name="Access_Plan_Complete_Lifecycle"; Path="Access Plan"; ExpSteps=95; ExpVars=27},
    @{ID="014"; Name="Emergency_Department_Complete_Lifecycle"; Path="Emergency Department"; ExpSteps=83; ExpVars=26},
    @{ID="015"; Name="MHA_Complete_Lifecycle"; Path="MHA Management"; ExpSteps=110; ExpVars=33},
    @{ID="016"; Name="Clinic_Volume_Management_Complete_Lifecycle"; Path="Clinic Volume Management"; ExpSteps=86; ExpVars=29},
    @{ID="017"; Name="Care_Events_Complete_Lifecycle"; Path="Care Events"; ExpSteps=81; ExpVars=24},
    @{ID="018"; Name="DayCare_Appointment_Complete_Lifecycle"; Path="Day Care"; ExpSteps=72; ExpVars=12},
    @{ID="019"; Name="Ward_Attendance_Status_Management"; Path="Inpatient"; ExpSteps=80; ExpVars=13}
)

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "    COMPREHENSIVE VERIFICATION: ALL 11 EXCEL TEST CASE FILES" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$complianceMatrix = @()
$totalCompliant = 0
$totalIssues = 0

foreach ($tc in $testCases) {
    $filePath = Join-Path (Join-Path $testcasesPath $tc.Path) "$($tc.Name).xlsx"
    
    Write-Host "TC-$($tc.ID): $($tc.Name)" -ForegroundColor Yellow
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  ❌ FILE NOT FOUND" -ForegroundColor Red
        $totalIssues++
        $complianceMatrix += @{
            TC = "TC-$($tc.ID)"
            Sheets = "❌"
            TestExecution = "❌ Missing"
            TestData = "❌ Missing"
            ExecutionConfig = "❌ Missing"
            TestValues = "❌ Missing"
            Status = "FILE_MISSING"
        }
        continue
    }
    
    try {
        $workbook = $excel.Workbooks.Open($filePath)
        $sheetCount = $workbook.Sheets.Count
        
        $sheetsOK = "✅"
        if ($sheetCount -ne 4) {
            $sheetsOK = "❌ ($sheetCount)"
            $totalIssues++
        }
        
        # Sheet 1: TestExecution
        $sheet1 = $workbook.Sheets.Item(1)
        $sheet1Name = $sheet1.Name
        $sheet1Rows = $sheet1.UsedRange.Rows.Count - 1  # Exclude header
        $sheet1OK = "✅ ($sheet1Rows steps)"
        if ($sheet1Name -ne "TestExecution" -or $sheet1Rows -ne $tc.ExpSteps) {
            $sheet1OK = "❌ Name: $sheet1Name, Rows: $sheet1Rows (Exp: $($tc.ExpSteps))"
            $totalIssues++
        }
        
        # Sheet 2: TestData
        $sheet2 = $workbook.Sheets.Item(2)
        $sheet2Name = $sheet2.Name
        $sheet2Rows = $sheet2.UsedRange.Rows.Count - 1  # Exclude header
        $sheet2OK = "✅ ($sheet2Rows vars)"
        if ($sheet2Name -ne "TestData" -or $sheet2Rows -ne $tc.ExpVars) {
            $sheet2OK = "❌ Name: $sheet2Name, Rows: $sheet2Rows (Exp: $($tc.ExpVars))"
            $totalIssues++
        }
        
        # Sheet 3: ExecutionConfig
        $sheet3 = $workbook.Sheets.Item(3)
        $sheet3Name = $sheet3.Name
        $sheet3OK = "✅ Present"
        if ($sheet3Name -ne "ExecutionConfig") {
            $sheet3OK = "❌ Name: $sheet3Name"
            $totalIssues++
        }
        
        # Sheet 4: TestValues
        $sheet4 = $workbook.Sheets.Item(4)
        $sheet4Name = $sheet4.Name
        $sheet4Rows = $sheet4.UsedRange.Rows.Count - 1  # Exclude header
        $sheet4OK = "✅ ($sheet4Rows rows)"
        if ($sheet4Name -ne "TestValues") {
            $sheet4OK = "❌ Name: $sheet4Name"
            $totalIssues++
        }
        
        Write-Host "  Sheets: $sheetsOK" -ForegroundColor White
        Write-Host "  Sheet1: $sheet1OK" -ForegroundColor White
        Write-Host "  Sheet2: $sheet2OK" -ForegroundColor White
        Write-Host "  Sheet3: $sheet3OK" -ForegroundColor White
        Write-Host "  Sheet4: $sheet4OK" -ForegroundColor White
        
        $workbook.Close()
        
        if ($sheetsOK -eq "✅" -and $sheet1OK -like "✅*" -and $sheet2OK -like "✅*" -and $sheet3OK -eq "✅ Present" -and $sheet4OK -like "✅*") {
            $status = "✅ COMPLIANT"
            $totalCompliant++
        } else {
            $status = "⚠️ ISSUES"
        }
        
        Write-Host "  Status: $status" -ForegroundColor White
        
        $complianceMatrix += @{
            TC = "TC-$($tc.ID)"
            Sheets = $sheetsOK
            TestExecution = $sheet1OK
            TestData = $sheet2OK
            ExecutionConfig = $sheet3OK
            TestValues = $sheet4OK
            Status = $status
        }
        
    } catch {
        Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $totalIssues++
        $complianceMatrix += @{
            TC = "TC-$($tc.ID)"
            Sheets = "❌"
            TestExecution = "❌ Error"
            TestData = "❌ Error"
            ExecutionConfig = "❌ Error"
            TestValues = "❌ Error"
            Status = "ERROR"
        }
    }
    
    Write-Host ""
}

$excel.Quit()

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "                              SUMMARY REPORT" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Files Checked: 11" -ForegroundColor White
Write-Host "Compliant: $totalCompliant / 11" -ForegroundColor Green
Write-Host "Issues Found: $totalIssues" -ForegroundColor $(if ($totalIssues -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($totalIssues -eq 0) {
    Write-Host "✅ ALL 11 TEST CASES: 100% COMPLIANT WITH STANDARDIZED FORMAT" -ForegroundColor Green
} else {
    Write-Host "⚠️  $totalIssues COMPLIANCE ISSUES DETECTED" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "                        DETAILED COMPLIANCE MATRIX" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

$complianceMatrix | Format-Table -Property TC, Sheets, TestExecution, TestData, ExecutionConfig, TestValues, Status -AutoSize
