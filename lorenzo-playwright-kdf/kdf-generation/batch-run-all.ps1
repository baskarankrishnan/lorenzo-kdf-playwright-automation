# Batch runner: runs the SMOKE suite in small groups (fresh playwright process each)
# to work around the "process dies after 3 completed tests" resource-accumulation crash.
# Each group is isolated, headless, and Edge is force-killed between groups.
# Produces batch-failure-summary.txt with passed-count + first-fail per test.

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot   # lorenzo-playwright-kdf
Set-Location $repo

$summaryFile = Join-Path $repo 'batch-failure-summary.txt'
"=== BATCH RUN STARTED $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Set-Content $summaryFile

# Groups of 2 modules per process (safely below the 3-completed-test crash threshold).
# All 31 modules in groups of ~2 (fresh process each to avoid the deep-run accumulation crash).
$groups = @(
    @('LSTP_APE_',         'LSTP_C&G_'),
    @('LSTP_CarePlan_',    'LSTP_CaseLoad_'),
    @('LSTP_CaseNote_',    'LSTP_CDC_'),
    @('LSTP_Charts_',      'LSTP_Contacts_'),
    @('LSTP_CPPView_',     'LSTP_Daycare_'),
    @('LSTP_DI_',          'LSTP_EC_'),
    @('LSTP_ePMA_',        'LSTP_FluidBalance_'),
    @('LSTP_HealthIssues_','LSTP_IDM_'),
    @('LSTP_IP_',          'LSTP_Maternity_'),
    @('LSTP_MSI_',         'LSTP_NursingActivity_'),
    @('LSTP_Observations_','LSTP_OP_'),
    @('LSTP_Problems_',    'LSTP_R&R_'),
    @('LSTP_Referral_',    'LSTP_Reports_'),
    @('LSTP_TaskMgmt_',    'LSTP_Theatres_'),
    @('LSTP_UserServices_','LSTP_User_Creation_'),
    @('LSTP_WA_')
)

$env:HEADED = 'false'
$env:USE_CONSOLIDATED_REPORTER = 'true'
$env:EXECUTION_TYPE = 'suite'

$groupNo = 0
foreach ($g in $groups) {
    $groupNo++
    $pattern = ($g -join '|')
    Write-Host "`n===== GROUP $groupNo/$($groups.Count): $pattern ====="

    # Clean any orphaned Edge before the group so it starts fresh.
    Get-Process msedge,msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

    $groupLog = Join-Path $repo ("batch-group-{0}.log" -f $groupNo)
    npx playwright test core/testrunners/testSuiteRunner.spec.ts --project=edge --workers=1 --grep "$pattern" *>&1 | Tee-Object -FilePath $groupLog | Out-Null

    # Kill Edge after the group to release resources.
    Get-Process msedge,msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Aggregate: scan every per-test log produced during this batch (last 3 hours) and
# report passed-count + first failing step for each.
"" | Add-Content $summaryFile
"=== PER-TEST RESULTS (from logs modified in last 3h) ===" | Add-Content $summaryFile
$logs = Get-ChildItem "reports\logs\*.txt" | Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-3) } | Sort-Object Name
foreach ($log in $logs) {
    $lines = Get-Content $log.FullName
    $passed = ($lines | Select-String -Pattern 'Step \d+ passed' | Measure-Object).Count
    $firstFail = (($lines | Select-String -Pattern 'Step \d+ failed' | Select-Object -First 1).Line -replace '^\[ERROR\]\s*❌\s*','').Trim()
    "{0} | passed={1} | firstFail={2}" -f $log.BaseName, $passed, $firstFail | Add-Content $summaryFile
}
"=== BATCH RUN FINISHED $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Add-Content $summaryFile
Write-Host "`nDONE. Summary at $summaryFile"
