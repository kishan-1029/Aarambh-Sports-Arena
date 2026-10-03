# 05 · Backend Conventions

> VERIFY IN CODEBASE: where the existing server already has an equivalent (error class, logger, response shape), **keep the existing one** and adapt these rules to it. Record differences in `docs/Audit/summary.md`.

## 1. Libraries (add only if missing)

| Need | Library |
|---|---|
| Validation | `zod` |
| Logging | `pino` + `pino-http` (pretty in dev) |
| Security headers | `helmet` |
| Rate limit | `express-rate-limit` (memory store for hackathon; Redis store later) |
| Dates | `date-fns` + `date-fns-tz` |
| Realtime | `socket.io` |
| Scheduling | `node-cron` (in `worker.js`) |
| Email | `nodemailer` |
| PDF (invoices, receipts, quotes) | `pdfkit` (no headless browser needed) |
| Payments | `razorpay` SDK |
| IDs/codes | `nanoid` (custom alphabet for pickup codes) |
| Tests | `vitest` or `jest` (whichever exists) + `supertest` + `mongodb-memory-server` (`MongoMemoryReplSet` — transactions need a replica set) |
| LLM | provider SDK chosen in [[19-AI-Assistant]] |

## 2. Config

`src/config/index.js` parses `process.env` with zod at boot; the process exits with a clear message if anything required is missing. Nothing else reads `process.env` directly. Keys in [[25-Environment-Deployment]].

## 3. Response envelope

```json
// success (single)
{ "data": { ... } }
// success (list)
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 25, "total": 312 } }
// error
{ "error": { "code": "SLOT_UNAVAILABLE", "message": "Court 2 is already booked at 18:00.", "details": { ... } }, "requestId": "..." }
```

## 4. Errors

`src/lib/errors.js`:

```js
class AppError extends Error { constructor(code, message, status = 400, details) {...} }
// helpers
NotFound(entity), Forbidden(perm), Conflict(code, msg, details), Validation(details), Unauthorized()
```

Domain error codes (used by clients, AI and MCP to explain failures):

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | zod failure; `details` = field errors |
| `UNAUTHENTICATED` | 401 | |
| `FORBIDDEN` | 403 | `details.permission` |
| `NOT_FOUND` | 404 | |
| `SLOT_UNAVAILABLE` | 409 | booking conflict |
| `DAILY_LIMIT_REACHED` | 409 | 2 bookings/day reached |
| `MEMBERSHIP_INACTIVE` | 409 | expired / none |
| `ENTITLEMENT_DENIED` | 403 | e.g. Junior booking peak hours |
| `OUTSIDE_OPERATING_HOURS` | 422 | |
| `BOOKING_WINDOW_EXCEEDED` | 422 | too far in advance |
| `HOLD_EXPIRED` | 410 | payment after hold timeout |
| `INSUFFICIENT_STOCK` | 409 | `details.available` |
| `SESSION_NOT_OPEN` | 409 | POS session closed |
| `TAB_LIMIT_EXCEEDED` | 409 | |
| `PAYMENT_FAILED` | 402 | |
| `IDEMPOTENCY_CONFLICT` | 409 | same key, different body |
| `CONFIRMATION_REQUIRED` | 428 | AI/MCP high-risk action |
| `RATE_LIMITED` | 429 | |

Global error handler maps `AppError` → envelope; Mongo duplicate key (`11000`) → `CONFLICT` unless the service already translated it; anything else → 500 with `requestId`, full stack logged, not returned.

## 5. Validation

`validate({ params, query, body })` middleware takes zod schemas, replaces `req.*` with parsed values. Schemas live in `<module>.schemas.js`. Shared enums from `packages/shared`.

## 6. Lists: `listQuery`

All list endpoints accept: `page` (1+), `pageSize` (≤100, default 25), `sort` (`-createdAt,name`, whitelisted per endpoint), `q` (search), and endpoint-specific filters. `lib/listQuery.js` builds `{filter, sort, skip, limit}` and runs `find` + `countDocuments` in parallel. Use `.lean()` for reads.

## 7. Transactions

`lib/db.js`:

```js
async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await fn(session); },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return result;
  } finally { await session.endSession(); }
}
```

- `session.withTransaction` retries on `TransientTransactionError` — therefore **`fn` must be safe to retry** (no emails, no HTTP calls, no event emits inside it).
- Collect events in an array during `fn`; emit after it returns (`emitAfterCommit`).
- Payment provider calls happen **outside** transactions (see [[08-Booking-Engine#Payment flow]]).

## 8. Money

`lib/money.js`: `toPaise(rupees)`, `formatINR(paise)`, `pct(paise, pct)` → rounds half-up to integer paise, `sum(...)`. Discount then tax: `base → discount → taxable → tax (per component, rounded) → total`. One shared `computeLine({unitPricePaise, qty, discountPct, tax})` used by booking, shop, POS and invoices so totals always agree.

Prices are **tax-exclusive** in the DB; the website/app shows tax-inclusive with "incl. GST" where consumer law expects it. Store `priceIncludesTax: false` in settings so this is explicit.

## 9. Time

`lib/time.js`: `CLUB_TZ = 'Asia/Kolkata'`; `toLocalDate(date)`, `localDateTimeToUtc('2026-10-03', '18:00')`, `alignToSlot(date, 30)`, `dayRange(localDate)` → `{startUtc, endUtc}`. **All "today", "per day", "this week" logic uses these helpers.** Week starts Monday.

## 10. Idempotency

`middleware/idempotency.js` for POST routes that create money/booking/order/POS records: reads `Idempotency-Key` header, stores `{key, scope, requestHash, response}`. Replays return the stored response; same key + different body → `IDEMPOTENCY_CONFLICT`. Mobile, POS and AI tools always send a key (UUID v4 generated once per user action).

## 11. Logging

`pino-http` with `requestId` (from `x-request-id` or generated). Redact: `req.headers.authorization`, `*.password`, `*.passwordHash`, `*.token`, `*.apiKey`, card data. Log every `AppError` at `warn`, 5xx at `error`.

## 12. Realtime (Socket.IO)

Namespaces/rooms, all authenticated with the same JWT in the handshake:

| Room | Who | Events |
|---|---|---|
| `court-board:{locationId}:{localDate}` | staff, members (public-safe payload) | `slot.locked`, `slot.released` |
| `kds:{locationId}:{station}` | kitchen, bar | `ticket.new`, `ticket.updated` |
| `pos:{locationId}` | POS staff | `table.updated`, `tab.updated`, `order.paid` |
| `orders:{locationId}` | shop staff | `order.new`, `order.updated` |
| `user:{userId}` | that user | `notification`, `order.updated`, `booking.updated` |
| `admin:{locationId}` | managers | `stock.low`, `lead.new`, `dashboard.tick` |

Sockets are a **hint**, never the source of truth: clients refetch the relevant query on event.

## 13. Worker jobs (`src/worker.js`)

| Job | Schedule | Does |
|---|---|---|
| `holds.expire` | every minute | mark `held` bookings past `holdExpiresAt` as `expired`, delete their hold locks, release counters |
| `orders.releaseUnpaid` | every 5 min | cancel unpaid online orders past `reservationExpiresAt`, release stock |
| `membership.reminders` | daily 09:00 IST | 30/7/1/0-day reminders |
| `membership.expire` | daily 00:05 IST | `active` past `endDate` → `expired`, member status update |
| `bookings.complete` | every 15 min | past `confirmed/checked_in` → `completed`/`no_show` |
| `leads.sla` | every 15 min | overdue leads → notify assignee + manager |
| `stock.lowDigest` | daily 08:00 IST | email low-stock list |
| `reports.dailySnapshot` | daily 23:55 IST | write `dailySnapshots` for fast dashboards |
| `notifications.dispatch` | every 30 s | send queued notifications with retry/backoff |

Every job: lock with a `jobLocks` doc (`findOneAndUpdate` with `lockedUntil`) so two worker instances never run the same job; log start/end/count.
