# Progress — Arambh Sports Arena

Current phase: 10 (online orders) — E-commerce Pro Shop live end to end; Phase 17 MCP MVP live (`mcp/` + `/api/mcp`); Phase 14 site live

## Phases

- [x] Phase 0 — Codebase and reference audit
- [x] Phase 1 — Foundation
- [x] Phase 2 — Authentication and RBAC
- [x] Phase 3 — Design system and admin shell
- [x] Phase 4 — Club setup, customers, finance core
- [x] Phase 5 — Members and membership
- [x] Phase 6 — Courts and booking engine
- [x] Phase 7 — Front desk (MVP)
- [ ] Phase 8 — Catalogue, inventory, purchasing *(catalogue + inventory done via Phase 10; purchase orders outstanding)*
- [ ] Phase 9 — POS, bar, café, KDS *(POS nav group + demo staff roles/logins; KDS/sessions/tabs later)*
- [x] Phase 10 — Online orders *(Pro Shop: catalogue, cart, checkout, orders, inventory)*
- [ ] Phase 11 — CRM, enquiries, trials, quotes
- [ ] Phase 12 — Staff and HR
- [ ] Phase 13 — Finance screens, dashboard, reports
- [ ] Phase 14 — Public website *(MVP partial)*
- [ ] Phase 15 — Member mobile app
- [ ] Phase 16 — AI assistant
- [x] Phase 17 — Management MCP for ChatGPT *(MVP: API keys + slim tools; OAuth multi-user follow-up)*
- [ ] Phase 18 — Hardening
- [ ] Phase 19 — Deploy and demo

## Current phase tasks

### Phase 14 — Public website (partial / hackathon cut)
- [x] `customer-site/` React + Vite on port **3001** (admin stays on 3000) — ADR-0001 amended
- [x] `/api/public/*` — club, sports, membership-plans, availability (free/busy only), enquiries, trials, faqs
- [x] Pages: Home, Availability, Membership, Sports, Trial, Contact, FAQs, Shop, Cart, Orders
- [x] Contact thank-you email template; dark-theme logo; mobile nav/CSS; Gold/Silver benefits on site
- [ ] Quote accept, AI chat widget (later)
- **Demo URL (local):** http://localhost:3001 — API `VITE_API_URL=http://localhost:7003`

### Phase 8 — Catalogue, inventory, purchasing
- [x] Products / variants / categories — `src/modules/ecommerce` (embedded variants + images, soft archive)
- [x] InventoryService.move + stock races — one shelf, guarded `$elemMatch` + `arrayFilters` decrement, `InventoryMovement` ledger
- [ ] Purchase orders + admin UI — deferred, restocking is "Stock in" for now (ADR-0008)

### Phase 10 — Online orders (Pro Shop)
- [x] Public catalogue `/api/public/shop/*` with member-aware pricing (optional Bearer token)
- [x] Server-priced cart `/api/portal/cart`; guest cart in `localStorage` merged on sign-in
- [x] Transactional checkout: order number `ASA-ORD-{YYYY}-{SEQ:6}`, snapshots per line, stock posted in the same transaction
- [x] Order state machine per fulfilment type; cancel restores stock once (`stockRestored` guard)
- [x] Payments: only `pay_at_club` / `cash_on_delivery` while `paymentsProvider === 'mock'` — no fake gateway, nothing auto-marked paid
- [x] Super Admin E-commerce section (dashboard, products, categories, orders, inventory) inside the existing shell
- [x] Customer site: Shop, product detail, cart, checkout, order tracking, My Orders
- [x] `npm run seed:shop` — 5 categories, 15 products, upsert by slug, opening-stock movements
- [ ] Shop settings screen in Super Admin (delivery charge / free-delivery threshold are server fields today)

## Decisions & deviations

- Product brand **Arambh Sports Arena** (slug `arambh`); PS club name is scenario only.
- Admin base branch is `feature/finalRBAC1` (Server is `feature/finalRBAC`) — [[docs/Audit/existing-project.md]].
- ADR-0001 website React + Vite (`customer-site/`) — accepted (amended; Next.js parked).
- ADR-0002 session auth for admin — accepted (Phase 2: string perms on session, not JWT).
- ADR-0003 DATABASE / MONGODB_URI alias — accepted.
- ADR-0004 `{ isOk }` envelope — accepted.
- ADR-0005 hybrid server layout — accepted.
- ADR-0006 Bootstrap admin UI kit — accepted.
- ADR-0008 Pro Shop deducts stock at order creation (not reserve/fulfil); embedded variants/images; purchase orders deferred — accepted.
- Phase 2: menu CRUD stays on `session.user.permissions`; Arambh strings on `stringPermissions` to avoid breaking MenuContext.
- Phase 3: Arambh nav merged after API menus (static `arambhNav.js`); command palette is custom modal (no `cmdk`); building blocks on Bootstrap/Reactstrap.
- Phase 4: finance under `/api/admin/*`; `customer.*` permissions added; webhook event idempotency is process-local Set (durable store later); receivables/payables UI deferred to Phase 13.
- Phase 5: membership under `/api/admin/*`; plan versioning on price/entitlement edits; renewals use status `scheduled` until start; Member 360 MVP tabs only (overview / membership / timeline).
- Phase 6: booking under `/api/admin/*`; money in paise; MongoMemoryReplSet concurrency suite (docs/08 §14).
- Phase 7 MVP: Front Desk board + member search + quick-book drawer; POS/Sell/Bar/Enquiry buttons disabled until later phases.
- Phase 14 (ahead of phase order for demo): React + Vite public site before POS/mobile/MCP; full CRM pipeline UI remains Phase 11. Canonical site is `customer-site/`; Next.js `website*` trees are parked.
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
- Website: `customer-site/` Vite on :3001; `/api/public/*` returns `{ isOk: true }`. Dev API base comes from `VITE_API_URL` (see `.env.example`, :7002).
- Live API docs: http://localhost:7002/api-docs (Try it out). JSON: `/api-docs.json`.
- Pro Shop manual pass: browse → pick XXL variant (+₹100) → guest cart → sign in merges cart → checkout (pickup, pay at club) → `ASA-ORD-2026-000001` → variant stock 6→5 → cancel → stock back to 6. Unauthenticated `/api/portal/*` and `/api/admin/*` shop routes all return 401.
