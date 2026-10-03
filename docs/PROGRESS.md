# Progress — Arambh Sports Arena

Current phase: 1

## Phases

- [x] Phase 0 — Codebase and reference audit
- [ ] Phase 1 — Foundation
- [ ] Phase 2 — Authentication and RBAC
- [ ] Phase 3 — Design system and admin shell
- [ ] Phase 4 — Club setup, customers, finance core
- [ ] Phase 5 — Members and membership
- [ ] Phase 6 — Courts and booking engine
- [ ] Phase 7 — Front desk
- [ ] Phase 8 — Catalogue, inventory, purchasing
- [ ] Phase 9 — POS, bar, café, KDS
- [ ] Phase 10 — Online orders
- [ ] Phase 11 — CRM, enquiries, trials, quotes
- [ ] Phase 12 — Staff and HR
- [ ] Phase 13 — Finance screens, dashboard, reports
- [ ] Phase 14 — Public website
- [ ] Phase 15 — Member mobile app
- [ ] Phase 16 — AI assistant
- [ ] Phase 17 — Management MCP for ChatGPT
- [ ] Phase 18 — Hardening
- [ ] Phase 19 — Deploy and demo

## Current phase tasks

### Phase 1 — Foundation
- [ ] Config (zod env; DATABASE/MONGODB_URI alias)
- [ ] lib: db/withTransaction, errors, money, time, clock, counters, listQuery
- [ ] middleware: validate, idempotency, rateLimit, errorHandler, requestId
- [ ] events bus + socket bootstrap
- [ ] audit + notifications modules
- [ ] worker.js + jobLocks
- [ ] seed runner + health routes
- [ ] packages/shared stubs
- [ ] test helpers (MongoMemoryReplSet) + foundation unit tests
- [ ] lint/test green; Changelog + API notes

## Decisions & deviations

- Product brand **Arambh Sports Arena** (slug `arambh`); PS club name is scenario only.
- Admin base branch is `feature/finalRBAC1` (Server is `feature/finalRBAC`) — [[docs/Audit/existing-project.md]].
- ADR-0001 website Next.js — accepted.
- ADR-0002 session auth for admin — accepted.
- ADR-0003 DATABASE / MONGODB_URI alias — accepted.
- ADR-0004 `{ isOk }` envelope — accepted.
- ADR-0005 hybrid server layout — accepted.
- ADR-0006 Bootstrap admin UI kit — accepted.
- Reference repos without `production` audited on best available branch (noted in each `ref-*.md`).

## Blockers / needs human

- **Atlas IP whitelist:** server boots but cannot select MongoDB primary from this machine until the current IP is allowed in Atlas Network Access (or `0.0.0.0/0` for demo). Tests will use MongoMemoryReplSet and do not need Atlas.
- **Security:** a MongoDB Atlas password was pasted in chat earlier — rotate that Atlas DB user password when convenient (URI never logged here).
- `gh` CLI not authenticated — cannot push/PR until `gh auth login`.

## Test status

- Odoo.Server: `npm install` OK; `node server.js` listens on configured PORT; Atlas connection failed (IP whitelist).
- Odoo.Admin: `npm install` OK; `npm run build` (vite) OK.
