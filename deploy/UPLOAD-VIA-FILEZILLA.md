# What to upload via FileZilla

Builds are already in `Odoo.Server/out/`:
- `out/admin/` — admin panel (`/admin/`)
- `out/site/` — customer website (`/`)

## Upload into `/workspace/Aarambh-Sports-Arena/`

| Transfer | Why |
|----------|-----|
| **`Odoo.Server`** (include `out/`, `.env`, `package.json`, `src`, etc.) | API + built frontends |
| **`mcp`** (include `.env`, omit `node_modules`) | `/mcp` for ChatGPT |
| **`packages`** | shared permissions used by server |
| **`deploy`** | nginx + PM2 configs |

## Do NOT upload

- `Odoo.Admin` source (build is already in `Odoo.Server/out/admin`)
- `customer-site` source (build is in `Odoo.Server/out/site`)
- any `node_modules`
- `website-next-parked`

## After upload (SSH)

```bash
cd /workspace/Aarambh-Sports-Arena/Odoo.Server && npm ci
cd /workspace/Aarambh-Sports-Arena/mcp && npm ci
cd /workspace/Aarambh-Sports-Arena
cp deploy/nginx.arambh.conf /etc/nginx/sites-available/arambh
ln -sf /etc/nginx/sites-available/arambh /etc/nginx/sites-enabled/arambh
nginx -t && systemctl reload nginx
pm2 start deploy/ecosystem.config.cjs
pm2 save
```
