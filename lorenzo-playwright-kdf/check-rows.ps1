$f = 'C:\Users\bkrishnan6\ORBIS PAS UKI-LZO\lorenzo-playwright-kdf\excelFramework\testcases\IP\LSTP_IP_WF001.xlsx'
$xl = New-Object -COM 'Excel.Application'
$xl.Visible = $false
$wb = $xl.Workbooks.Open($f)
$ws = $wb.Sheets.Item(1)

Write-Host "=== Excel Rows 50-58 (Steps 50-56) ===" -ForegroundColor Cyan
For ($i=50; $i -le 58; $i++) {
    $val1 = $ws.Cells($i, 1).Value
    $val2 = $ws.Cells($i, 2).Value
    $val3 = $ws.Cells($i, 3).Value
    $val4 = $ws.Cells($i, 4).Value
    $val6 = $ws.Cells($i, 6).Value
    
    if ($val1 -or $val2) {
        Write-Host "Row $i | $val1 | $val6 | $val3.$val4 | $val2"
    }
}
$wb.Close()
$xl.Quit()
