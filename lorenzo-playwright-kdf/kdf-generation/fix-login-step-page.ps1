# Fix: the "Click Login" step (Element=btn_Login) is wrongly tagged Page=pageHome.
# btn_Login (Submit) lives on the LOGIN page, so it must be Page=pageLogin.
# This edits ONLY that one cell per file, in-place, via Excel COM to preserve all formatting.
# Credentials in steps 1-2 (Excel Values) are left untouched.

$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..\excelFramework\testcases'
$root = (Resolve-Path $root).Path
$backupRoot = Join-Path $PSScriptRoot ('..\excelFramework\_backup_loginfix_' + (Get-Date -Format 'yyyyMMddHHmmss'))

$files = Get-ChildItem -Path $root -Recurse -Filter *.xlsx |
    Where-Object { $_.Name -notlike '~$*' -and $_.FullName -notlike '*_backup_*' }

Write-Host ("Scanning " + $files.Count + " workbook(s)...")

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$changed = @()
try {
    foreach ($f in $files) {
        $wb = $excel.Workbooks.Open($f.FullName)
        try {
            # Find the TestExecution sheet
            $ws = $null
            foreach ($s in $wb.Worksheets) { if ($s.Name -match 'testexec') { $ws = $s; break } }
            if (-not $ws) { $ws = $wb.Worksheets.Item(1) }

            $used = $ws.UsedRange
            $rowCount = $used.Rows.Count
            $colCount = $used.Columns.Count

            # Locate Page and Element columns from header row (row 1)
            $pageCol = 0; $elemCol = 0
            for ($c = 1; $c -le $colCount; $c++) {
                $h = [string]$ws.Cells.Item(1, $c).Value2
                if ($h) {
                    $ht = $h.Trim().ToLower()
                    if ($ht -eq 'page') { $pageCol = $c }
                    elseif ($ht -eq 'element') { $elemCol = $c }
                }
            }
            if ($pageCol -eq 0 -or $elemCol -eq 0) { Write-Host ("  SKIP (no Page/Element header): " + $f.Name); continue }

            $fileChanged = $false
            for ($r = 2; $r -le $rowCount; $r++) {
                $elem = [string]$ws.Cells.Item($r, $elemCol).Value2
                $page = [string]$ws.Cells.Item($r, $pageCol).Value2
                if ($elem -and $page -and $elem.Trim() -eq 'btn_Login' -and $page.Trim() -eq 'pageHome') {
                    $ws.Cells.Item($r, $pageCol).Value2 = 'pageLogin'
                    $fileChanged = $true
                    Write-Host ("  " + $f.Name + " : row " + $r + " Page pageHome -> pageLogin")
                }
            }

            if ($fileChanged) {
                # Back up original before saving
                $rel = $f.FullName.Substring($root.Length).TrimStart('\')
                $bak = Join-Path $backupRoot $rel
                New-Item -ItemType Directory -Force -Path (Split-Path $bak) | Out-Null
                Copy-Item $f.FullName $bak -Force
                $wb.Save()
                $changed += $f.FullName
            }
        }
        finally {
            $wb.Close($false)
        }
    }
}
finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}

Write-Host ""
Write-Host ("Changed " + $changed.Count + " file(s).")
if ($changed.Count -gt 0) { Write-Host ("Backup: " + $backupRoot) }
