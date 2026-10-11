param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
$client = (Get-Command pi -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'bridge.local.json'))) { throw 'Bind Codex with configure.ps1 first' }
if ($DryRun) { Write-Output "DryRun: install local PI extension package at $PSScriptRoot"; exit 0 }
$piRoot = if ($env:PI_CODING_AGENT_DIR) { $env:PI_CODING_AGENT_DIR } else { Join-Path $HOME '.pi/agent' }
$settings = Join-Path $piRoot 'settings.json'
if (Test-Path -LiteralPath $settings) {
 $backupRoot = Join-Path $PSScriptRoot 'recovery'
 New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
 $backupFile = Join-Path $backupRoot ("pi-before-" + [guid]::NewGuid().ToString() + '.json')
 Copy-Item -LiteralPath $settings -Destination $backupFile
 if ((Get-FileHash -LiteralPath $settings).Hash -ne (Get-FileHash -LiteralPath $backupFile).Hash) { throw 'PI settings backup mismatch' }
}
& $client install $PSScriptRoot
if ($LASTEXITCODE -ne 0) { throw 'PI registration failed; recovery copy retained' }
