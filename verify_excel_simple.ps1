# Simplified Excel File Verification Script

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

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$report = @()

foreach ($tc in $testCases) {
    $filePath = Join-Path (Join-Path $testcasesPath $tc.Path) "$($tc.Name).xlsx"
    
    if (-not (Test-Path $filePath)) {
        $report += "TC-$($tc.ID): FILE_MISSING"
        continue
    }
    
    try {
        $workbook = $excel.Workbooks.Open($filePath)
        
        # Check sheets
        $sheets = $workbook.Sheets.Count
        $sheet1Name = $workbook.Sheets.Item(1).Name
        $sheet1Rows = $workbook.Sheets.Item(1).UsedRange.Rows.Count - 1
        $sheet2Name = $workbook.Sheets.Item(2).Name
        $sheet2Rows = $workbook.Sheets.Item(2).UsedRange.Rows.Count - 1
        $sheet3Name = $workbook.Sheets.Item(3).Name
        $sheet4Name = $workbook.Sheets.Item(4).Name
        
        $workbook.Close()
        
        $sheet1Status = if ($sheet1Name -eq "TestExecution" -and $sheet1Rows -eq $tc.ExpSteps) { "OK" } else { "MISMATCH" }
        $sheet2Status = if ($sheet2Name -eq "TestData" -and $sheet2Rows -eq $tc.ExpVars) { "OK" } else { "MISMATCH" }
        $sheet3Status = if ($sheet3Name -eq "ExecutionConfig") { "OK" } else { "MISMATCH" }
        $sheet4Status = if ($sheet4Name -eq "TestValues") { "OK" } else { "MISMATCH" }
        
        $line = "TC-$($tc.ID) | Sheets:$sheets | S1:$sheet1Status($sheet1Rows/$($tc.ExpSteps)) | S2:$sheet2Status($sheet2Rows/$($tc.ExpVars)) | S3:$sheet3Status | S4:$sheet4Status"
        $report += $line
        
    } catch {
        $report += "TC-$($tc.ID): ERROR - $($_.Exception.Message)"
    }
}

$excel.Quit()

$report | Out-File -FilePath "C:\Users\bkrishnan6\ORBIS PAS UKI-LZO\verification_report.txt" -Encoding UTF8

# Display results
$report | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "Report saved to: C:\Users\bkrishnan6\ORBIS PAS UKI-LZO\verification_report.txt"
