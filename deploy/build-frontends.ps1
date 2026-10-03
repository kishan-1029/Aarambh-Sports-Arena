# Build admin + customer-site for single-domain deploy (Windows).
# Usage:
#   .\deploy\build-frontends.ps1
#   .\deploy\build-frontends.ps1 -OutAdmin D:\www\arambh\admin -OutSite D:\www\arambh\site

param(
  [string]$Domain = "sportsarena.aarambhevents.in",
  [string]$OutAdmin = "",
  [string]$OutSite = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==> Building admin (base /admin/)"
Set-Location "$Root\Odoo.Admin"
$env:VITE_BASE = "/admin/"
$env:VITE_API_URL = ""
npm ci
npm run build
if ($OutAdmin) {
  New-Item -ItemType Directory -Force -Path $OutAdmin | Out-Null
  Copy-Item -Recurse -Force "$Root\Odoo.Admin\build\*" $OutAdmin
}

Write-Host "==> Building customer-site"
Set-Location "$Root\customer-site"
$env:VITE_API_URL = ""
npm ci
npm run build
if ($OutSite) {
  New-Item -ItemType Directory -Force -Path $OutSite | Out-Null
  Copy-Item -Recurse -Force "$Root\customer-site\dist\*" $OutSite
}

Write-Host "Done. Next: copy builds to VPS /var/www/arambh/{admin,site} and follow deploy/README.md"
Write-Host "  https://$Domain/"
Write-Host "  https://$Domain/admin/"
Write-Host "  https://$Domain/api/health"
Write-Host "  https://$Domain/mcp"
