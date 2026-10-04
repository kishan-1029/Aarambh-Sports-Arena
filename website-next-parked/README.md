# Arambh Sports Arena — Public Website

Next.js (App Router) customer site. Consumes `Odoo.Server` `/api/public/*` (ADR-0001).

## Run

```bash
# Terminal 1 — API (port 7002)
cd ../Odoo.Server && npm run dev

# Terminal 2 — Website (port 3001; admin stays on 3000)
cp .env.example .env.local   # if needed
npm install
npm run dev
```

Demo: [http://localhost:3001](http://localhost:3001)

## Scripts

| Script | Port |
|---|---|
| `npm run dev` | 3001 |
| `npm run build` / `npm start` | 3001 |

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:7002`.
