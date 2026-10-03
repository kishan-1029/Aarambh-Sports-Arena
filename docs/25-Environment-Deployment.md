# 25 · Environment and Deployment

## 1. Environment variables

### `server/.env.example`
```dotenv
NODE_ENV=development
PORT=4000
APP_URL_ADMIN=http://localhost:5173
APP_URL_WEBSITE=http://localhost:3000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
CLUB_TIMEZONE=Asia/Kolkata

# MongoDB Atlas — real value ONLY in .env, never in git or docs.
# Rotate the password that was shared in chat before using it.
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.iwru59z.mongodb.net/odoo2026?retryWrites=true&w=majority
MONGODB_TEST_URI=            # optional; tests default to mongodb-memory-server

JWT_ACCESS_SECRET=change-me-64-random-chars
JWT_REFRESH_SECRET=change-me-64-random-chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
QR_TOKEN_SECRET=change-me
OTP_DEV_BYPASS=123456        # ignored when NODE_ENV=production

PAYMENTS_PROVIDER=mock       # mock | razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLUB_UPI_VPA=club@bank       # shown as QR at POS for manual UPI

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="Champions Club <no-reply@example.com>"
SMS_PROVIDER=none            # none | msg91 | twilio
SMS_API_KEY=
EXPO_ACCESS_TOKEN=           # optional, for Expo push

STORAGE_DRIVER=local         # local | s3
UPLOAD_DIR=./uploads
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

AI_PROVIDER=openai           # or anthropic — whichever Elly uses / you have keys for
AI_MODEL=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AI_MAX_TOKENS_PER_DAY=200000

MCP_ALLOWED_ORIGINS=         # if needed by the transport
LOG_LEVEL=info
```

### `admin/.env.example`
`VITE_API_URL=http://localhost:4000` · `VITE_SOCKET_URL=http://localhost:4000` (adapt prefix to the existing build tool — VERIFY)

### `website/.env.example`
`NEXT_PUBLIC_API_URL=http://localhost:4000` · `API_URL_INTERNAL=http://localhost:4000` · `NEXT_PUBLIC_SITE_URL=http://localhost:3000` · `NEXT_PUBLIC_RAZORPAY_KEY_ID=`

### `mobile/.env.example`
`EXPO_PUBLIC_API_URL=https://api.<your-domain>` · `EXPO_PUBLIC_RAZORPAY_KEY_ID=`

### `mcp/.env.example`
`PORT=4100` · `BACKEND_URL=http://localhost:4000` · `MCP_PUBLIC_URL=https://mcp.<your-domain>/mcp` · OAuth settings if used (mirror project360-mcp-server).

## 2. Local development
```bash
# terminal 1
cd server && npm i && npm run seed:demo && npm run dev       # API + sockets
# terminal 2
cd server && npm run worker:dev                                # cron jobs
# terminal 3
cd admin && npm i && npm run dev
# terminal 4
cd website && npm i && npm run dev
# terminal 5
cd mcp && npm i && npm run dev
# terminal 6
cd mobile && npm i && npx expo start
```

## 3. Deployment (hackathon-friendly)
| Piece | Option | Notes |
|---|---|---|
| API + worker | Render / Railway / Fly.io / a VPS with PM2 | two processes from one repo (`server.js`, `worker.js`); WebSockets must be supported |
| Admin | Vercel / Netlify (static) | SPA fallback to `index.html` |
| Website | Vercel | ISR needs a Node runtime |
| MCP | same host as API (separate service) | must be **public HTTPS** for ChatGPT |
| DB | MongoDB Atlas (existing cluster) | allowlist host IPs |
| Mobile | Expo Go / EAS dev build | points at deployed API |

Deploy steps: set env vars → `npm run db:indexes` → `npm run seed:demo` (demo env only) → start API, worker, MCP → smoke test `/api/health/ready` → connect ChatGPT to `MCP_PUBLIC_URL`.

## 4. Pre-demo checklist
- [ ] Atlas password rotated; `.env` not in git (`git log -p | grep mongodb+srv` returns nothing with a password)
- [ ] Demo data seeded for **today's date** (seed uses relative dates)
- [ ] `PAYMENTS_PROVIDER=mock` (no live money)
- [ ] ChatGPT connector added and a test question answered
- [ ] Phones can reach the API over mobile data
- [ ] Backup screen recording of the full demo
