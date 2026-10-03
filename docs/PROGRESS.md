# Progress — Arambh Sports Arena

Current phase: 5

## Phases

- [x] Phase 0 — Codebase and reference audit
- [x] Phase 1 — Foundation
- [x] Phase 2 — Authentication and RBAC
- [x] Phase 3 — Design system and admin shell
- [x] Phase 4 — Club setup, customers, finance core
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

### Phase 5 — Members and membership
- [ ] Member + plan + membership models/services
- [ ] Entitlements helper
- [ ] Admin Members / Plans / Memberships

## Decisions & deviations

- Product brand **Arambh Sports Arena** (slug `arambh`); PS club name is scenario only.
- Admin base branch is `feature/finalRBAC1` (Server is `feature/finalRBAC`) — [[docs/Audit/existing-project.md]].
- ADR-0001 website Next.js — accepted.
- ADR-0002 session auth for admin — accepted (Phase 2: string perms on session, not JWT).
- ADR-0003 DATABASE / MONGODB_URI alias — accepted.
- ADR-0004 `{ isOk }` envelope — accepted.
- ADR-0005 hybrid server layout — accepted.
- ADR-0006 Bootstrap admin UI kit — accepted.
- Phase 2: menu CRUD stays on `session.user.permissions`; Arambh strings on `stringPermissions` to avoid breaking MenuContext.
- Phase 3: Arambh nav merged after API menus (static `arambhNav.js`); command palette is custom modal (no `cmdk`); building blocks on Bootstrap/Reactstrap.
- Phase 4: finance under `/api/admin/*`; `customer.*` permissions added; webhook event idempotency is process-local Set (durable store later); receivables/payables UI deferred to Phase 13.
- Reference repos without `production` audited on best available branch (noted in each `ref-*.md`).

## Blockers / needs human

- **DB migrate to odoo2026 cluster blocked:** `mongodump` of source DB `test` succeeded locally (156 collections). `mongorestore` into destination cluster **fails** — this machine’s public IP `42.105.173.16` is not on that Atlas Network Access list (TLS / ReplicaSetNoPrimary).  
  **Do this in Atlas (destination cluster):** Network Access → Add IP `42.105.173.16` (or `0.0.0.0/0` for demo) → then run `Odoo.Server/scripts/restore-dump-when-ready.ps1`. Dump kept at `d:\odoo2026\_mongo_migrate\dump`.  
  **Interim:** app `.env` points at the **reachable source** cluster so existing data (156 collections) works for the evaluator now.
- **Security:** DB passwords were pasted in chat — rotate those Atlas users when convenient (values never logged here).
- `gh` CLI not authenticated — cannot push/PR until `gh auth login`.

## Test status

- Odoo.Server: `npm test` → **44/44 pass** (MongoMemoryReplSet), including Phase 4 finance (totals, credit note, mock pay, numbering concurrency).
- Odoo.Server: restart after pull to load `/api/admin` finance mounts (port 7002).
- Odoo.Admin: Vite on http://localhost:3000/ — Club/Taxes/Customers/Invoices/Payments pages live.
