[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$safePalacePath = Join-Path $env:USERPROFILE ".mempalace\palace_safe"

# Respect explicit caller override; otherwise force a known-safe palace path.
if (-not $env:MEMPALACE_PALACE_PATH) {
    New-Item -ItemType Directory -Path $safePalacePath -Force | Out-Null
    $env:MEMPALACE_PALACE_PATH = $safePalacePath
}

& py -m mempalace.mcp_server
exit $LASTEXITCODE