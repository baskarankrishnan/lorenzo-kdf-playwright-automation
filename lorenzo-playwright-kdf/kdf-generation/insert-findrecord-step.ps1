# Insert the missing "Find record" (pageHome.lnkTaskPanePatient) click step into the 5
# tests that go straight from the Patients tab to the surname field. Verified via live app:
# clicking Find record opens patientbasicsearch with the surname field //input[@dikey='itxtSurname'].
# Inserts the step right after the tab_Patients (+ following waitForRoller), then renumbers StepNo.

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\excelFramework\testcases')).Path
$backupRoot = Join-Path $PSScriptRoot ('..\excelFramework\_backup_findrecord_' + (Get-Date -Format 'yyyyMMddHHmmss'))

# module -> file leaf
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
        if (-not (Test-Path $path)) { Write-Host "SKIP (missing): $path"; continue }
        $wb = $excel.Workbooks.Open($path)
        try {
            $ws = $null
            foreach ($s in $wb.Worksheets) { if ($s.Name -match 'testexec') { $ws = $s; break } }
            if (-not $ws) { $ws = $wb.Worksheets.Item(1) }

            $used = $ws.UsedRange
            $rowCount = $used.Rows.Count
            $colCount = $used.Columns.Count

            # header columns
            $col = @{}
            for ($c = 1; $c -le $colCount; $c++) {
                $h = [string]$ws.Cells.Item(1, $c).Value2
                if ($h) { $col[$h.Trim().ToLower()] = $c }
            }
            $cStep = $col['stepno']; $cDesc = $col['stepdescription']; $cPage = $col['page']; $cElem = $col['element']; $cAct = $col['actionkeyword']
            if (-not ($cStep -and $cPage -and $cElem -and $cAct)) { Write-Host "SKIP (no headers): $mod"; continue }

            # find tab_Patients row
            $tabRow = 0
            for ($r = 2; $r -le $rowCount; $r++) {
                if (([string]$ws.Cells.Item($r, $cElem).Value2).Trim() -eq 'tab_Patients') { $tabRow = $r; break }
            }
            if ($tabRow -eq 0) { Write-Host "SKIP (no tab_Patients): $mod"; continue }

            # If already has a Find-record step, skip
            $already = $false
            for ($r = 2; $r -le $rowCount; $r++) {
                if (([string]$ws.Cells.Item($r, $cElem).Value2).Trim() -eq 'lnkTaskPanePatient') { $already = $true; break }
            }
            if ($already) { Write-Host "SKIP (already has lnkTaskPanePatient): $mod"; continue }

            # insertion position: after tab_Patients + following waitForRoller (if present)
            $insertAt = $tabRow + 1
            if ($insertAt -le $rowCount) {
                $nextAct = ([string]$ws.Cells.Item($insertAt, $cAct).Value2).Trim().ToLower()
                if ($nextAct -eq 'waitforroller') { $insertAt = $insertAt + 1 }
            }

            # insert a blank row (copies formatting from row above)
            [void]$ws.Rows.Item($insertAt).Insert(-4121)  # xlShiftDown=-4121; -4121 is xlDown fallback
            # fill the new row
            $ws.Cells.Item($insertAt, $cDesc).Value2 = 'Click Find record to open the patient search form'
            $ws.Cells.Item($insertAt, $cPage).Value2 = 'pageHome'
            $ws.Cells.Item($insertAt, $cElem).Value2 = 'lnkTaskPanePatient'
            $ws.Cells.Item($insertAt, $cAct).Value2  = 'clickElement'

            # renumber StepNo for all data rows (row 2..last)
            $newRowCount = $ws.UsedRange.Rows.Count
            $n = 1
            for ($r = 2; $r -le $newRowCount; $r++) {
                # only number rows that have any content in desc/page/element/action
                $hasContent = ([string]$ws.Cells.Item($r, $cDesc).Value2).Trim() -ne '' -or ([string]$ws.Cells.Item($r, $cPage).Value2).Trim() -ne '' -or ([string]$ws.Cells.Item($r, $cElem).Value2).Trim() -ne '' -or ([string]$ws.Cells.Item($r, $cAct).Value2).Trim() -ne ''
                if ($hasContent) { $ws.Cells.Item($r, $cStep).Value2 = $n; $n++ }
            }

            # backup then save
            $bak = Join-Path $backupRoot $targets[$mod]
            New-Item -ItemType Directory -Force -Path (Split-Path $bak) | Out-Null
            Copy-Item $path $bak -Force
            $wb.Save()
            $changed += $mod
            Write-Host "  $mod : inserted lnkTaskPanePatient at row $insertAt (after tab_Patients row $tabRow)"
        }
        finally { $wb.Close($false) }
    }
}
finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
Write-Host ("Changed " + $changed.Count + " file(s): " + ($changed -join ', '))
if ($changed.Count -gt 0) { Write-Host ("Backup: " + $backupRoot) }
