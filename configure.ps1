param([Parameter(Mandatory=$true)][string]$CallerThreadId,[Parameter(Mandatory=$true)][string]$PipePath,[switch]$AllLocal,[switch]$AllowSend)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'runtime/node.exe') (Join-Path $PSScriptRoot 'configure-local.mjs') $CallerThreadId $PipePath $AllLocal.IsPresent.ToString() $AllowSend.IsPresent.ToString()
if ($LASTEXITCODE -ne 0) { throw 'Codex binding failed' }
