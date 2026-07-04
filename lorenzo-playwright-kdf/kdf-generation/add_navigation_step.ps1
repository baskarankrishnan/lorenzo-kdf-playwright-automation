# PowerShell script to add navigation step to KDF JSON files that are missing it

$kdfRoot = Split-Path -Parent $PSScriptRoot
$kdfScriptsPath = Join-Path $kdfRoot "kdf-generation\kdf-scripts"

# Navigation step to add
$navigationStep = @{
    StepNo = 1
    StepDescription = "Navigate to Lorenzo application"
    Page = "pageLogin"
    Element = "app_LorenzoLoginPage"
    ElementText = "Lorenzo Application"
    ActionKeyword = "navigateToUrl"
    Property = "URL"
    Condition = ""
    TableColumnNames = ""
    Values = "http://dxcappchne8097a.cscidp.net/webclient_sso/extlogon.aspx?idp=oidnatlogon&IsClientInfoNotRequired=true"
    DatasetColumnName = "LAUNCH_URL"
}

# Files that need the navigation step inserted
$filesToUpdate = @(
    "KDF_Clinic_Appointment_Complete_Lifecycle.json",
    "KDF_Access_Plan_Complete_Lifecycle.json",
    "KDF_Emergency_Department_Complete_Lifecycle.json",
    "KDF_MHA_Complete_Lifecycle.json",
    "KDF_Clinic_Volume_Management_Complete_Lifecycle.json",
    "KDF_Care_Events_Complete_Lifecycle.json"
)

foreach ($file in $filesToUpdate) {
    $filePath = Join-Path $kdfScriptsPath $file
    
    if (Test-Path $filePath) {
        Write-Host "Processing: $file" -ForegroundColor Green
        
        # Read JSON file
        $content = Get-Content $filePath -Raw
        $steps = ConvertFrom-Json $content
        
        # Renumber all existing steps
        foreach ($step in $steps) {
            $step.StepNo = $step.StepNo + 1
        }
        
        # Insert navigation step at beginning
        $newSteps = @($navigationStep) + $steps
        
        # Convert back to JSON with proper formatting
        $jsonOutput = ConvertTo-Json -InputObject $newSteps -Depth 10
        
        # Save back to file
        Set-Content -Path $filePath -Value $jsonOutput -Encoding UTF8
        Write-Host "  - Added navigation step and renumbered all steps" -ForegroundColor Yellow
    }
    else {
        Write-Host "  - File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Navigation steps added to all files!" -ForegroundColor Cyan
