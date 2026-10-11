$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'runtime/node.exe') (Join-Path $PSScriptRoot 'generate-client-config.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Client config generation failed' }
claude --mcp-config (Join-Path $PSScriptRoot 'claude.mcp.local.json') --strict-mcp-config @args
