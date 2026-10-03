# Restore local mongodump into destination Atlas once IP is whitelisted.
# Usage (from anywhere):
#   powershell -File Odoo.Server/scripts/restore-dump-when-ready.ps1
# Reads URIs from Odoo.Server/.env.migrate (gitignored). Never prints secrets.

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root "Odoo.Server"))) {
  $root = "d:\odoo2026\Odoo Project"
}
$migrateFile = Join-Path $root "Odoo.Server\.env.migrate"
if (-not (Test-Path $migrateFile)) {
  throw "Missing Odoo.Server/.env.migrate — recreate with SRC_URI, DST_URI, DUMP_PATH"
}

Get-Content $migrateFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  if ($_ -match '^([A-Z0-9_]+)=(.*)$') {
    Set-Item -Path "Env:$($matches[1])" -Value $matches[2]
  }
}

if (-not $env:DUMP_PATH) { $env:DUMP_PATH = "d:\odoo2026\_mongo_migrate\dump" }
if (-not (Test-Path (Join-Path $env:DUMP_PATH "test"))) {
  throw "Dump not found at $($env:DUMP_PATH)\test — re-run mongodump first"
}

Write-Host "Restoring dump -> destination DB odoo2026 ..."
& mongorestore --uri="$env:DST_URI" --nsFrom="test.*" --nsTo="odoo2026.*" --drop $env:DUMP_PATH
if ($LASTEXITCODE -ne 0) { throw "mongorestore failed ($LASTEXITCODE). Whitelist this machine IP in Atlas Network Access." }

Write-Host "Restore OK. Point Odoo.Server/.env DATABASE/MONGODB_URI to the destination cluster, then restart the server."
Remove-Item Env:SRC_URI, Env:DST_URI -ErrorAction SilentlyContinue
