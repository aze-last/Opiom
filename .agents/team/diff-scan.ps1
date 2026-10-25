<#
diff-scan.ps1 -- Universal deterministic pre-agy gate.
Run from repo root:  .\.agents\team\diff-scan.ps1 [-TestFilter <name>]
Exit 0 = GREEN. Exit 1 = BLOCK.
Loop order: script -> failures straight back to opencode -> agy reviews git diff.
#>
param([string]$TestFilter = "")

$script:fail = $false
function Block([string]$m) { Write-Host "BLOCK: $m"; $script:fail = $true }
function Note([string]$m) { Write-Host "NOTE:  $m" }

# 1. Banned files anywhere in diff
$files = @(git diff HEAD --name-only | Where-Object { $_ -ne "" })
$bannedPatterns = @(".env", ".env.*", "*.sqlite", "*.sqlite3", "*.db", "package-lock.json", "yarn.lock", "bun.lockb")
foreach ($f in $files) {
    if ($f -eq ".env.example") { continue }
    foreach ($pat in $bannedPatterns) {
        if ($f -like $pat) { Block "$f in diff -- banned from commit (secrets, binary DB, or non-pnpm lockfile)." }
    }
}

# 2. Strict PNPM check in diff
foreach ($f in $files) {
    $added = @(git diff HEAD -U0 -- $f | Where-Object { $_ -match "^\+" -and $_ -notmatch "^\+\+\+" })
    $n = 0
    foreach ($line in $added) {
        $n++
        $code = $line.Substring(1)
        $isBunRepo = (Test-Path "bun.lock")
        if (-not $isBunRepo -and $code -match "\b(npm\s+run|npm\s+install|yarn\s+add|yarn\s+install|bun\s+add|bun\s+install)\b") {
            Block "$f (~added $n): Non-pnpm command detected ($($code.Trim())). Use pnpm exclusively."
        } elseif ($isBunRepo -and $code -match "\b(npm\s+run|npm\s+install|yarn\s+add|yarn\s+install|pnpm\s+add|pnpm\s+install)\b") {
            Block "$f (~added $n): Non-bun command detected ($($code.Trim())). Use bun exclusively."
        }
        if ($code -match "->forceDelete\(\)" -or $code -match "(?i)\b(DROP\s+TABLE|TRUNCATE\s+TABLE)\b") {
            if ($f -notlike "*migration*") {
                Block "$f (~added $n): High-risk destructive operation ($($code.Trim())). Soft delete or dev approval required."
            }
        }
    }
}

# 3. Linter Execution (Auto-detect framework)
Write-Host "--- Linter Gate ---"
if (Test-Path "vendor/bin/pint") {
    php vendor/bin/pint --dirty --format agent
    if ($LASTEXITCODE -ne 0) { Block "Pint linter failed (exit $LASTEXITCODE)." }
} elseif (Test-Path "package.json") {
    $pkg = Get-Content "package.json" -Raw
    if ($pkg -match '"lint"') {
        pnpm run lint
        if ($LASTEXITCODE -ne 0) { Block "pnpm lint failed (exit $LASTEXITCODE)." }
    }
}

# 4. Test Suite Execution (Auto-detect test runner)
Write-Host "--- Test Gate ---"
if (Test-Path "artisan") {
    if ($TestFilter -ne "") {
        php artisan test --compact --filter=$TestFilter
    } else {
        $t = @($files | Where-Object { $_ -like "tests/*.php" })
        if ($t.Count -gt 0) {
            foreach ($tf in $t) {
                php artisan test --compact $tf
                if ($LASTEXITCODE -ne 0) { Block "Tests failed in $tf (exit $LASTEXITCODE)." }
            }
        } else {
            php artisan test --compact
        }
    }
    if ($LASTEXITCODE -ne 0) { Block "Tests failed (exit $LASTEXITCODE)." }
} elseif (Test-Path "package.json") {
    $isBun = (Test-Path "bun.lock") -or ($pkg -match '"packageManager":\s*"bun')
    if ($pkg -match '"test"') {
        if ($isBun) {
            bun test apps/web/src/services/ai/ apps/web/src/lib/timeline/ apps/web/src/lib/transcription/ apps/web/src/lib/media/
            if ($LASTEXITCODE -ne 0) { Block "bun test failed (exit $LASTEXITCODE)." }
        } else {
            pnpm test
            if ($LASTEXITCODE -ne 0) { Block "pnpm test failed (exit $LASTEXITCODE)." }
        }
    }
}

if ($script:fail) {
    Write-Host "RESULT: BLOCK"
    exit 1
} else {
    Write-Host "RESULT: GREEN"
    exit 0
}
