$f = 'excelFramework/testcases/IP/LSTP_IP_WF001.xlsx'
$xl = New-Object -COM 'Excel.Application'
$xl.Visible = $false
$wb = $xl.Workbooks.Open((Resolve-Path $f))
$ws = $wb.Sheets.Item(1)

Write-Host "=== STEPS 50-55 ===" -ForegroundColor Cyan
For ($i=51; $i -le 56; $i++) {
    $step = $ws.Cells($i, 1).Value
    $desc = $ws.Cells($i, 2).Value
    $page = $ws.Cells($i, 3).Value
    $elem = $ws.Cells($i, 4).Value
    $action = $ws.Cells($i, 6).Value
    Write-Host "Row $i | Step $step | $action | $page.$elem"
    Write-Host "        $desc" -ForegroundColor Gray
}
$wb.Close()
$xl.Quit()
