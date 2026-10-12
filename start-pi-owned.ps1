$ErrorActionPreference = 'Stop'
pi --extension (Join-Path $PSScriptRoot 'pi-owned-extension.mjs') @args
