# Verify Excel format compliance for all test cases

$excelPath = "C:\Users\bkrishnan6\ORBIS PAS UKI-LZO\lorenzo-playwright-kdf\excelFramework\testcases"

$testCases = @(
    @{Path="Inpatient\Ward_Patient_Complete_Lifecycle.xlsx"; ID="TC-009"; ExpectedSteps=102; ExpectedVars=32},
    @{Path="Patient Management\Patient_Registration_and_Demographics.xlsx"; ID="TC-010"; ExpectedSteps=101; ExpectedVars=27},
    @{Path="Referral\Referral_Complete_Lifecycle.xlsx"; ID="TC-011"; ExpectedSteps=84; ExpectedVars=26},
    @{Path="Clinic\Clinic_Appointment_Complete_Lifecycle.xlsx"; ID="TC-012"; ExpectedSteps=74; ExpectedVars=27},
    @{Path="Access Plan\Access_Plan_Complete_Lifecycle.xlsx"; ID="TC-013"; ExpectedSteps=95; ExpectedVars=27},
    @{Path="Emergency Department\Emergency_Department_Complete_Lifecycle.xlsx"; ID="TC-014"; ExpectedSteps=83; ExpectedVars=26},
    @{Path="MHA Management\MHA_Complete_Lifecycle.xlsx"; ID="TC-015"; ExpectedSteps=110; ExpectedVars=33},
    @{Path="Clinic Volume Management\Clinic_Volume_Management_Complete_Lifecycle.xlsx"; ID="TC-016"; ExpectedSteps=86; ExpectedVars=29},
    @{Path="Care Events\Care_Events_Complete_Lifecycle.xlsx"; ID="TC-017"; ExpectedSteps=81; ExpectedVars=24},
    @{Path="Day Care\DayCare_Appointment_Complete_Lifecycle.xlsx"; ID="TC-018"; ExpectedSteps=72; ExpectedVars=12},
    @{Path="Inpatient\Ward_Attendance_Status_Management.xlsx"; ID="TC-019"; ExpectedSteps=80; ExpectedVars=13}
)

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false

Write-Host "============================================"
Write-Host "EXCEL FORMAT VERIFICATION REPORT"
Write-Host "============================================"
Write-Host ""

$totalPass = 0
$totalFail = 0

foreach ($tc in $testCases) {
    $fullPath = Join-Path $excelPath $tc.Path
    
    try {
        $workbook = $excel.Workbooks.Open($fullPath)
        
        # Get sheet names
        $sheetNames = @()
        for ($i = 1; $i -le $workbook.Sheets.Count; $i++) {
            $sheetNames += $workbook.Sheets.Item($i).Name
        }
        
        # Check sheet order
        $sheet1 = $workbook.Sheets.Item(1)
        $sheet2 = $workbook.Sheets.Item(2)
        $sheet3 = $workbook.Sheets.Item(3)
        $sheet4 = $workbook.Sheets.Item(4)
        
        $s1Name = $sheet1.Name
        $s2Name = $sheet2.Name
        $s3Name = $sheet3.Name
        $s4Name = $sheet4.Name
        
        # Get row counts
        $s1Rows = $sheet1.UsedRange.Rows.Count - 1 # -1 for header
        $s2Rows = $sheet2.UsedRange.Rows.Count - 1 # -1 for header
        $s3Rows = $sheet3.UsedRange.Rows.Count - 1 # -1 for header
        $s4Rows = $sheet4.UsedRange.Rows.Count - 1 # -1 for header
        
        # Format check results
        $s1Check = if ($s1Name -eq "TestExecution" -and $s1Rows -eq $tc.ExpectedSteps) { "[PASS]" } else { "[FAIL]" }
        $s2Check = if ($s2Name -eq "TestData" -and $s2Rows -eq $tc.ExpectedVars) { "[PASS]" } else { "[FAIL]" }
        $s3Check = if ($s3Name -eq "TestValues") { "[PASS]" } else { "[FAIL]" }
        $s4Check = if ($s4Name -eq "ExecutionConfig") { "[PASS]" } else { "[FAIL]" }
        
        $overallPass = ($s1Check -eq "[PASS]") -and ($s2Check -eq "[PASS]") -and ($s3Check -eq "[PASS]") -and ($s4Check -eq "[PASS]")
        
        if ($overallPass) { $totalPass++ } else { $totalFail++ }
        
        Write-Host "[$($tc.ID)] - $(Split-Path -Leaf $tc.Path)"
        Write-Host "  Sheet 1: $s1Name | Rows: $s1Rows/$($tc.ExpectedSteps) | $s1Check"
        Write-Host "  Sheet 2: $s2Name | Rows: $s2Rows/$($tc.ExpectedVars) | $s2Check"
        Write-Host "  Sheet 3: $s3Name | $s3Check"
        Write-Host "  Sheet 4: $s4Name | $s4Check"
        Write-Host ""
        
        $workbook.Close($false)
    }
    catch {
        Write-Host "[$($tc.ID)] - ERROR: $($_.Exception.Message)"
        $totalFail++
        Write-Host ""
    }
}

$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host "============================================"
Write-Host "SUMMARY: $totalPass PASSED | $totalFail FAILED"
Write-Host "============================================"
