# 01 · Requirements Traceability

The problem statement is the source of truth. Every row below quotes a scene requirement (paraphrased) and maps it through to the implementation. **[PS]** = problem statement. **[RE]** = Recommended Extension.

## Current state the product must replace [PS]

| Today | Replaced by |
|---|---|
| Court bookings over WhatsApp | Booking engine + website/mobile/front-desk booking ([[08-Booking-Engine]]) |
| Member lists in Excel | Member registry + membership lifecycle ([[07-Membership]]) |
| Bar receipts on paper | Bar POS with tabs, KDS and daily closing ([[11-Bar-POS]]) |
| Availability checked by phone | Public live availability grid ([[17-Website]]) + front desk board ([[09-Front-Desk]]) |
| No revenue visibility | Owner dashboard, reports, ChatGPT via MCP ([[15-Dashboard-Reports]], [[20-MCP-Server]]) |

## Scene 1 — A new member walks in

| # | Requirement [PS] | Module | Collections | Key API | Admin / Front desk | Member app / Web | Report |
|---|---|---|---|---|---|---|---|
| 1.1 | Know who they are | Members | `members`, `users` | `POST /api/members` | Front desk → Register member | Register screen | New members |
| 1.2 | Which plan (Gold / Silver / Junior) | Membership | `membershipPlans`, `memberships` | `POST /api/memberships` | Membership step in registration | Membership screen | Members by tier |
| 1.3 | What the plan entitles them to: court rates, shop discount, bar discount | Membership entitlements (embedded in plan, snapshotted on membership) | `membershipPlans.entitlements` | `GET /api/members/:id/entitlements` | Plan editor | Benefits card | — |
| 1.4 | Membership runs out; nobody should have to remember | Expiry job + reminders | `memberships.endDate`, `notifications` | cron `membership.expiry` | Expiring list on dashboard | Push/email reminder | Expiring memberships |
| 1.5 | Any staff can recognise them quickly | Universal member search (name, phone, member code, QR) | `members` text index | `GET /api/members/search?q=` | Front-desk search bar (⌘K) | Member QR card | — |
| 1.6 | See their history with the club | Member 360 timeline | `activityEvents` (+ bookings, orders, posOrders, payments) | `GET /api/members/:id/timeline` | Member profile → Timeline | My activity | — |
| 1.7 | Junior = under 18 | Plan eligibility rule `maxAge: 17` validated against DOB | `members.dob` | validation in `MembershipService` | Error message on wrong tier | — | — |

## Scene 2 — Booking a court on a busy evening

| # | Requirement [PS] | Implementation |
|---|---|---|
| 2.1 | Members messaging, walk-in at counter, phone caller — all at once | Single booking service used by mobile, website, front desk; real-time board via Socket.IO |
| 2.2 | Sessions last one hour | `court.sessionMinutes = 60` (configurable per sport) |
| 2.3 | New slot opens every half hour | `court.slotStepMinutes = 30`; a 60-min booking occupies two 30-min **slot units** |
| 2.4 | Each member plays at most twice a day | `memberDayCounters` atomic counter with `count < maxBookingsPerDay` guard (plan entitlement, default 2) |
| 2.5 | Members pay less than walk-ins, or nothing, depending on plan | `PricingService`: plan `courtRate` (`free` / `discountPct` / `fixed`) vs walk-in rate; peak/off-peak on court |
| 2.6 | Plans change | Entitlements snapshotted on each booking; plan edits create a new plan version, don't rewrite history |
| 2.7 | People cancel | Cancellation policy (free until N hours before), slot release, refund/credit |
| 2.8 | Friday-night social play: many people share one court | `SocialSession` with capacity and participants; court blocked for the session |
| 2.9 | Two people must **never** be on the same court at the same time | Unique index on `slotLocks {court, slotStart}` + transaction. See [[08-Booking-Engine#Concurrency]] |
| 2.10 | Courts: tennis and cricket (intro also names padel, badminton) | `sports` collection is data, not code; seed Tennis, Cricket (nets), Padel, Badminton |

## Scene 3 — Gearing up before a match

| # | Requirement [PS] | Implementation |
|---|---|---|
| 3.1 | Racket string snaps 10 minutes before play → quick counter sale | Shop POS mode (barcode/search → pay) at front desk |
| 3.2 | Order from home, collect at the club | Online order `fulfilment: "pickup"` with ready notification + pickup code |
| 3.3 | …or have them delivered | `fulfilment: "delivery"` with address, fee, delivery status |
| 3.4 | Sells rackets, balls, shoes, accessories, apparel | `productCategories` seed; products with variants (size/colour) |
| 3.5 | Always know what's in stock; know when low | `stockItems.onHand/reserved`, `reorderLevel`, low-stock alert + dashboard widget |
| 3.6 | Counter and online come from the **same shelf** | One `stockItems` record per variant per location; counter and online both call `InventoryService` |

## Scene 4 — After the match, at the bar

| # | Requirement [PS] | Implementation |
|---|---|---|
| 4.1 | 20 people arrive at once | Tap-to-add POS grid, optimistic UI, idempotent order API, KDS over websockets |
| 4.2 | Orders scribbled on paper; kitchen asks who ordered what | Kitchen tickets with table, seat/guest name, item status ([[11-Bar-POS#KDS]]) |
| 4.3 | Tabs get lost | `Tab` entity tied to member or table, visible across shifts until settled |
| 4.4 | Members get discount without asking | Attach member (search/QR) → `PricingService` auto-applies plan bar discount |
| 4.5 | Run a tab and settle before leaving | Open tab → add orders → settle (split allowed) |
| 4.6 | Cash, card or UPI | Payment methods `cash`, `card`, `upi` (+ `tab`, `wallet` [RE]) |
| 4.7 | Staff work in shifts | `posSessions` (cash drawer open/close) per staff + HR `shifts` |
| 4.8 | Tables need to be tracked | `tables` with live status (free / occupied / bill requested) |
| 4.9 | At closing, what did the bar earn today? | Z-report on session close + daily bar report |

## Scene 5 — A stranger finds the club online

| # | Requirement [PS] | Implementation |
|---|---|---|
| 5.1 | Club has no website | Public website (SEO) [[17-Website]] |
| 5.2 | See the club, plans and prices | Home, Sports, Membership pages from live data |
| 5.3 | See what is free this week | Public availability grid (read-only, no personal data) |
| 5.4 | See what the shop sells | Public shop catalogue |
| 5.5 | Book a trial session on the spot | Trial booking flow → creates lead + booking with `type: "trial"` |
| 5.6 | Enquiry must not vanish | Enquiry form → `leads` + auto-assignment + notification to staff + SLA timer |
| 5.7 | Follow up, send a quote, welcome a new member | Lead pipeline: New → Contacted → Trial → Quoted → Won/Lost; Quote PDF/email; convert lead → member |

## Scene 6 — The owner, at the end of the month

| # | Requirement [PS] | Implementation |
|---|---|---|
| 6.1 | How much did we earn | Revenue = sum of posted invoice lines by revenue stream |
| 6.2 | From where | Revenue streams: `court`, `membership`, `shop`, `bar`, `other` |
| 6.3 | What do we owe | Payables: vendor bills, payroll payable, tax payable |
| 6.4 | Money by card, cash and online, all in one place | `payments` ledger with method + channel; reconciliation report |
| 6.5 | Memberships to invoice | Auto invoice on membership purchase/renewal |
| 6.6 | Business clients to invoice | B2B customers (company `customers`), manual/recurring invoices, credit terms |
| 6.7 | Employees to pay | Payroll run (simple: base + allowances − deductions) → payable → payment [[13-Staff-HR]] |
| 6.8 | Leave to approve | Leave requests + approval workflow |
| 6.9 | Taxes to report | GST on every invoice line, tax summary report (output tax by rate) |
| 6.10 | How is the club doing today / this week / this month | Dashboard with period switcher |
| 6.11 | Share the numbers | Export CSV/PDF, shareable read-only report link [RE], ChatGPT via MCP |

## Recommended Extensions (and why)

| [RE] | Why it's needed |
|---|---|
| Audit log | Owner trust and dispute resolution ("who cancelled my booking?") |
| Wallet / club credit | Clean way to refund cancellations without card refunds |
| Notifications (email/SMS/push) | Required in practice for expiry reminders and click-and-collect "ready" messages |
| AI member assistant | Replaces the WhatsApp channel members already use, with the same natural-language habit |
| Management MCP for ChatGPT | Answers the owner's "how much did we earn, from where" in plain language |
| Loyalty points | Low-cost retention; optional, after the core is done |
| Multi-location | Data model supports `locationId` everywhere; UI shows one club by default |
