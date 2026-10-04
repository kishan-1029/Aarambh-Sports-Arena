# Changelog

One line per merged phase: `YYYY-MM-DD · Phase N · what shipped · PR link`.

- 2026-10-03 · Phase 0 · Reference audits: Elevate.Admin, Elevate.Elly, Elevate.Application, datasetu-app.
- 2026-10-03 · Docs · Initial implementation specification (00–28).
- 2026-10-03 · Phase 0 · Codebase/reference audit; bases synced to finalRBAC/finalRBAC1; ADRs 0001–0006; `.env.example` placeholders.
- 2026-10-03 · Phase 1 · Foundation: config, db/withTransaction, money/time/clock/counters, middleware, audit/notifications, worker, seed, health, shared package, Jest+MongoMemoryReplSet tests (15 pass).
- 2026-10-03 · Phase 2 · Auth/RBAC: string permissions (shared + server re-export), seeded arambhRoles, requirePermission middleware, session stringPermissions (keep menu CRUD), admin usePermission/Can, auth login/logout audit; 36 tests pass.
- 2026-10-03 · Phase 3 · Admin shell: Arambh brand tokens (SCSS), Common building blocks (EmptyState/ErrorState/Skeleton/StatusChip/Money/ConfirmDialog/KpiTile), static Arambh nav merged after MenuMaster, Ctrl/⌘K palette, dark mode toggle, Coming soon placeholders, Staff directory sample list, FullscreenLayout `/pos`; Bootstrap kept (ADR-0006).
- 2026-10-03 · Phase 4 · Club settings/locations/taxes, customers CRUD, invoice+payment services (paise, mock provider, credit notes, PDF stub), Razorpay webhook stub, demo seed, admin pages (Club, Taxes, Customers, Invoices, Payments); Jest finance tests.
- 2026-10-03 · Phase 5 · Members/plans/memberships/activityEvents, entitlements helper, purchase/renew/expire/reminders (idempotent), plan versioning, demo Gold/Silver/Junior + members, admin Members/360/Plans/Memberships; Jest membership tests.
- 2026-10-03 · Phase 6 · Courts/sports/blocks, slotLocks + BookingService (holds/confirm/cancel/reschedule/check-in), availability/pricing, social sessions, workers holds.expire + bookings.complete, seed courts + sample booking, admin calendar/list + courts UI; concurrency suite §14 (50-parallel) + pricing tests.
- 2026-10-03 · Phase 7 · Front Desk MVP: member search, today’s court board (calendar API), quick-book drawer (member/walk-in + cash/UPI/card), hotkey hints (/ · F2 · Esc); nav Soon badges removed for Front Desk/Bookings/Courts.
- 2026-10-03 · Phase 14 (partial) · Public site (`customer-site/` React+Vite :3001) + `/api/public` club/sports/plans/availability/enquiries/trials; ADR-0001 amended (Next.js parked); demo http://localhost:3001 → API :7003.
- 2026-10-03 · Fix · Relaxed API rate limits for demo; stop 429 from forcing admin logout; green admin sidebar/primary; Stitch prompt in `customer-site/STITCH-PROMPT.md`.
- 2026-10-03 · Demo UI · Rebuilt `customer-site` (full-bleed hero, Syne/Manrope, live sports/plans/availability/trial/contact); seeded sports+courts; API default :7003.
- 2026-10-03 · Admin demo · Seeded 10 menu groups / 40 menus, ~30 members, bookings/invoices/leads; live dashboard KPIs+charts; Members Add/Archive; Arambh logos on login, sidebar, header, customer site.
- 2026-10-03 · Brand fix · Login left=left.jpg / right=right.jpg once each; larger sidebar left logo; dashboard KPIs restored (no giant logo); remove Barodaweb from footer/titles; customer site uses AS symbol crop.
- 2026-10-03 · Dashboard · Daily revenue KPI + 7-day revenue chart; all KPI tiles clickable to related screens.
- 2026-10-03 · Admin dynamic · Pie charts on dashboard; Membership Plans + Courts CRUD/toggles/search; Bookings search+actions; Front Desk date picker; Club settings one-click public site flags; blog seed + public /blogs; customer-site skeletons.
- 2026-10-03 · Phase 17 MCP · `mcp/` host (HTTP+stdio) from project360 patterns; `/api/mcp/*` + API keys (ADR-0007); admin Settings → MCP access; CONNECT.md for Claude/ChatGPT/Cursor.
- 2026-10-03 · Deploy · Single-domain nginx+PM2 (`deploy/`): `/` site, `/admin` panel, `/api` backend, `/mcp` MCP; same-origin frontends.
- 2026-10-04 · CMS + POS MVP · Seed/migrate BlogCategory/Tag + FAQ/Guides; legacy field normalize on list APIs; admin café POS terminal + menu (`/pos`, `/pos/menu`) with paise catalog/orders (BFS patterns, no separate POS app); `seed:demo` runs `seedCms` + `seedPosCatalog`.
- 2026-10-04 · Multi-café POS · Removed Shop/CRM from POS nav; Café setup + per-café menus (BFS StoreMenu pattern, paise); POS picks café then sells only that menu; seed Main Café + Poolside Bar.
- 2026-10-04 · POS Setup + terminal · Dropped POS&Shop menu group; Cafés / Menu items / Café menus under Setup; item images (upload + seed SVGs); richer POS (order type, guest/table, notes, today’s orders, image tiles).
- 2026-10-04 · POS nav group · POS is a full sidebar group: Dashboard, Terminal, Today’s orders, Café Master, Menu Items, Café Menus, KDS (soon).
- 2026-10-04 · Demo staff RBAC · Removed KDS/Reports pages; seeded POS Admin / Ecom Admin / Front Desk / Bar Staff / Finance / Club Manager employees (+ admin@demo.com); password `Demo@12345`.
