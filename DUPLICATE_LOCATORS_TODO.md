# TODO — Duplicate Page-Object Locators (to address later)

Created: 2026-07-17 (after merging members Thilagam + Dinesh).

When two members define the **same page-object name** in the same `pages/*.js` file,
the locator loader uses **last-definition-wins**. Nothing is broken, but stale/duplicate
definitions should be cleaned up.

## Summary

| Category | Count | Action |
|----------|-------|--------|
| CONFLICT (same name, **different** xpath) | 49 | Need a decision — pick the correct xpath, delete the wrong one |
| Harmless (same name, **identical** xpath) | 54 | Safe to delete the duplicate line |
| **Total duplicate elements** | 103 | |

## Full details
See the generated report (regenerate any time):

- `reports/duplicate-locators-report.csv`  — columns: File, Element, Line, Type, Xpath

Regenerate command (PowerShell, from repo root):
```powershell
$dir='lorenzo-playwright-kdf/pages'; $rows=New-Object System.Collections.Generic.List[object]
Get-ChildItem $dir -Filter *.js | ForEach-Object { $file=$_.Name; $defs=@{}; $ln=0
  foreach($line in Get-Content $_.FullName){ $ln++
    if($line -match 'export\s+const\s+(\w+)\s*=\s*(.+?);?\s*$'){ $n=$Matches[1]; $v=$Matches[2].Trim()
      if(-not $defs.ContainsKey($n)){ $defs[$n]=New-Object System.Collections.Generic.List[object] }
      $defs[$n].Add([pscustomobject]@{Line=$ln;Value=$v}) } } }
  foreach($k in $defs.Keys){ if($defs[$k].Count -gt 1){ $vals=$defs[$k].Value | Select-Object -Unique
    $type=if($vals.Count -gt 1){'CONFLICT'}else{'harmless'}
    foreach($d in $defs[$k]){ $rows.Add([pscustomobject]@{File=$file;Element=$k;Line=$d.Line;Type=$type;Xpath=$d.Value}) } } } }
$rows | Sort-Object File,Element,Line | Export-Csv 'reports/duplicate-locators-report.csv' -NoTypeInformation -Encoding UTF8
```

## Suggested approach
1. **Harmless (54):** auto-delete the duplicate identical lines — no risk.
2. **Conflicts (49):** review each against the current Lorenzo screens and keep the correct xpath.
   - A few are trivial (whitespace-only differences, or a stray typo like `pageEPRView.btn_Referral` L23 ending `";f`).
   - The rest are genuinely different selectors and need a domain decision.

## Notes
- This file is untracked by git (informational). Commit it if you want it in the repo.
- Duplicate count history: baseline 35 → after Thilagam 50 → after Dinesh (union) 103.
