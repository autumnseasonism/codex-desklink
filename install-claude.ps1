param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
$client = (Get-Command claude -ErrorAction Stop).Source
$runtime = Join-Path $PSScriptRoot 'runtime/node.exe'
$server = Join-Path $PSScriptRoot 'server.mjs'
if (-not (Test-Path -LiteralPath $runtime)) { throw 'Bundled runtime missing' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'bridge.local.json'))) { throw 'Bind Codex with configure.ps1 first' }
if ($DryRun) { Write-Output "DryRun: register codex_desktop for Claude user scope; runtime=$runtime; server=$server"; exit 0 }
$previousPreference = $ErrorActionPreference
try {
 $ErrorActionPreference = 'Continue'
 $existing = & $client mcp get codex_desktop 2>$null
 $lookupExit = $LASTEXITCODE
} finally { $ErrorActionPreference = $previousPreference }
if ($lookupExit -eq 0) { throw 'Claude already has codex_desktop; existing registration preserved. Inspect it before changing.' }
if ($env:CLAUDE_CONFIG_DIR) { throw 'Custom Claude configuration directory: use start-claude.ps1 or register manually after protecting your config.' }
$configFile = Join-Path $HOME '.claude.json'
if (Test-Path -LiteralPath $configFile) {
 $backupRoot = Join-Path $PSScriptRoot 'recovery'
 New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
 $backupFile = Join-Path $backupRoot ("claude-before-" + [guid]::NewGuid().ToString() + '.json')
 Copy-Item -LiteralPath $configFile -Destination $backupFile
 if ((Get-FileHash -LiteralPath $configFile).Hash -ne (Get-FileHash -LiteralPath $backupFile).Hash) { throw 'Claude config backup mismatch' }
}
& $client mcp add --transport stdio --scope user codex_desktop -- $runtime $server
if ($LASTEXITCODE -ne 0) { throw 'Claude MCP registration failed; recovery copy retained' }
