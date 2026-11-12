# PreToolUse guard for Bash and PowerShell commands (all agents, main session included).
# Blocks: secret env files, user-secrets, remote access, production infra, git push,
# commits on main or with AI attribution, and deletes outside the repository.
# Permission deny rules cover the usual spellings; this hook covers the rest.

$ErrorActionPreference = 'Stop'
$data = [Console]::In.ReadToEnd() | ConvertFrom-Json
$cmd = [string]$data.tool_input.command
if (-not $cmd) { exit 0 }

$root = $env:CLAUDE_PROJECT_DIR
$cwd = if ($data.cwd) { [string]$data.cwd } else { $root }

function Deny([string]$reason) {
    @{
        hookSpecificOutput = @{
            hookEventName            = 'PreToolUse'
            permissionDecision       = 'deny'
            permissionDecisionReason = "Blocked by project guard (.claude/hooks/guard.ps1): $reason Do not retry in another form; report to the orchestrator."
        }
    } | ConvertTo-Json -Compress -Depth 4
    exit 0
}

# 1. Secret env files (.env, .env.local, .env.prod.local, ...). *.example templates are fine.
foreach ($m in [regex]::Matches($cmd, '(?i)\.env(?![A-Za-z0-9_])(?:\.[A-Za-z0-9_-]+)*')) {
    if ($m.Value -notmatch '(?i)\.example$') { Deny "command references a secret env file ($($m.Value))." }
}
if ($cmd -match '(?i)user-secrets') { Deny 'dotnet user-secrets exposes secrets.' }

# 2. Remote access and production infrastructure.
if ($cmd -match '(?i)(^|[\s;&|(''"])(ssh|scp|sftp|rsync)(\.exe)?(\s|$)') { Deny 'remote shell and file transfer are not allowed.' }
if ($cmd -match '(?i)docker-compose\.prod\.yml|docker\s+context|DOCKER_HOST') { Deny 'production infrastructure is off limits.' }

# 3. git push in any spelling (git push, git -C . push, git -c x=y push).
$gitOpts = '(\s+(-C|-c|--git-dir|--work-tree)\s+\S+|\s+-{1,2}\S+)*'
if ($cmd -match "(?i)\bgit$gitOpts\s+push\b") { Deny 'git push is not allowed.' }

# 4. Commits: never on main/master, never with AI attribution (CLAUDE.md).
if ($cmd -match "(?i)\bgit$gitOpts\s+commit\b") {
    $branch = (& git -C $cwd rev-parse --abbrev-ref HEAD 2>$null)
    if ($branch -in @('main', 'master')) { Deny "commits on '$branch' are not allowed; work on a sprint/<id> branch." }
    if ($cmd -match '(?i)co-authored-by|generated with') { Deny 'no AI attribution in commit messages (CLAUDE.md).' }
}

# 5. Deletes outside the repository.
# Only the arguments of each delete command are checked (up to the next ; & | newline or brace).
$rootFull = [IO.Path]::GetFullPath($root).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
foreach ($del in [regex]::Matches($cmd, '(?i)(?:^|[\s;&|({])(?:rm|rmdir|rd|del|erase|Remove-Item|ri)(?=\s|$)([^;&|\r\n{}]*)')) {
    $tokens = $del.Groups[1].Value -split '\s+' | ForEach-Object { $_.Trim('"', "'", '(', ')', ',') } | Where-Object { $_ -and $_ -notmatch '^-' }
    foreach ($t in $tokens) {
        if ($t -match '^(\$|%|~)') { Deny "delete target '$t' uses a variable or home path." }
        $p = $t
        if ($p -match '^/([a-zA-Z])/(.*)$') { $p = "$($Matches[1]):/$($Matches[2])" }   # Git Bash /d/... form
        if ($p -notmatch '^[A-Za-z]:[\\/]|^[\\/]|\.\.') { continue }                    # plain relative path: inside cwd
        $full = $null
        try { $full = [IO.Path]::GetFullPath($p, $cwd) } catch { Deny "cannot resolve delete target '$t'." }
        if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
            Deny "delete target '$t' is outside the repository."
        }
    }
}

exit 0
