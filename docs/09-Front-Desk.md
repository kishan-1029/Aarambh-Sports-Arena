# 09 · Front Desk

Problem statement: *"A front desk handles walk-ins, phone calls and staff schedules."* and the 6 pm scene: members messaging, a walk-in at the counter, someone on the phone asking what's free.

Route: `admin/front-desk` — full-width layout, no sidebar, optimised for keyboard and touch. Permission: `front_desk` role (`member.view`, `booking.create`, `pos.create` in front_desk mode, `lead.create`).

## Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [🔍 Search member / phone / code / scan QR  (/) ]   Sat 3 Oct · 18:04  👤 Priya│
├───────────────────────────────┬────────────────────────────────────────────┤
│ COURT BOARD (now → +4h)       │ CONTEXT PANEL                               │
│ Tennis 1 ■■□□■■□□             │  (empty) → "Next up" list: arrivals in 60m  │
│ Tennis 2 ■■■■□□□□             │  (member selected) → Member card:           │
│ Padel 1  □□■■■■□□             │   photo · Gold · expires 12 Nov · 1/2 today │
│ Cricket  ▨▨▨▨ (blocked)       │   [Book] [Sell] [Bar tab] [Renew] [Check in]│
│  click free cell → quick book │   Today's bookings · open tab · last visits │
├───────────────────────────────┴────────────────────────────────────────────┤
│ [F2 Walk-in booking] [F3 New member] [F4 Counter sale] [F6 Enquiry] [F8 Check-in] │
└────────────────────────────────────────────────────────────────────────────┘
```

## Flows (target: each under 30 seconds)

| Flow | Steps |
|---|---|
| **Recognise member** | Type 3+ chars or scan QR → top result auto-selected → member card with tier, expiry (red if <7 days / expired), bookings left today, open tab, alerts (unpaid invoice, expiring). |
| **Register member** (F3) | Drawer: name, phone (dedupe check on blur), email, DOB (auto-suggest Junior if <18 and require guardian), photo (webcam capture optional) → plan picker cards with price → payment (cash/card/UPI/send link) → done: member code + app invite SMS/email. |
| **Phone caller "what's free?"** | Court board is always visible; sport filter; "Next free on any court" button returns the next 5 starts. |
| **Walk-in booking** (F2) | Click a free cell → drawer prefilled court/time → "Walk-in" tab: name + phone → price shown with rule → take payment → confirmed; receipt print/SMS. |
| **Member booking** | Member selected → click cell → member price, daily-limit check shown before submit. |
| **Check in** (F8) | Scan QR or select member → today's bookings → check in. |
| **Counter sale** (F4) | Opens POS in `front_desk` mode with selected member attached (discount auto-applied). Racket-string scene: search "string" → restring service + string product → pay. |
| **Start bar tab** | Opens bar POS tab for the member. |
| **Enquiry** (F6) | Quick lead form: name, phone, interest, note, assign → creates lead; shows in CRM. |
| **Cancellations** | Member card → booking → cancel with reason; refund rules preview. |
| **Renew** | Member card → Renew → plan + months → payment. |

## Technical notes

- Search hits `GET /api/admin/members/search?q=` debounced 150 ms, `AbortController` to cancel stale requests.
- Court board uses `GET /api/admin/bookings/calendar` + socket room `court-board:{loc}:{date}`; optimistic lock on click is **not** done — the server is the authority; on `SLOT_UNAVAILABLE` the drawer shows alternatives returned in the error.
- Keyboard map registered with a single `useHotkeys` hook; `/` focuses search; `Esc` closes drawers.
- The front desk terminal also has a POS session (`mode: front_desk`) so cash taken for walk-ins and memberships reconciles at shift close.

## Acceptance
- [ ] From an empty screen, a walk-in booking with cash payment completes in ≤ 6 interactions.
- [ ] Member search returns within 200 ms on 5,000 seeded members.
- [ ] Two front-desk tabs clicking the same free cell: one confirms, the other shows "just booked" + alternatives.
- [ ] Expired member is visibly flagged and booking falls back to walk-in price with an explanation.
