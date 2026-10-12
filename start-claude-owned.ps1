$ErrorActionPreference = 'Stop'
$config = Join-Path $PSScriptRoot 'profiles/claude.mcp.json'
if (!(Test-Path -LiteralPath $config)) { throw 'Configure the client-owned profiles first' }
claude --mcp-config $config --strict-mcp-config @args
