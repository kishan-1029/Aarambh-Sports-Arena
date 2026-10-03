# BFS.server

**Branch read:** detached HEAD at `origin/development` (`d5d3484`). Not on `production`.

Chocolate Room / Bhakti Food Stall POS + admin API. Express + Mongoose (CJS). Primary reference for **Bar POS** (Phase 9 / [[11-Bar-POS]]).

## Architecture

Express monolith (`server.js`) with `/api/v1` route modules, Socket.io, MongoDB Change Streams for live order push. Controllers own most business logic (thin/no service layer for orders). Serves built admin + POS SPAs from `out/`. Security stack: helmet, mongo-sanitize, hpp, rate limiters, swagger.

## Folder structure

```
BFS.server/
  server.js
  config/          # swagger
  controllers/v1/  # Order, POS, KOT, BillsKOT, Cart, Catalog…
  models/          # Order, Transaction, KOTCounter, Store*, FoodItem…
  routes/v1/       # POSRoutes, OrdersRoutes, BillsKOTRoutes…
  middlewares/     # auth, customerAuth, securityHeaders, rateLimiter, inputValidator, secureUpload
  services/        # authService, orderWatcher (change streams)
  utils/           # socket, pdfGenerator, orderNumberGenerator, transactionHelper, orderValidation
  out/{admin,Front}/  # static SPAs (POS + admin)
```

## Patterns worth copying

| Path | What | Where in Arambh |
|---|---|---|
| `models/Order.js` | Line-item snapshot, pricing breakdown, payment summary, status + `statusHistory` | `Booking`/`PosOrder` models — Phase 9 |
| `models/KOTCounter.js` | Atomic daily `$inc` upsert per store+date | Kitchen ticket / bar ticket numbers |
| `utils/orderNumberGenerator.js` | `ORD-YYMMDD-XXX` sequential IDs | Invoice/order number helpers |
| `utils/pdfGenerator.js` | 80mm thermal bill + KOT + combined PDF | Receipt printing — Phase 9 |
| `services/orderWatcher.js` | Change Stream → Socket rooms (`store:`, `customer:`) | Live kitchen/POS board |
| `utils/socket.js` | JWT handshake (multi-secret by role) + room emit | Realtime layer |
| `models/LoginAttempt.js` | Lockout after failed logins | Auth hardening — Phase 1 |
| `middlewares/securityHeaders.js` + `rateLimiter.js` | OWASP headers / auth rate limits | Align with datasetu security stack |

## Reusable components

N/A (backend-only for our copy). Built POS SPA in `out/Front` shows store-code login + localStorage token pattern — study UX only, do not import.

## Reusable services

- `services/orderWatcher.js` — replica-set change streams for order insert/status (requires Atlas RS; we already plan that).
- `services/authService.js` — store/employee auth helpers (adapt; keep Odoo’s existing auth).
- `utils/transactionHelper.js` — payment ledger row creation (mock gateway today; shape useful for `Payment`).

## DB patterns

- **Snapshots** at order time: `customerDetails`, `storeDetails`, item name/price/add-ons — critical for receipts after catalog edits.
- **Indexes:** `orderNumber` unique; `kotNumber`; compound unique `{storeId, date}` on `KOTCounter`.
- **Atomic counter:** `findOneAndUpdate` + `$inc` + `upsert` (good concurrency pattern).
- **No `withTransaction()`** — order + payment writes are not multi-doc transactional. **Do not copy that gap**; Arambh must use `withTransaction()`.
- Money stored as floats (`Number`) — **reject**; use integer paise via `lib/money.js`.
- Soft delete: limited (`isActive` on masters); orders use status enum including `cancelled`.

## API patterns

- Envelope mixes `{ success, message }` and occasional swagger `{ isOk }` — prefer Arambh’s chosen envelope from existing Odoo.Server.
- POS auth: `POST /api/v1/pos/login` (store code) → Bearer; routes use `authMiddleware(["POS"])` / `posOrAdminAuth`.
- KOT: `POST /orders/:orderId/kot`, `GET /kot?date=`, print endpoints in `BillsKOTRoutes.js`.
- Payment methods enum: `cod` | `online` only — extend for cash/UPI/card split in Phase 9.
- No idempotency keys on create-order — **add** for POS double-submit.

## Auth / AuthZ

- Role-scoped JWT secrets: `POS_JWT_SECRET_KEY`, `ADMIN_…`, `EMPLOYEE_…`, `CUSTOMER_…` (`middlewares/authMiddleware.js`).
- Middleware takes allowed roles array; verifies against matching secret.
- Coarse roles, not string permissions (`booking.create`). **Adapt to** `requireAuth` + `requirePermission` from [[06-Auth-RBAC]]; keep multi-audience idea (POS vs admin) if needed via separate secrets or `aud` claim — ADR if changing existing Odoo JWT.

## UI/UX patterns

Backend only. POS SPA (built): store-code login, kitchen board fed by sockets. For Odoo.Admin POS screens, copy flow ideas (login → catalog → ticket → print), not the CRA bundle.

## Performance / security techniques

- Helmet + cors allowlist + mongo-sanitize + hpp + body size 10mb.
- LoginAttempt lockout model.
- Socket auth before join; do **not** copy `cors: { origin: "*" }` on Socket.io for production.
- Change Streams need replica set (Atlas OK).
- `mongoose.set("debug", true)` always on — turn off in prod (datasetu gates this).

## NOT worth reusing

- Float money and mock payment gateway (`transactionHelper` always “success” for online).
- Business logic in controllers without a `BookingService`/`PosOrderService` boundary.
- Auto-mounting every route file without permission matrix.
- Serving `/log` or world-open CORS (Elevate does worse; BFS improved this).
- Order number race (read-last + +1 without unique collision retry) — prefer counter collection or unique index + retry.

## Recommended adaptation

- **Phase 9:** Port Order line-item + pricing + statusHistory shape into POS order model; KOTCounter pattern for bar/kitchen tickets; pdfGenerator thermal layout; Socket rooms for live tickets.
- **Phase 1:** Steal security middleware stack patterns (already mirrored in datasetu); LoginAttempt.
- **Phase 9:** Add payment split + idempotency; wrap order+stock+payment in `withTransaction()`; money → paise.
- **Do not** import BFS code; re-implement against Odoo.Server services.
