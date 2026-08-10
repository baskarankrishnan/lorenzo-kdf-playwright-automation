param(
  [Parameter(Mandatory=$true)][string]$MapPath
)
$ErrorActionPreference = 'Stop'
$map = Get-Content -Raw -LiteralPath $MapPath | ConvertFrom-Json
$stamp = Get-Date -Format 'yyyyMMddHHmm'
$backupRoot = Join-Path (Split-Path -Parent $MapPath) ("excelFramework\testcases\_backups_$stamp")
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$groups = $map | Group-Object -Property file
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$applied = 0; $skipped = 0; $log = @()

try {
  foreach ($g in $groups) {
    $file = $g.Name
    if (-not (Test-Path -LiteralPath $file)) { Write-Host "MISSING: $file"; continue }
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
    $rowCount = $used.Rows.Count; $colCount = $used.Columns.Count
    $stepCol = 0; $hdr = @{}
    for ($c = 1; $c -le $colCount; $c++) {
      $h = [string]$ws.Cells.Item(1, $c).Value2
      if ($h -eq 'StepNo') { $stepCol = $c }
      $hdr[$h] = $c
    }
    if ($stepCol -eq 0) { Write-Host "NO StepNo: $file"; $wb.Close($false); continue }
    $rowByStep = @{}
    for ($r = 2; $r -le $rowCount; $r++) {
      $sv = $ws.Cells.Item($r, $stepCol).Value2
      if ($null -ne $sv) { $rowByStep[[string]([int]$sv)] = $r }
    }

    foreach ($fix in $g.Group) {
      $col = $hdr[[string]$fix.column]
      if (-not $col) { $skipped++; $log += "SKIP(no col $($fix.column)) $module"; continue }
      $key = [string]([int]$fix.step)
      if (-not $rowByStep.ContainsKey($key)) { $skipped++; $log += "SKIP(no row) $module s$($fix.step)"; continue }
      $r = $rowByStep[$key]
      $cur = [string]$ws.Cells.Item($r, $col).Value2
      if ($cur.Trim() -ne ([string]$fix.oldValue).Trim()) {
        $skipped++; $log += "SKIP(mismatch) $module s$($fix.step) [$($fix.column)]: '$cur' != '$($fix.oldValue)'"; continue
      }
      $ws.Cells.Item($r, $col).Value2 = [string]$fix.newValue
      $applied++
    }
    $wb.Save(); $wb.Close($true)
    Write-Host "Done: $module\$(Split-Path -Leaf $file)"
  }
}
finally {
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
  [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()
}
Write-Host ""; Write-Host "Applied: $applied  Skipped: $skipped"; Write-Host "Backups: $backupRoot"
if ($log.Count) { $log | ForEach-Object { Write-Host $_ } }
