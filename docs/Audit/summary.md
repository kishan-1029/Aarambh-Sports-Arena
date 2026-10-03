# Phase 0 summary — Arambh Sports Arena

## 1. Conventions table

| Concern | Existing (finalRBAC) | References | **Chosen** |
|---|---|---|---|
| Language | JS ESM | Mix CJS/ESM/TS/Python | **JS ESM** (existing) |
| Validation | express-validator | zod (MCP), express-validator (datasetu) | **zod for new modules**; keep express-validator on legacy routes |
| Errors | ad-hoc `{ isOk }` | `ApiError` (datasetu) | **Add `AppError`**; map to `{ isOk, … }` envelope (ADR-0004) |
| Logging | morgan + console | winston (datasetu), pino (docs) | **pino** for new code; don't break existing console paths overnight |
| Auth | express-session cookie | JWT (BFS/Elevate/datasetu) | **Session for admin** (ADR-0002); JWT for mobile/MCP when needed |
| AuthZ | Menu CRUD + `checkPermission` | String scopes (MCP), role JWT | **Extend** with string permissions; keep menu RBAC for legacy UI |
| Data fetching (admin) | axios + Context | React Query / MobX in refs | **axios + Context**; add React Query in Phase 3 if needed |
| UI kit | Bootstrap / Reactstrap | Same family (Elevate.Admin); shadcn in docs | **Keep Bootstrap/Reactstrap** for hackathon speed (ADR-0006) |
| DB connection | Inline `server.js` | Separate modules | **Extract `src/lib/db.js`** single connection |
| Money | N/A | Floats in BFS (reject) | **Integer paise** (`lib/money.js`) |
| Tests | Jest empty | sparse | **Jest + mongodb-memory-server (MongoMemoryReplSet)** |

## 2. Reuse list (concrete → phase)

| Source | Pattern | Phase |
|---|---|---|
| Existing `checkPermission` / `PermissionProtected` | Extend for string perms | 2 |
| Existing axios client + toast + DataTable | Admin shell | 3 |
| datasetu-server `ApiError`, security middleware, services | Foundation | 1 |
| datasetu-server `mcpAccess` scopes | MCP | 17 |
| BFS.server Order/KOT/PDF/sockets | POS | 9 |
| Elevate.Server cron + activity log ideas | Worker / audit | 1–2 |
| Elevate.Elly orchestrator + stream events | AI | 16 |
| Elevate.Application Elly UI + Expo nav | Mobile / AI client | 15–16 |
| project360-mcp-server SDK + OAuth/SSE | MCP | 17 |
| datasetu-app apiClient retry / sockets | Mobile realtime | 15 |

## 3. Gaps (nothing provides yet)

- Court booking engine + slotLocks uniqueness
- Inventory moves / single-shelf stock
- Finance invoices/payments in paise
- Membership entitlements + day counters
- Front desk / KDS productized screens
- Public website (Next.js)
- Shared `packages/shared`

## 4. Doc updates / ADRs

| Issue | ADR |
|---|---|
| Admin auth is session, not JWT | [[ADR/0002-session-auth-for-admin]] |
| Env uses `DATABASE` | [[ADR/0003-database-env-alias]] |
| Response envelope `{ isOk }` | [[ADR/0004-response-envelope-isOk]] |
| Flat server layout vs `src/modules` | [[ADR/0005-hybrid-server-layout]] |
| Keep Bootstrap vs Tailwind/shadcn | [[ADR/0006-admin-ui-kit-bootstrap]] |
| Website = Next.js | [[ADR/0001-website-framework]] (accepted) |
| Admin branch name is `finalRBAC1` | Noted in PROGRESS (not a code ADR) |
| Refs without `production` use best available | Noted in each `ref-*.md` |

## 5. Acceptance checklist

- [x] `docs/Audit/` has existing-project, folder-mapping, 8 ref files, summary
- [x] `.env` git-ignored
- [x] Bases set to finalRBAC / finalRBAC1
- [x] Smoke: `npm install` OK; admin `vite build` OK; server boots on PORT and loads routes (Atlas connect failed until IP whitelist — see PROGRESS blockers)
- [x] No application feature code changed beyond tree sync to base branches + `.env.example` placeholders
