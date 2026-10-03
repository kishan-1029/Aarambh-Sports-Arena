#!/usr/bin/env bash
# Build admin + customer-site for single-domain deploy.
# Usage (on VPS or CI):
#   DOMAIN=sportsarena.aarambhevents.in ./deploy/build-frontends.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="${DOMAIN:-sportsarena.aarambhevents.in}"
OUT_ADMIN="${OUT_ADMIN:-/var/www/arambh/admin}"
OUT_SITE="${OUT_SITE:-/var/www/arambh/site}"

echo "==> Building admin (base /admin/) → same-origin /api"
cd "$ROOT/Odoo.Admin"
npm ci
VITE_BASE=/admin/ VITE_API_URL= npm run build
sudo mkdir -p "$OUT_ADMIN"
sudo rsync -a --delete build/ "$OUT_ADMIN/"

echo "==> Building customer-site → same-origin /api"
cd "$ROOT/customer-site"
npm ci
VITE_API_URL= npm run build
sudo mkdir -p "$OUT_SITE"
sudo rsync -a --delete dist/ "$OUT_SITE/"

echo "Done."
echo "  Admin:  https://${DOMAIN}/admin/"
echo "  Site:   https://${DOMAIN}/"
echo "  API:    https://${DOMAIN}/api/health"
echo "  MCP:    https://${DOMAIN}/mcp"
