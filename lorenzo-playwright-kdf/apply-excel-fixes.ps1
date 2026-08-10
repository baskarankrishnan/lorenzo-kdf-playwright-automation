param(
  [string]$MapPath = "C:\Users\bkrishnan6\ORBIS PAS UKI-LZO\lorenzo-playwright-kdf\apply-map.json"
)
$ErrorActionPreference = 'Stop'
$map = Get-Content -Raw -LiteralPath $MapPath | ConvertFrom-Json
$stamp = Get-Date -Format 'yyyyMMddHHmm'
$backupRoot = Join-Path (Split-Path -Parent $MapPath) ("excelFramework\testcases\_backups_$stamp")
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

# group by file
$groups = $map | Group-Object -Property file
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$totalApplied = 0; $totalSkipped = 0
$log = @()

try {
  foreach ($g in $groups) {
    $file = $g.Name
    if (-not (Test-Path -LiteralPath $file)) { Write-Host "MISSING: $file"; continue }

    # backup
    $module = Split-Path -Parent $file | Split-Path -Leaf
    $bdir = Join-Path $backupRoot $module
    New-Item -ItemType Directory -Force -Path $bdir | Out-Null
    Copy-Item -LiteralPath $file -Destination (Join-Path $bdir (Split-Path -Leaf $file)) -Force

    $wb = $excel.Workbooks.Open($file)
    $ws = $null
    foreach ($s in $wb.Worksheets) { if ($s.Name -ieq 'TestExecution') { $ws = $s; break } }
    if (-not $ws) { foreach ($s in $wb.Worksheets) { if ($s.Name -ieq $module) { $ws = $s; break } } }
    if (-not $ws) { Write-Host "NO SHEET: $file"; $wb.Close($false); continue }

    $used = $ws.UsedRange
    $rowCount = $used.Rows.Count
    $colCount = $used.Columns.Count
    # find header columns (row 1)
    $stepCol = 0; $pageCol = 0
    for ($c = 1; $c -le $colCount; $c++) {
      $h = [string]$ws.Cells.Item(1, $c).Value2
      if ($h -eq 'StepNo') { $stepCol = $c }
      elseif ($h -eq 'Page') { $pageCol = $c }
    }
    if ($stepCol -eq 0 -or $pageCol -eq 0) { Write-Host "NO HEADERS: $file"; $wb.Close($false); continue }

    # index rows by StepNo
    $rowByStep = @{}
    for ($r = 2; $r -le $rowCount; $r++) {
      $sv = $ws.Cells.Item($r, $stepCol).Value2
      if ($null -ne $sv) { $rowByStep[[string]([int]$sv)] = $r }
    }

    foreach ($fix in $g.Group) {
      $key = [string]([int]$fix.step)
      if (-not $rowByStep.ContainsKey($key)) { $totalSkipped++; $log += "SKIP(no row) $module step $($fix.step)"; continue }
      $r = $rowByStep[$key]
      $cur = [string]$ws.Cells.Item($r, $pageCol).Value2
      if ($cur.Trim() -ne ([string]$fix.oldPage).Trim()) {
        $totalSkipped++; $log += "SKIP(mismatch) $module step $($fix.step): cell='$cur' expected='$($fix.oldPage)'"; continue
      }
      $ws.Cells.Item($r, $pageCol).Value2 = [string]$fix.newPage
      $totalApplied++
    }

    $wb.Save()
    $wb.Close($true)
    Write-Host "Done: $module\$(Split-Path -Leaf $file)"
  }
}
finally {
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
  [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()
}

Write-Host ""
Write-Host "Applied: $totalApplied  Skipped: $totalSkipped"
Write-Host "Backups: $backupRoot"
if ($log.Count) { Write-Host "--- notes ---"; $log | ForEach-Object { Write-Host $_ } }
