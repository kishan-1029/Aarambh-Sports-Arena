# Progress — Arambh Sports Arena

Current phase: 8 + Phase 14 partial (public website MVP)

## Phases

- [x] Phase 0 — Codebase and reference audit
- [x] Phase 1 — Foundation
- [x] Phase 2 — Authentication and RBAC
- [x] Phase 3 — Design system and admin shell
- [x] Phase 4 — Club setup, customers, finance core
- [x] Phase 5 — Members and membership
- [x] Phase 6 — Courts and booking engine
- [x] Phase 7 — Front desk (MVP)
- [ ] Phase 8 — Catalogue, inventory, purchasing
- [ ] Phase 9 — POS, bar, café, KDS
- [ ] Phase 10 — Online orders
- [ ] Phase 11 — CRM, enquiries, trials, quotes
- [ ] Phase 12 — Staff and HR
- [ ] Phase 13 — Finance screens, dashboard, reports
- [ ] Phase 14 — Public website *(MVP partial)*
- [ ] Phase 15 — Member mobile app
- [ ] Phase 16 — AI assistant
- [ ] Phase 17 — Management MCP for ChatGPT
- [ ] Phase 18 — Hardening
- [ ] Phase 19 — Deploy and demo

## Current phase tasks

### Phase 14 — Public website (partial / hackathon cut)
- [x] `website/` Next.js App Router on port **3001** (admin stays on 3000) — ADR-0001
- [x] `/api/public/*` — club, sports, membership-plans, availability (free/busy only), enquiries, trials
- [x] Pages: `/`, `/availability`, `/membership`, `/sports`, `/trial`, `/contact`
- [ ] Shop, member login, quote accept, AI chat widget (later)
- **Demo URL (local):** http://localhost:3001 — API `NEXT_PUBLIC_API_URL=http://localhost:7002`

### Phase 8 — Catalogue, inventory, purchasing
- [ ] Products / variants / categories
- [ ] InventoryService.move + stock races
- [ ] Purchase orders + admin UI

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
- Phase 5: membership under `/api/admin/*`; plan versioning on price/entitlement edits; renewals use status `scheduled` until start; Member 360 MVP tabs only (overview / membership / timeline).
- Phase 6: booking under `/api/admin/*`; money in paise; MongoMemoryReplSet concurrency suite (docs/08 §14).
- Phase 7 MVP: Front Desk board + member search + quick-book drawer; POS/Sell/Bar/Enquiry buttons disabled until later phases.
- Phase 14 (ahead of phase order for demo): Next.js public website before POS/mobile/MCP; full CRM pipeline UI remains Phase 11. Ignore stray `customer-site/` Vite experiment if present — canonical site is `website/`.
- Reference repos without `production` audited on best available branch (noted in each `ref-*.md`).

## Blockers / needs human

- **DB migrate to odoo2026 cluster blocked:** `mongodump` of source DB `test` succeeded locally (156 collections). `mongorestore` into destination cluster **fails** — this machine’s public IP `42.105.173.16` is not on that Atlas Network Access list (TLS / ReplicaSetNoPrimary).  
  **Do this in Atlas (destination cluster):** Network Access → Add IP `42.105.173.16` (or `0.0.0.0/0` for demo) → then run `Odoo.Server/scripts/restore-dump-when-ready.ps1`. Dump kept at `d:\odoo2026\_mongo_migrate\dump`.  
  **Interim:** app `.env` points at the **reachable source** cluster so existing data (156 collections) works for the evaluator now.
- **Disk:** C: drive often near ENOSPC; Jest MongoMemoryServer dbPath must stay on `D:\odoo2026\tmp\arambh-mongoms` (TEMP/TMP redirected in test setup).
- **Security:** DB passwords were pasted in chat — rotate those Atlas users when convenient (values never logged here).
- `gh` CLI not authenticated — cannot push/PR until `gh auth login`.

## Test status

- Odoo.Server: Phase 6/7 booking + pricing + concurrency suite (docs/08 §14: 50 parallel → 1 booking).
- Odoo.Admin: Front Desk `/front-desk`, Bookings `/courts/bookings`, Courts `/courts` live (Soon badges removed).
- Seed: Tennis/Padel/Badminton/Cricket + courts + sample booking via `npm run seed:demo`.
- Website: `website/` `npm run build` green; `/api/public/*` returns `{ isOk: true }` (restart server after pull to load routes).
