# 23 · Security

| Area | Measures |
|---|---|
| Secrets | Only in `.env` (git-ignored) and the host's secret store. `.env.example` lists names with placeholders. Config validated at boot. **The MongoDB password shared in chat must be rotated** in Atlas → Database Access before use, and the new one placed only in `.env`. |
| Atlas | Dedicated DB user with `readWrite` on `odoo2026` only; Network Access allowlist (deploy host IPs; avoid `0.0.0.0/0` outside the hackathon); TLS (default with `mongodb+srv`). |
| Authentication | bcrypt/argon2 (keep existing), short-lived access JWT (15 min), rotating refresh tokens stored hashed, reuse detection → revoke family; `tokenVersion` for global logout; OTP hashed, 5-min expiry, 5 attempts. |
| Authorization | Route-level `requirePermission`; record-level checks in services (`ctx.memberId`, coach assignments); default deny; permission tests for every admin route (table-driven). |
| Data isolation | Member endpoints never accept a member id from the client for "me" routes; public endpoints return whitelisted fields only; staff roles see masked phone/email when they lack `member.view`. |
| Input validation | zod on every params/query/body; `express-mongo-sanitize` (or zod strict objects) to block `$`/`.` operator injection; body size limit 1 MB (uploads separate). |
| Rate limiting | Global per IP; stricter on `/auth/*` (10/min), `/public/enquiries` (5/min), `/ai/chat` (see [[19-AI-Assistant]]), MCP per credential. |
| CORS | Allowlist: admin, website origins from env. Mobile and MCP don't need CORS. |
| CSRF | Refresh cookie is `httpOnly; Secure; SameSite=Lax` and only accepted on `/api/auth/refresh` with a custom header (`X-Requested-With`) check; all other APIs use bearer tokens (not cookies), so CSRF doesn't apply. |
| Headers | `helmet` defaults; website CSP via Next.js headers. |
| Payments | No card data touches our servers (Razorpay checkout). Webhook signature verified with the webhook secret; amounts recomputed server-side, never trusted from client; idempotent on provider ids. |
| File uploads | `multer` with mime + extension allowlist (jpg, png, webp, pdf), 5 MB limit, random filenames, served from a separate path/bucket with `Content-Disposition` for PDFs; no SVG uploads. |
| AI | Identity from ctx only; two-phase confirmations; prompt-injection hygiene; per-user token budgets; no secrets in prompts; conversation deletion. |
| MCP | Hashed API keys with scopes and expiry or OAuth; RBAC through backend; confirmations single-use with TTL; no delete tools; full activity log. |
| Audit | Append-only `auditLogs`; money actions audited inside transactions; no API to edit/delete audit. |
| Logging | Redaction of tokens, passwords, keys, OTPs; `requestId` in every log and error response. |
| PII | Minimum data: DOB (needed for Junior), guardian for minors, no full bank numbers. Members can request deletion → anonymise member, keep financial records (legal retention). |
| Dependencies | `npm audit` in CI; pin major versions; no unmaintained packages. |
| Odoo | If an Odoo connector is added ([[28-Risks-Extensions#Odoo connector]]): dedicated Odoo API user with minimal groups, credentials in env, server-to-server only. |
