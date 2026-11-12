# PreToolUse hook for Edit/Write/NotebookEdit, declared in subagent frontmatter.
# Denies file edits outside the agent's allowed folders (paths relative to the repo root).
# Usage: path-scope.ps1 -Allowed backend/            or  -Allowed backend/tests/,web/

param([Parameter(Mandatory)][string[]]$Allowed)

$ErrorActionPreference = 'Stop'
$data = [Console]::In.ReadToEnd() | ConvertFrom-Json
$path = [string]$data.tool_input.file_path
if (-not $path) { $path = [string]$data.tool_input.notebook_path }
if (-not $path) { exit 0 }

$root = [IO.Path]::GetFullPath($env:CLAUDE_PROJECT_DIR).TrimEnd('\', '/')
$full = [IO.Path]::GetFullPath($path, $root)

foreach ($a in $Allowed) {
    $prefix = [IO.Path]::GetFullPath((Join-Path $root $a)).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    if ($full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { exit 0 }
}

@{
    hookSpecificOutput = @{
        hookEventName            = 'PreToolUse'
        permissionDecision       = 'deny'
        permissionDecisionReason = "Out of scope: this agent may only edit under $($Allowed -join ', '). Report the needed change to the orchestrator instead."
    }
} | ConvertTo-Json -Compress -Depth 4
exit 0
