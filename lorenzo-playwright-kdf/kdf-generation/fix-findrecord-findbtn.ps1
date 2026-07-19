# Point the Find-record search Find-button step to pageSearchPatient.btn_Find
# (the Find-record form's command cell). Targets the btn_Find that immediately follows
# the inserted lnkTaskPanePatient step, so the later Find-and-book dialog btn_Find is untouched.

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\excelFramework\testcases')).Path
$backupRoot = Join-Path $PSScriptRoot ('..\excelFramework\_backup_findbtn_' + (Get-Date -Format 'yyyyMMddHHmmss'))

$targets = @{
    'APE'          = 'APE\LSTP_APE_WF001.xlsx'
    'CarePlan'     = 'CarePlan\LSTP_CarePlan_WF001.xlsx'
    'Charts'       = 'Charts\LSTP_Charts_WF001.xlsx'
    'Contacts'     = 'Contacts\LSTP_Contacts_WF001.xlsx'
    'Observations' = 'Observations\LSTP_Observations_WF001.xlsx'
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$changed = @()
try {
    foreach ($mod in $targets.Keys) {
        $path = Join-Path $root $targets[$mod]
        if (-not (Test-Path $path)) { Write-Host "SKIP (missing): $mod"; continue }
        $wb = $excel.Workbooks.Open($path)
        try {
            $ws = $null
            foreach ($s in $wb.Worksheets) { if ($s.Name -match 'testexec') { $ws = $s; break } }
            if (-not $ws) { $ws = $wb.Worksheets.Item(1) }
            $used = $ws.UsedRange; $rowCount = $used.Rows.Count; $colCount = $used.Columns.Count
            $col = @{}
            for ($c = 1; $c -le $colCount; $c++) { $h=[string]$ws.Cells.Item(1,$c).Value2; if($h){$col[$h.Trim().ToLower()]=$c} }
            $cPage=$col['page']; $cElem=$col['element']
            if (-not ($cPage -and $cElem)) { Write-Host "SKIP (no headers): $mod"; continue }

            # find lnkTaskPanePatient row
            $lnkRow = 0
            for ($r=2; $r -le $rowCount; $r++) { if(([string]$ws.Cells.Item($r,$cElem).Value2).Trim() -eq 'lnkTaskPanePatient'){$lnkRow=$r;break} }
            if ($lnkRow -eq 0) { Write-Host "SKIP (no lnkTaskPanePatient): $mod"; continue }

            # next btn_Find after it
            $findRow = 0
            for ($r=$lnkRow+1; $r -le $rowCount; $r++) { if(([string]$ws.Cells.Item($r,$cElem).Value2).Trim() -eq 'btn_Find'){$findRow=$r;break} }
            if ($findRow -eq 0) { Write-Host "SKIP (no btn_Find after): $mod"; continue }

            $oldPage = [string]$ws.Cells.Item($findRow,$cPage).Value2
            $ws.Cells.Item($findRow,$cPage).Value2 = 'pageSearchPatient'

            $bak = Join-Path $backupRoot $targets[$mod]
            New-Item -ItemType Directory -Force -Path (Split-Path $bak) | Out-Null
            Copy-Item $path $bak -Force
            $wb.Save()
            $changed += $mod
            Write-Host "  $mod : row $findRow btn_Find Page '$oldPage' -> pageSearchPatient"
        }
        finally { $wb.Close($false) }
    }
}
finally { $excel.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null }
Write-Host ("Changed " + $changed.Count + " file(s): " + ($changed -join ', '))
if ($changed.Count -gt 0) { Write-Host ("Backup: " + $backupRoot) }
