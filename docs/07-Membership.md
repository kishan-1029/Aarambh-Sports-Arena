# 07 · Members and Membership

Problem statement: *"Someone signs up at the front desk. The club needs to know who they are, which plan they are on (Gold, Silver or Junior), and what that plan entitles them to… Their membership will run out one day, and nobody should have to remember when… any member of staff should be able to recognise them quickly and see their history."*

Collections: `customers`, `members`, `membershipPlans`, `memberships`, `activityEvents` ([[04-Database-Schema#C. Customers, members, memberships]]).

## 1. Services

### `MemberService`
| Method | Rules |
|---|---|
| `register(ctx, input)` | Find existing customer by phone/email first (dedupe → return `409 MEMBER_EXISTS` with the existing member's id so the UI can open it). Create `customer` + `member` (status `prospect`) in one transaction. Generate `memberCode` via counter. If age < 18, `guardian` required. Optionally create `user` (kind member) and send app invite. |
| `search(ctx, q)` | Ranked: exact `memberCode` → exact phone (normalised, last 10 digits) → text index on names/email. Returns compact cards `{id, memberCode, name, photoUrl, tierKey, status, membershipEndDate, phone (masked for roles without member.view full)}`. Target p95 < 150 ms. |
| `getProfile(ctx, id)` | Member + current membership + entitlements + counts (bookings this month, open tab, wallet). |
| `timeline(ctx, id, {cursor})` | `activityEvents` paginated by `at`. |
| `update`, `archive`, `merge(sourceId, targetId)` [RE] | Merge moves bookings/orders/payments refs; audit. |
| `qrToken(ctx, id)` | Signed short token (HMAC, 24 h) for the member's app QR; front desk scans → `GET /api/admin/members/by-qr/:token`. |

### `MembershipService`
| Method | Rules |
|---|---|
| `quote(memberId, planId, months)` | Eligibility (age vs `plan.eligibility`), price, tax, start date = today or day after current membership ends (renewal). |
| `purchase(ctx, {memberId, planId, months, paymentMethod, startDate?})` | Transaction: create membership `pending_payment` (or `active` if paid at desk), snapshot entitlements, create invoice line `revenueStream: membership`, create payment if cash/card/upi at desk. On activation: set `members.currentMembershipId/tierKey/status=active/membershipEndDate`. Partial unique index prevents two active memberships. |
| `renew(ctx, membershipId, months)` | New membership with `renewalOfId`, `startDate = old.endDate + 1 day` → status `pending_payment`/`scheduled` until start. (Add status `scheduled`.) |
| `upgrade(ctx, membershipId, newPlanId)` | Pro-rata credit: `remainingDays / totalDays × paid`. Old → `upgraded`, new starts today. Credit note for the unused part, new invoice for the new plan. |
| `cancel(ctx, id, {reason, refund})` | Requires `membership.cancel`; refund optional (`finance.refund`). High-risk in AI/MCP. |
| `entitlementsFor(memberId, atDate)` | Returns active membership's `entitlementsSnapshot` or the **non-member defaults**. Single source used by booking, shop and POS pricing. Cache per request. |
| `expireDue()` (worker) | `status active, endDate < now` → `expired`; member `status expired, tierKey none`; event `membership.expired`. |
| `sendReminders()` (worker) | 30/7/1/0 days before `endDate`; tracks `reminderSentAt.*` so each sends once. Also creates a dashboard alert and a front-desk badge. |

### Plan versioning
Editing price or entitlements of a plan with active memberships creates `version + 1` and archives the old version. Existing memberships keep their snapshot ("plans change" in the PS should never silently change what someone already paid for).

## 2. Entitlement application (single helper)

```js
// modules/membership/entitlements.js
applyCourtPricing({ entitlements, basePaise })  -> { pricePaise, rule }
shopDiscountPct(entitlements, product)          -> 0 if !product.memberDiscountEligible
barDiscountPct(entitlements, product)           -> 0 if product.ageRestricted && member is junior (and line is blocked)
canBookCourt(entitlements, court, slotStart)    -> { ok, code }
```

## 3. Admin screens

**Members → Members list**
- Columns: Photo, Name, Member code, Tier (coloured chip), Status, Phone, Expires (red < 7 days), Last visit, Bookings (30 d), Actions.
- Filters: tier, status, expiring in (7/30 days), joined date range, has open tab, source.
- Search: global `q`. Sort: name, joined, expires, last visit. Bulk: export CSV, send reminder, assign tag.
- Empty state: "No members yet — register the first one" (button). Loading: skeleton rows.

**Member profile (360)** — header card: photo, name, code, tier chip, status, expiry countdown, QR, quick actions (Book court, New sale, Renew, Open tab, Edit). Tabs:
1. Overview: entitlements card ("Court: free · Shop 15% · Bar 15% · 2 bookings/day"), upcoming bookings, open tab, wallet, last 5 activities.
2. Membership history (all memberships, invoices).
3. Bookings.
4. Purchases (shop orders + POS shop receipts).
5. Bar (POS bar orders, tabs).
6. Payments and invoices.
7. Enquiries/interactions (linked lead + activities).
8. Timeline (everything).

**Membership plans** — card grid; editor form: name, key, colour, durations table (months/price), eligibility, court access/pricing/limits, shop %, bar %, perks, tax. Warning banner if editing creates a new version.

**Memberships** — list with status filter (active, expiring, expired, pending payment), renew/cancel actions.

## 4. Member app and website
- Membership screen: current plan card, expiry countdown, benefits, renew button (payment), plan comparison.
- Website: public plan comparison from `GET /api/public/membership-plans` (only `active`, current version, no internal fields).

## 5. Tests
- Junior purchase with DOB → 18 years old today fails (`ENTITLEMENT_DENIED`/validation).
- Two concurrent `purchase` calls for one member → exactly one active membership.
- Renewal starts the day after the current end date.
- Plan edit with active memberships creates a new version; old membership keeps old discount.
- Expiry job sets statuses; reminder job is idempotent (run twice → one notification).

## Implementation notes (Phase 5)

- Modules: `Odoo.Server/src/modules/members/*`, `Odoo.Server/src/modules/membership/*` (ADR-0005).
- Money in paise; dates via `lib/time` (UTC + IST `localDate`); multi-doc writes use `withTransaction`.
- Partial unique index on `memberships.memberId` where `status: active` enforces one active membership.
- Plan edits that touch price/entitlements while memberships are active archive the old version and create `version+1`; existing memberships keep `entitlementsSnapshot`.
- Worker jobs `membership.expire` / `membership.reminders` call `expireDue` / `sendReminders` (idempotent via `reminderSentAt.*`).
- Admin: Members list, Member 360 (overview / membership / timeline), Plans card grid, Memberships list — Bootstrap (ADR-0006); nav Soon badges removed for these routes.
- Seed: Gold / Silver / Junior plans + demo members (incl. one expiring within 7 days) tagged `isDemo`.
- Envelope `{ isOk }` (ADR-0004); session auth (ADR-0002).
