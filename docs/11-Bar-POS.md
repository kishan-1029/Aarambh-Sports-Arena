# 11 · Bar / Cafeteria POS (and shop counter POS)

Problem statement: *"Twenty people arrive at once. Orders are scribbled on paper, tabs get lost, and the kitchen keeps asking who ordered what. Members expect their discount without having to ask, and some would rather run a tab and settle up before they leave. Guests pay by cash, card or UPI. Staff work in shifts, tables need to be tracked, and at closing time the owner wants to know what the bar actually earned that day."*

> **Reference:** `Reference Project/BFS.server`. In Phase 0, Cursor documents its POS order model, session/shift handling, payment splitting, kitchen flow and closing report in `docs/Audit/ref-BFS.server.md`. Where BFS.server has a proven pattern for any item below, **port that pattern** and note it in the module's implementation notes. The rules in this doc (idempotency, discounts, sessions, audit) still apply.

## 1. Concepts (Odoo POS vocabulary)

| Concept | Meaning |
|---|---|
| Terminal | A device/counter: *Bar Counter*, *Café*, *Shop Counter*, *Front Desk*. Has a `mode`. |
| Session | A staff shift on a terminal: opened with float cash, closed with counted cash → **Z-report**. One open session per terminal. |
| Order | One ticket. Lines go to the kitchen/bar station. Can be paid immediately, or put on a tab. |
| Tab | Running bill for a member or a named guest, across multiple orders, settled before leaving. |
| Table | Floor plan entity with live status. |
| Station | `bar` or `kitchen` — where the line is prepared (KDS routing). |

## 2. Screens (`admin/pos/*`, full screen, tablet-first, 1024×768 minimum)

### Terminal select + open session
Choose terminal → enter opening float → session opens. Cashier switch via PIN.

### Floor view
Grid/floor plan of tables coloured by status: free, occupied (with elapsed time + running total), bill requested, reserved. Tap table → order screen. "Quick sale" button for takeaway/counter.

### Order screen
```
┌ Table 12 · 4 guests · Rahul S. (Gold −15%) ────────────── [Attach member] ┐
│ Categories: [Cold drinks][Hot drinks][Snacks][Meals][Sports drinks]       │
│ ┌──────┐┌──────┐┌──────┐┌──────┐                    │ Coke ×2      ₹120 │
│ │ Coke ││Coffee││Sandw.││Gator.│   (tap = +1)        │ Sandwich ×1  ₹180 │
│ └──────┘└──────┘└──────┘└──────┘                    │ Coffee ×1     ₹90 │
│ search [________]                                   │ Gatorade ×1   ₹80 │
│                                                     │ Member −15%  −₹71 │
│                                                     │ GST           ₹20 │
│ [Send to kitchen] [Add to tab] [Split] [Pay ₹419]   │ Total        ₹419 │
└───────────────────────────────────────────────────────────────────────────┘
```
- Line actions: qty ±, note ("no ice"), modifiers, guest label (seat/person — answers "who ordered what"), void (before send: free; after send: reason + permission).
- **Attach member**: search or scan member QR → discount applied automatically to eligible lines; Junior members block `ageRestricted` lines.
- **Send to kitchen**: new lines go to KDS by station; line status `new`.

### Payment
- Methods: cash (tendered + change), card (reference/last-4 or terminal approval code), UPI (show club UPI QR with amount; Razorpay QR when online [RE]; staff confirms receipt), tab, wallet [RE].
- **Split**: by amount, equally by N, or by items/guest label. Each split part is a payment on the same order (`payments[]`), order `paid` when sum = total.
- Receipt: print (ESC/POS via browser print fallback), SMS/email to member.

### Tabs
- Open a tab from order screen (member or name + phone). Orders with "Add to tab" → status `on_tab`; tab balance updates.
- Tabs list: all open tabs with balance, opened by, time, table. Tabs survive shift changes and devices (server-side).
- Settle: shows all orders on the tab → pay (split allowed) → each order marked `paid`, tab `settled`.
- Optional tab limit (`settings.tabLimitPaise`, members only by default); closing a session with open tabs warns and lists them (tabs transfer to next session).

### KDS (`admin/kds?station=kitchen|bar`)
Columns: New · In progress · Ready. Ticket shows table, guest labels, items, notes, elapsed timer (amber > 10 min, red > 15 min). Tap to advance. Ready → POS gets `ticket.ready` toast "Table 12 · Sandwich ready". Realtime via socket room `kds:{loc}:{station}`.

### Close session (Z-report)
Count cash (denomination helper) → expected vs counted, variance (requires note if ≠ 0; manager approval if > `settings.cashVarianceApprovalPaise`) → Z-report: totals by payment method, by category, discounts given, voids, refunds, tabs opened/settled, top items, orders count, average ticket. PDF + saved in `posSessions.zReport`.

**"What did the bar earn today"** = daily bar report aggregating all bar sessions for `localDate` (see [[15-Dashboard-Reports]]).

## 3. Backend

### Services
| Service | Methods |
|---|---|
| `PosSessionService` | `open`, `switchCashier(pin)`, `close(counted)`, `zReport(sessionId)` |
| `PosOrderService` | `upsertOrder(clientOrderId, lines)` (create or add lines), `sendToKitchen`, `voidLine`, `attachMember`, `applyDiscount(manual, approval)`, `pay(payments[])`, `addToTab`, `refund` |
| `TabService` | `open`, `settle(payments[])`, `transfer`, `void` (manager) |
| `TableService` | status changes, merge/move tables |
| `KdsService` | `listOpenTickets(station)`, `setLineStatus` |

### Rules
- **Idempotency:** the tablet generates `clientOrderId` (UUID) when the order screen opens; every write includes it plus a monotonically increasing `revision`. Unique index on `clientOrderId` means a retried request never creates a duplicate order.
- Pricing uses the shared `computeLine()` + `barDiscountPct(entitlements)`. Discount snapshot stored on each line.
- Paying an order (one transaction): validate session open, sum of payments = due, create `payments` (`posSessionId`), create invoice (`revenueStream: bar` or `shop`), for stocked items call `InventoryService.move(type: sale_pos)`, update table/tab status, audit.
- Voids after kitchen send, manual discounts > `settings.maxStaffDiscountPct`, and refunds require a manager PIN (`pos_order.approve`) — captured as `approvedBy` on the line/order and audited.
- Payment methods allowed per terminal (`allowedPaymentMethods`).

### "20 people at once" performance
- Menu + prices + member discount rules loaded once per session into the client (`GET /api/pos/bootstrap?terminalId=` → categories, products, variants, taxes, tables, open tabs). No product fetches per tap.
- Cart math happens client-side with the **same** `computeLine` code from `packages/shared`; the server recalculates and is authoritative (returns totals; client reconciles).
- Writes are small (`PATCH /api/pos/orders/:clientOrderId` with line diffs), optimistic UI, retry with the same idempotency key.
- Mongo indexes on `posOrders.clientOrderId`, `sessionId`, `tabId`.
- Target: p95 < 200 ms for add line / pay; 20 concurrent order writes in the load test.
- [RE] Offline queue: if the network drops, keep writes in IndexedDB queue and replay (safe due to idempotency). Only if BFS.server already has this pattern; otherwise post-hackathon.

## 4. API
| Method | Path | Perm |
|---|---|---|
| GET | `/api/pos/bootstrap?terminalId=` | `pos.create` |
| POST | `/api/pos/sessions` (open) · `/api/pos/sessions/:id/close` · GET `/api/pos/sessions/:id/z-report` | `pos.create` (own) |
| POST | `/api/pos/sessions/:id/switch-cashier` | PIN |
| PUT | `/api/pos/orders/:clientOrderId` | `pos.create` |
| POST | `/api/pos/orders/:clientOrderId/{send,pay,add-to-tab,void-line,discount,attach-member}` | `pos.create` (+approval where noted) |
| POST | `/api/pos/orders/:id/refund` | `pos_order.refund` |
| GET/POST | `/api/pos/tabs` · `/api/pos/tabs/:id/settle` | `pos.create` |
| GET/PATCH | `/api/pos/tables` | `pos.create` |
| GET | `/api/kds/tickets?station=` · PATCH `/api/kds/lines/:lineId` | `kds.view/edit` |
| CRUD | `/api/admin/pos/terminals`, `/api/admin/floors`, `/api/admin/tables` | `pos.manage` |

## 5. Tests
- Same `clientOrderId` PUT twice in parallel → one order.
- Gold member attached → 15% on eligible lines only; Junior blocked from age-restricted product.
- Split payment 3 ways sums exactly (rounding residue goes to last part).
- Tab across two sessions settles correctly; Z-report of session 1 shows it as open tab, not revenue.
- Close session with variance requires note; Z-report totals equal sum of payments.
- Load: 20 virtual cashiers × 10 orders each (autocannon/k6) without errors.
