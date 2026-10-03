# 00 · Cursor Execution Guide

These rules bind every implementation session. If a rule conflicts with a convenience, the rule wins.

## 1. Inspect first (every session)

1. Read [[README]] and this file.
2. Read the phase you are implementing in [[26-Implementation-Phases]] and every doc it links.
3. Read `docs/Audit/*` (Phase 0 output). If it doesn't exist, **do Phase 0 first**.
4. Before creating any file, search the repo for an existing equivalent:
   - Look for an existing `*Service`, model, middleware, hook or component with the same responsibility.
   - Look in `server/`, `admin/` and the shared package.
   - Reuse or extend it. **Never create a second auth middleware, a second API client, a second toast system, a second table component or a second error class.**

## 2. Never modify blindly

| Area | Rule |
|---|---|
| Existing auth (login, JWT, refresh, password hashing) | Extend only. Do not change token format or the hashing algorithm without an ADR. Existing admin users must still be able to log in. |
| Existing DB connection / Mongoose setup | Reuse the existing connection module. Do not open a second connection. |
| `.env` files | Never commit. Never print secrets in logs. Add new keys to `.env.example` only. |
| Existing admin layout, router, theme provider | Extend. New modules plug into the existing nav config. |
| Package manager / lockfile | Use the one already in the repo (npm/yarn/pnpm). Do not switch. |
| Language (JS vs TS) | Follow the existing server and admin. If the existing code is JS, write JS with JSDoc + zod. Do not migrate. |
| `Reference Project/**` | **Read-only.** Copy patterns into the main project, never import across. |
| Money | Integers in **paise**. Never floats. See [[05-Backend-Conventions#Money]]. |

## 3. How to implement a phase

1. Create a branch `phase-XX-short-name`.
2. Write or update the **model** + indexes ([[04-Database-Schema]]).
3. Write the **zod validation schemas**.
4. Write the **service** (all business rules live here, never in controllers or routes).
5. Write the **controller + routes** with `requireAuth` + `requirePermission(...)` ([[06-Auth-RBAC]]).
6. Write **tests** (service unit tests + API tests). Concurrency tests where the phase says so.
7. Write the **admin UI** (and website/mobile where the phase says so) against the real API.
8. Add **seed data** for the module in `server/src/seed/`.
9. Update docs: the module doc's "Implementation notes" section, [[22-API-Reference]] if endpoints changed, and `docs/Changelog.md`.
10. Run the checklist below. Only then mark the phase done.

## 4. Validation commands (adapt names to package.json — VERIFY IN CODEBASE)

```bash
# server
npm run lint
npm test                      # unit + api (uses mongodb-memory-server replica set)
npm run test:concurrency      # booking + stock race tests
npm run seed:demo             # must run cleanly on an empty DB

# admin
npm run lint && npm run build

# mobile
npx expo-doctor && npm run lint
```

## 5. Architectural consistency rules

- **One backend, many clients.** Admin, POS, website, mobile, AI assistant and MCP all go through the same services. The AI and MCP layers **never** touch Mongoose models directly; they call services (AI) or the REST API (MCP).
- **Services own transactions.** A service method that writes more than one document uses `withTransaction()` from `server/src/lib/db.js`.
- **Every write that matters emits an audit event** via `audit.record()` ([[06-Auth-RBAC#Audit log]]).
- **Every list endpoint** is paginated, sortable and filterable via the shared `listQuery` helper.
- **Every money-moving action** creates a `Payment` and, when finalised, an `Invoice` ([[14-Finance]]).
- **Every stock change** goes through `InventoryService.move()`, which writes a `StockMove` ([[10-Shop-Inventory-Orders]]).
- **Every booking write** goes through `BookingService`. Nobody inserts `Booking` or `SlotLock` documents anywhere else.
- **Permissions are strings** like `booking.create`. They are defined once in `server/src/modules/auth/permissions.js` and imported by the admin for UI gating.
- **Time:** store UTC `Date`, plus a `localDate` string (`YYYY-MM-DD`) in club timezone `Asia/Kolkata` for day-based rules. Use `date-fns-tz` (or what the repo already uses).

## 6. Done checklist (copy into the PR description)

```
[ ] Existing code inspected for equivalents (listed what was reused)
[ ] Reference project pattern applied (named which)
[ ] Model + indexes match 04-Database-Schema
[ ] zod validation on every input
[ ] Permission checks on every route
[ ] Audit events on important writes
[ ] Transactions on multi-document writes
[ ] Tests added and passing (incl. concurrency where required)
[ ] Seed data added
[ ] Admin UI: loading / empty / error states
[ ] API reference updated
[ ] Module doc "Implementation notes" updated
[ ] Changelog line added
[ ] No secrets committed; .env.example updated
```

## 7. When something in the docs is wrong

Do not silently deviate. Write an ADR in `docs/ADR/NNNN-title.md` (template below), implement the corrected approach, and link the ADR from the affected doc.

```markdown
# NNNN · Title
Status: accepted | superseded
Context: what the doc said and why it doesn't fit
Decision: what we did instead
Consequences: what else changes
```
