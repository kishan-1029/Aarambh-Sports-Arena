# 28 · Risks, Mitigations and Recommended Extensions

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Judges expect Odoo itself to be used | Could cost points in an Odoo hackathon | Confirm rules early. Domain mirrors Odoo apps ([[02-Architecture#3. Odoo alignment]]). If required, add the Odoo connector below for accounting/contacts sync and show it in the demo. |
| Existing codebase conflicts with these docs | Rework, broken login | Phase 0 audit; existing conventions win unless they break a requirement; ADRs |
| Scope too large for the timeline | Unfinished demo | Hackathon cut line in [[26-Implementation-Phases]]; seed data so screens look alive |
| Booking race conditions | Core requirement fails | Unique slot locks + transactions + concurrency suite in CI |
| Atlas credentials leaked (already shared in chat) | Data breach / tampering | Rotate password now; `.env` only; restrict network access |
| ChatGPT connector auth (OAuth requirement) | MCP demo blocked | Copy project360's working setup; test connection on day 1 of Phase 17, not demo day |
| LLM latency/cost | Slow or failing assistant demo | Stub provider for tests, token budgets, short tool results, fallback links |
| Payment provider in demo | Live-money risk, flaky network | `mock` provider by default; Razorpay test mode only |
| Time zone bugs (UTC vs IST) | Wrong "today", wrong daily limit | All day logic via `lib/time`; tests at 23:30 and 00:30 IST |
| Tax rates wrong | Incorrect invoices | Configurable taxes; accountant verification before real use |
| Mobile build friction (native modules) | Demo app won't run | Expo Go + mock payments path always works |

## Odoo connector [RE]
If Odoo must be in the loop, keep this platform as the operational front-end and sync to Odoo for books of record:
- `modules/integrations/odoo/` using Odoo's external JSON-RPC/XML-RPC API with a dedicated API user.
- One-way sync (event-driven, retried by the worker): `customers` → `res.partner`; posted `invoices`/credit notes → `account.move`; `payments` → `account.payment`; `employees` → `hr.employee`; approved `leaveRequests` → `hr.leave`.
- `externalRefs: { odooId }` field on synced documents; sync status page in admin; failures never block club operations.
- This lets the club use Odoo Accounting for statutory reports while staff work in the purpose-built booking/POS UI.

## Recommended Extensions (beyond the problem statement)
| Extension | Why |
|---|---|
| Wallet / club credit | Refunds and prepaid balances without card refunds |
| Loyalty points | Retention; earn on bookings/shop/bar, redeem as discount |
| Coaching module | Coaches, packages, recurring lessons (court blocks + attendance) |
| Waitlist for full slots | Fill cancellations automatically; notify first in line |
| Recurring bookings | Weekly fixed slots for regulars (each occurrence still uses slot locks) |
| Dynamic peak pricing | Higher evening rates already modelled via peak windows; extend with demand rules |
| Offline POS queue | Keep selling if Wi-Fi drops; replay via idempotency keys |
| Razorpay payment links / auto-settlement fetch | Faster B2B collection and reconciliation |
| Shareable report links | Owner shares numbers with partners/accountant without logins |
| Staff mobile app | Shifts, leave requests, clock-in from phone |
| Multi-location | Data model already has `locationId`; add location switcher |
| WhatsApp Business API notifications | Meet members where they already are (booking confirmations, reminders) |
