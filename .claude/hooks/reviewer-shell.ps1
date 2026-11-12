# PreToolUse hook for Bash/PowerShell, declared in the reviewer's frontmatter.
# The reviewer may only run read-only git commands, one at a time.

$ErrorActionPreference = 'Stop'
$data = [Console]::In.ReadToEnd() | ConvertFrom-Json
$cmd = ([string]$data.tool_input.command).Trim()

$ok = $cmd -match '^git\s+(diff|log|show|status|grep|ls-files|rev-parse|merge-base|branch\s+--show-current)\b' `
    -and $cmd -notmatch '[;&|><`]|\$\(' `
    -and $cmd -notmatch '(?i)--output|--ext-diff|--open-files-in-pager|\s-O|\s-c\s|--no-index'

if ($ok) { exit 0 }

@{
    hookSpecificOutput = @{
        hookEventName            = 'PreToolUse'
        permissionDecision       = 'deny'
        permissionDecisionReason = 'Reviewer is read-only: only single git diff/log/show/status/grep/ls-files/rev-parse/merge-base commands are allowed.'
    }
} | ConvertTo-Json -Compress -Depth 4
exit 0
