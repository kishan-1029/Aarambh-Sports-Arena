# 24 · Testing

## Stack
- Server: existing runner (Jest or Vitest — VERIFY) + `supertest` + `mongodb-memory-server` **`MongoMemoryReplSet`** (transactions need a replica set). Shared helpers: `test/helpers/{app,db,factories,auth,clock}.js`.
- Admin/website: component tests with Testing Library for complex widgets (calendar grid, POS cart math); **Playwright** for E2E.
- Mobile: Jest + React Native Testing Library for hooks/components; manual device run for the demo.
- Load: `autocannon` (or k6) scripts in `test/load/`.

## Layers
| Layer | What | Examples |
|---|---|---|
| Unit | pure functions | `computeLine`, pricing rules, slot generation, time helpers (IST boundaries, DST-free but verify date rollover at 23:30), entitlement helpers |
| Service integration | services against replica-set Mongo | membership purchase/renew/expire, inventory moves, invoice posting |
| API | routes with auth + validation + permissions | table-driven permission matrix: for each (role, endpoint) expect 2xx/403 |
| Concurrency | `Promise.all` races | [[08-Booking-Engine#14. Concurrency test suite]] (10 cases), stock races ([[10-Shop-Inventory-Orders#7. Tests]]), POS idempotency, social session capacity, membership double-activation |
| Payments | mock provider + Razorpay signature fixtures | webhook replay, late payment after hold expiry, refund → credit note |
| Reports | fixed fixture day | every report total equals hand-computed expected values; snapshot vs live parity |
| AI | stub LLM emitting scripted tool calls | authorisation, two-phase confirm, idempotent confirm, routing evals |
| MCP | MCP client against the MCP server + test backend | scopes, confirmations, audit, contract tests |
| E2E | Playwright | critical flow below |

## Critical E2E flow (`e2e/critical-path.spec.ts`)
1. Visitor submits enquiry on website → appears in admin pipeline.
2. Front desk registers member (Silver), pays cash → member code shown.
3. Member logs in (website, OTP bypass in test) → availability → books 18:00 Tennis 1 → mock payment → confirmed.
4. Second member tries 18:30 Tennis 1 → sees unavailable + alternatives.
5. Member orders shoes (pickup) → staff marks ready → pickup code collected → stock decreased once.
6. Bar POS: open session, table 12, attach member → discount applied → split pay cash/UPI → close session → Z-report totals match.
7. Owner dashboard: revenue by stream equals the sum of the above.
8. MCP: `get_club_summary(today)` equals dashboard numbers; `create_purchase_order` → confirm → draft PO exists, audit row with `source: mcp`.

## CI (GitHub Actions or the existing pipeline)
`lint → unit+api+concurrency → build admin/website → e2e (against seeded test DB)`. Concurrency suite runs 3× to catch flakiness.

## Seed data
`npm run seed:demo`: 1 location, 4 sports, 8 courts, 3 plans, 60 members (mix of tiers, some expiring in 3 days, one expired), 2 weeks of bookings, 40 products with variants and some low stock, bar menu 30 items, 4 terminals, 2 floors/16 tables, 25 leads across stages, 12 employees with shifts and 3 pending leave requests, invoices/payments for the last 30 days so dashboards have trends. Deterministic (fixed random seed) and idempotent (`--reset` flag wipes demo data only).
