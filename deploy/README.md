# Single-domain deploy — Arambh Sports Arena

One public host:

| Path | Service |
|------|---------|
| `https://sportsarena.aarambhevents.in/` | Customer site |
| `https://sportsarena.aarambhevents.in/admin/` | Admin panel |
| `https://sportsarena.aarambhevents.in/api/` | Odoo.Server |
| `https://sportsarena.aarambhevents.in/mcp` | MCP (ChatGPT / Claude remote) |

Change the domain in `nginx.arambh.conf` if yours differs.

## 1. VPS prerequisites

- Ubuntu/Debian with Node 20+, nginx, certbot, PM2  
- DNS CNAME/A for `sportsarena.aarambhevents.in`  
- Atlas Network Access allows the VPS IP  

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo npm i -g pm2
```

## 2. Clone & env

```bash
git clone https://github.com/kishan-1029/Aarambh-Sports-Arena.git
cd Aarambh-Sports-Arena
git checkout phase-06-booking

# API env (never commit)
cp Odoo.Server/.env.example Odoo.Server/.env   # or copy from secure store
# Set at minimum:
#   NODE_ENV=production
#   PORT=7002
#   MONGODB_URI=...
#   SESSION_SECRET=...
#   ALLOWED_ORIGINS=https://sportsarena.aarambhevents.in

cd Odoo.Server && npm ci && cd ..
cd mcp && npm ci && cd ..

# MCP env
cp mcp/.env.example mcp/.env
# ARAMBH_API_URL=http://127.0.0.1:7002
# ARAMBH_MCP_API_KEY=ck_live_...   (create via Admin → MCP access after first boot, or scripts/create-mcp-key.js)
# MCP_PUBLIC_URL=https://sportsarena.aarambhevents.in
# PORT=7337
# HOST=127.0.0.1
```

## 3. Build frontends

```bash
chmod +x deploy/build-frontends.sh
DOMAIN=sportsarena.aarambhevents.in ./deploy/build-frontends.sh
```

## 4. Nginx + TLS

```bash
sudo cp deploy/nginx.arambh.conf /etc/nginx/sites-available/arambh
sudo ln -sf /etc/nginx/sites-available/arambh /etc/nginx/sites-enabled/arambh
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d sportsarena.aarambhevents.in
```

## 5. Start processes

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

## 6. Smoke test

```bash
curl -sS https://sportsarena.aarambhevents.in/api/health
curl -sS https://sportsarena.aarambhevents.in/healthz
# open https://sportsarena.aarambhevents.in/
# open https://sportsarena.aarambhevents.in/admin/
```

**ChatGPT connector URL:** `https://sportsarena.aarambhevents.in/mcp`

## Notes

- MCP talks to the API on loopback (`127.0.0.1:7002`), not the public URL.
- Admin cookies work same-origin; `trust proxy` is enabled on the API for HTTPS cookies behind nginx.
- Local Claude Desktop can still use `mcp/src/stdio.js` without the domain.
