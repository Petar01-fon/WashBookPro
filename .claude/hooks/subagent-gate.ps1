# SubagentStop gate for backend-dev, frontend-dev and tester.
#
# - backend-dev / tester with changes under backend/: dotnet build + dotnet test (needs Docker)
# - frontend-dev with changes under web/:             pnpm exec tsc --noEmit
# - always: alerts for weakened tests, destructive migrations, forbidden folders
#
# On failure the subagent is sent back to fix it (decision: block), at most 3 attempts.
# The result is written to .claude/state/gate-<agent>.txt (and appended to gate-history.log)
# for the orchestrator to read; .claude/ is gitignored.

$ErrorActionPreference = 'Continue'
$data = [Console]::In.ReadToEnd() | ConvertFrom-Json
$root = $env:CLAUDE_PROJECT_DIR
$agent = [string]$data.agent_type

$stateDir = Join-Path $root '.claude/state'
New-Item -ItemType Directory -Force $stateDir | Out-Null
$counterFile = Join-Path $stateDir "attempts-$($data.agent_id).txt"
$resultFile = Join-Path $stateDir "gate-$agent.txt"

function Run([string]$dir, [string]$exe, [string[]]$argv) {
    Push-Location (Join-Path $root $dir)
    try { $out = & $exe @argv 2>&1 | Out-String; $code = $LASTEXITCODE } finally { Pop-Location }
    [pscustomobject]@{ Cmd = "$dir> $exe $($argv -join ' ')"; Code = $code; Out = $out }
}

function Tail([string]$text, [int]$n) { (($text -split "`r?`n") | Select-Object -Last $n) -join "`n" }

# Changed files in the working tree (relative, forward slashes).
$changed = @(git -C $root status --porcelain --untracked-files=all | ForEach-Object {
        $p = $_.Substring(3); if ($p -match ' -> ') { $p = ($p -split ' -> ')[-1] }; $p.Trim('"')
    })
$backendChanged = @($changed | Where-Object { $_ -like 'backend/*' }).Count -gt 0
$webChanged = @($changed | Where-Object { $_ -like 'web/*' }).Count -gt 0

# ---------- Alerts: these require the orchestrator to stop and ask Petar ----------
$alerts = @()

if (@($changed | Where-Object { $_ -like 'mobile/*' -or $_ -like 'anpr-edge/*' }).Count) {
    $alerts += 'Files changed under mobile/ or anpr-edge/ (forbidden folders).'
}

$testsDir = Join-Path $root 'backend/tests'
$testNow = @(Get-ChildItem $testsDir -Recurse -Filter *.cs -File |
    Where-Object { $_.FullName -notmatch '[\\/](bin|obj)[\\/]' } |
    Select-String -Pattern '\[(Fact|Theory)\b').Count
$testHead = @(git -C $root grep -E '\[(Fact|Theory)\b' HEAD -- backend/tests).Count
if ($testNow -lt $testHead) { $alerts += "Test count dropped: [Fact]/[Theory] HEAD $testHead -> now $testNow." }

if (git -C $root diff HEAD -U0 -- backend/tests | Select-String -Pattern '^\+.*\b(Skip\s*=|Explicit\s*=|SkipUnless|SkipWhen|Assert\.Skip)') {
    $alerts += 'Skip/Explicit added to an existing test.'
}
if (git -C $root status --porcelain -- backend/tests | Where-Object { $_ -match '^( D|D )' }) {
    $alerts += 'A test file was deleted.'
}

$migPrefix = 'backend/src/WashBookPro.Api/Common/Persistence/Migrations/'
$tracked = @(git -C $root ls-files -- $migPrefix)
foreach ($f in $changed | Where-Object { $_ -like "$migPrefix*.cs" -and $_ -notlike '*.Designer.cs' -and $_ -notlike '*ModelSnapshot.cs' }) {
    if ($tracked -contains $f) { $alerts += "Existing migration edited: $f"; continue }
    $path = Join-Path $root $f
    if (-not (Test-Path $path)) { continue }
    $text = Get-Content $path -Raw
    $up = [regex]::Match($text, '(?s)void\s+Up\s*\(.*?(?=void\s+Down\s*\()').Value
    if ($up -match 'DropColumn|DropTable|RenameColumn|RenameTable|AlterColumn|DeleteData|UpdateData|migrationBuilder\.Sql') {
        $alerts += "Migration changes or deletes existing columns/data: $f"
    }
}

# ---------- Gate commands ----------
$results = @()
$envProblem = $null

if ($agent -in @('backend-dev', 'tester') -and $backendChanged) {
    docker info --format '{{.ServerVersion}}' *> $null
    $dockerOk = ($LASTEXITCODE -eq 0)
    $build = Run 'backend' 'dotnet' @('build', '-nologo', '-v', 'q')
    $results += $build
    if ($build.Code -eq 0) {
        if ($dockerOk) { $results += Run 'backend' 'dotnet' @('test', '--no-build') }
        else { $envProblem = 'Docker is not running; dotnet test (Testcontainers) was not run.' }
    }
}
if ($agent -eq 'frontend-dev' -and $webChanged) {
    $results += Run 'web' 'pnpm' @('exec', 'tsc', '--noEmit')
}

$failed = @($results | Where-Object { $_.Code -ne 0 })

# ---------- Verdict ----------
$attempt = 0
if ($failed.Count) {
    if (Test-Path $counterFile) { $attempt = [int](Get-Content $counterFile -Raw) }
    $attempt++
    Set-Content $counterFile $attempt
}
else { Remove-Item $counterFile -ErrorAction SilentlyContinue }

$status = if ($failed.Count -and $attempt -ge 3) { 'FAIL-3X (hard stop)' }
elseif ($failed.Count) { "FAIL (attempt $attempt of 3, subagent sent back)" }
elseif ($envProblem) { 'ENV (hard stop)' }
elseif (-not $results.Count) { 'PASS (no gate commands: no changes in this agent''s area)' }
else { 'PASS' }

$lines = @("[gate] $(Get-Date -Format s) agent=$agent id=$($data.agent_id) status=$status")
foreach ($r in $results) {
    $summary = (($r.Out -split "`r?`n") | Where-Object { $_ -match '(?i)total:|succeeded:|failed:|error\(s\)|warning\(s\)|Test run summary' } | Select-Object -Last 3) -join ' | '
    $lines += "  exit $($r.Code)  $($r.Cmd)  $summary"
}
if ($envProblem) { $lines += "  ENV: $envProblem" }
foreach ($a in $alerts) { $lines += "  ALERT (hard stop): $a" }
if ($failed.Count -and $attempt -ge 3) { $lines += '  Output tail:'; $lines += Tail $failed[0].Out 40 }

$report = $lines -join "`n"
Set-Content $resultFile $report
Add-Content (Join-Path $stateDir 'gate-history.log') ($lines[0..([Math]::Min($lines.Count, 6) - 1)] -join "`n")

if ($failed.Count -and $attempt -lt 3) {
    $reason = "Gate failed (attempt $attempt of 3): $($failed[0].Cmd) exited $($failed[0].Code). " +
    "Fix the root cause. Never delete, skip or weaken tests to pass. Output tail:`n" + (Tail $failed[0].Out 60)
    @{ decision = 'block'; reason = $reason } | ConvertTo-Json -Compress
}
exit 0
