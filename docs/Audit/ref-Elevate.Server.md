# Elevate.Server

**Branch read:** `main` (`f5fa440` init commit) — tracks `origin/main`. No separate production branch checked out (this *is* the default).

Lightweight HR/admin master-data API (Trivedi / Elevate stack). Best reference for **cron jobs, activity audit, JWT role secrets, email masters** — not for POS or complex domain.

## Architecture

Classic Express + Mongoose CJS monolith (`server.js`). Auto-loads every file in `routes/` under `/api`. Controllers talk to models directly (no services folder). On DB `open`, starts `node-cron` jobs. Very small surface: employees, roles, menus, departments, companies, locations, OTP, email setup/templates, activity logs.

## Folder structure

```
Elevate.Server/
  server.js
  controllers/     # Employee, RoleMaster, Menu*, Email*, ActivityLog, Company…
  models/          # Employee, RoleMaster, MenuMaster, ActivityLog, Otp, Email*
  routes/          # one file per domain (no v1 prefix)
  middlewares/     # authMiddleware.js only
  utils/           # generateToken, cronScheduler, referenceHelper
```

## Patterns worth copying

| Path | What | Where in Arambh |
|---|---|---|
| `utils/cronScheduler.js` | Daily UTC cron; retention cleanup; start after DB open | Workers / audit retention — Phase 1+ |
| `models/ActivityLog.js` | Typed actions LOGIN/CREATE/UPDATE/DELETE; XOR performer (employee XOR admin); compound indexes | Shape ideas for `audit.record()` — prefer our richer audit spec |
| `utils/generateToken.js` | `jwt.sign({id, role}, ROLE_JWT_SECRET_KEY, {expiresIn})` | Compare with existing Odoo auth; extend, don’t replace |
| `middlewares/authMiddleware.js` | `authMiddleware(roles[])` tries each role secret | Same family as BFS/datasetu — consolidate to one Odoo middleware |
| Email models (`EmailSetup`, `EmailTemplate`, `EmailFor`) | SMTP config + template catalog | Notification templates — later phases |

## Reusable components

N/A (API only). No admin UI in this repo.

## Reusable services

None as modules. Closest “service” behaviors live in controllers:

- `controllers/EmployeeController.js` — bcrypt hash (cost 10), login + token issue.
- `controllers/ActivityLogController.js` — write/list activity.
- Cron cleanup as exported functions in `utils/cronScheduler.js` (callable for tests: `runCleanupNow`).

## DB patterns

- Simple masters with `isActive` flags; timestamps.
- **ActivityLog indexes:** `{createdAt:-1}`, actionType, performer, and composites — good for admin timelines.
- Validation: XOR constraint via `pre('validate')` (exactly one of employee/admin performer).
- **Retention:** hard `deleteMany` older than 30 days — fine for noisy logs; Arambh audit may need longer retention / archival (ADR if differing from [[06-Auth-RBAC]]).
- No transactions, no soft-delete framework, no money domain.

## API patterns

- Envelope: `{ isOk, message, status, data? }` (Elevate style) — match whatever Odoo.Server already returns; don’t introduce a second shape.
- Routes mounted via `fs.readdirSync("./routes")` → `/api/...` (no versioning).
- Controllers return inline try/catch; no central `ApiError` / error middleware.
- Large body limit 50mb; CORS `*` — weaker than BFS/datasetu.

## Auth / AuthZ

- Bearer JWT; secrets named `${ROLE}_JWT_SECRET_KEY` (e.g. ADMIN, EMPLOYEE).
- Expiry from `JWT_EXPIRY` env.
- Role check is “can verify with one of these secrets”, not menu/permission matrix.
- Menu/Role masters exist for admin UI gating elsewhere (Elevate.Admin) — server only stores role name.
- **Adapt:** keep Odoo’s existing auth; take cron + activity-log ideas only. Permission strings stay in `permissions.js`.

## UI/UX patterns

N/A.

## Performance / security techniques

- Cron timezone UTC (good); schedule documented in logs.
- bcrypt for passwords.
- **Weak spots:** open CORS + public `/log` static; `mongoose.debug = true` always; no rate limit / helmet; uncaughtException swallows without exit (same anti-pattern as BFS).

## NOT worth reusing

- Auto `readdirSync` route mounting without auth on every router (easy to forget guards).
- Serving `log/` as static files.
- Fat controllers with duplicated response boilerplate.
- Init-commit maturity — treat as pattern sketch, not production-hardened code.
- ActivityLog as the *only* audit model — too coarse for finance/booking; use Arambh `audit.record()`.

## Recommended adaptation

- **Phase 1:** Port cron bootstrap pattern (init after DB connect; timezone explicit; retention job) into Odoo workers.
- **Phase 1:** Use ActivityLog field/index ideas when implementing audit list UI; map to our audit schema, not a second log table.
- **Skip** replacing auth; if Odoo already has JWT middleware, only borrow role-secret naming consistency via ADR if needed.
- Email template/setup models → Phase for notifications only if Odoo lacks equivalents (search first).
