$ErrorActionPreference = 'Stop'
pi --extension (Join-Path $PSScriptRoot 'pi-extension.mjs') @args
