# 22 · API Reference (inventory)

Conventions: [[05-Backend-Conventions]]. Envelope `{data, meta}` / `{error}`. All POST creates for money/booking/order/POS require `Idempotency-Key`. Lists accept `page, pageSize, sort, q` + filters. Auth: **P** public, **M** member (own data), **S** staff with permission, **K** MCP credential, **W** webhook signature.

> Cursor keeps this file current: every new or changed endpoint is added in the same PR.

## Detailed example

```
POST /api/bookings                                  Auth: M  Permission: self.booking.create
Headers: Idempotency-Key: <uuid>
Request:  { courtId, startUtc, participants?: [{memberId?|name}], paymentMode: "online"|"wallet"|"desk"|"free" }
Validation (zod + service):
  court active · start aligned to 30 min · inside operating hours · not past ·
  within advanceBookingDays · active membership (else walk-in price + notice) ·
  entitlement (e.g. Junior off-peak) · daily limit · slot free (unique index)
Response 201: { data: { booking, price: {basePaise, discountPaise, taxPaise, totalPaise, rule},
               payment?: { intentId, provider, amountPaise, keyId } } }
Errors: 409 SLOT_UNAVAILABLE {alternatives[]} · 409 DAILY_LIMIT_REACHED · 403 ENTITLEMENT_DENIED ·
        422 OUTSIDE_OPERATING_HOURS · 422 BOOKING_WINDOW_EXCEEDED · 409 IDEMPOTENCY_CONFLICT · 422 VALIDATION_ERROR
```

Each module doc lists its own request/response details; this is the full inventory.

## Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | P | email/phone + password → access token + refresh |
| POST | `/api/auth/refresh` | P (refresh cookie/body) | rotates refresh token |
| POST | `/api/auth/logout` | M/S | revokes refresh |
| POST | `/api/auth/otp/request`, `/api/auth/otp/verify` | P | member phone login; rate-limited |
| POST | `/api/auth/register` | P | member self-register |
| POST | `/api/auth/password/forgot`, `/reset` | P | |
| GET | `/api/auth/me` | M/S | user + permissions |
| POST | `/api/pos/sessions/:id/switch-cashier` | S | PIN |

## Public
| Method | Path |
|---|---|
| GET | `/api/public/club` · `/api/public/sports` · `/api/public/sports/:key` |
| GET | `/api/public/membership-plans` |
| GET | `/api/public/availability?sport=&date=&days=` |
| GET | `/api/public/products?category=&q=&minPrice=&maxPrice=&size=` · `/api/public/products/:slug` · `/api/public/categories` |
| GET | `/api/public/menu` |
| POST | `/api/public/enquiries` · `/api/public/trials` |
| GET/POST | `/api/public/quotes/:token` · `/api/public/quotes/:token/accept` |

## Member (`/api/me`, `/api/bookings`, `/api/orders`, `/api/ai`)
| Method | Path |
|---|---|
| GET/PATCH | `/api/me` · GET `/api/me/home` · GET `/api/me/qr-token` · POST `/api/me/push-tokens` |
| GET | `/api/me/membership` · POST `/api/me/membership/purchase` · `/renew` · `/upgrade` |
| GET | `/api/availability?sport=&date=` |
| POST | `/api/bookings` · `/:id/pay` · `/:id/confirm-payment` · `/:id/cancel` · `/:id/reschedule` |
| GET | `/api/me/bookings?status=` |
| GET | `/api/social-sessions` · POST `/api/social-sessions/:id/join` · `/leave` |
| GET | `/api/me/pricing/products?ids=` |
| GET/PUT | `/api/cart` |
| POST | `/api/orders/checkout` · `/api/orders/:id/pay` · `/api/orders/:id/confirm-payment` |
| GET | `/api/me/orders` · `/api/me/orders/:id` · POST `/api/me/orders/:id/cancel` |
| GET | `/api/me/tabs` · `/api/me/pos-orders` · `/api/me/invoices` · `/api/me/invoices/:id/pdf` |
| GET | `/api/me/wallet` [RE] · POST `/api/me/wallet/topup` [RE] |
| GET | `/api/me/notifications` · POST `/api/me/notifications/:id/read` |
| POST | `/api/me/support` |
| POST | `/api/ai/chat` (SSE) · GET/DELETE `/api/ai/conversations[/:id]` · POST `/api/ai/actions/:id/confirm` · `/cancel` |
| POST | `/api/leave` (staff self) · GET `/api/me/shifts` (staff self) |

## Admin (`/api/admin/*`, staff, permission in brackets)
| Area | Endpoints |
|---|---|
| Dashboard | GET `/dashboard?period=&from=&to=` [dashboard.view] |
| Members | GET `/members` · `/members/search?q=` · `/members/:id` · `/members/:id/timeline` · `/members/by-qr/:token` · POST `/members` · PATCH `/members/:id` · POST `/members/:id/archive` · GET `/members/export` [member.*] |
| Memberships | GET `/memberships` · POST `/memberships` (purchase) · `/:id/renew` · `/:id/upgrade` · `/:id/cancel` · POST `/memberships/reminders` [membership.*] |
| Plans | CRUD `/membership-plans` [membership_plan.*] |
| Facilities | CRUD `/sports`, `/courts`, `/court-blocks` [court.*] |
| Bookings | GET `/bookings` · `/bookings/calendar` · POST `/bookings` · PATCH `/bookings/:id` · POST `/bookings/:id/{cancel,reschedule,check-in,no-show,refund}` · POST `/bookings/bulk-cancel` [booking.*] |
| Social | CRUD `/social-sessions` · POST `/social-sessions/:id/participants` [social_session.*] |
| Catalogue | CRUD `/categories`, `/products`, `/products/:id/variants` · POST `/uploads` [product.*] |
| Inventory | GET `/inventory` · `/inventory/low-stock` · `/stock-moves` · POST `/inventory/adjust` · `/inventory/receive` [inventory.*] |
| Purchasing | CRUD `/purchase-orders` · POST `/purchase-orders/:id/{send,receive,cancel}` · POST `/purchase-orders/from-low-stock` [purchase_order.*] |
| Orders | GET `/orders` · `/orders/:id` · `/orders/by-pickup-code/:code` · POST `/orders/:id/{accept,ready,collect,dispatch,deliver,fail,cancel,refund}` [order.*] |
| POS | GET `/pos/bootstrap` · POST `/pos/sessions` · `/pos/sessions/:id/close` · GET `/pos/sessions/:id/z-report` · PUT `/pos/orders/:clientOrderId` · POST `/pos/orders/:clientOrderId/{send,pay,add-to-tab,void-line,discount,attach-member}` · POST `/pos/orders/:id/refund` · GET/POST `/pos/tabs` · POST `/pos/tabs/:id/{settle,transfer,void}` · GET/PATCH `/pos/tables` (prefix `/api/pos`) [pos.*] |
| KDS | GET `/api/kds/tickets?station=` · PATCH `/api/kds/lines/:lineId` [kds.*] |
| POS config | CRUD `/pos/terminals`, `/floors`, `/tables` [pos.manage] |
| CRM | GET/POST `/leads` · GET/PATCH `/leads/:id` · POST `/leads/:id/{activities,assign,stage,convert,lost}` · CRUD `/quotes` · POST `/quotes/:id/send` [lead.*, quote.*] |
| Finance | GET/POST `/invoices` · GET `/invoices/:id[/pdf]` · POST `/invoices/:id/{post,credit-note,send,record-payment}` · GET `/payments` · GET `/payments/settings` · GET `/receivables` · GET `/payables` · CRUD `/expenses` · GET/POST `/reconciliation/:localDate` · GET `/tax-summary` [invoice.*, payment.*, expense.*] — **Phase 4 live:** invoices, payments, record-payment, credit-note, pdf; receivables/payables/expenses/recon in Phase 13 |
| Customers | GET/POST `/customers` · GET/PATCH `/customers/:id` · POST `/customers/:id/archive` [customer.*, member.*, invoice.*] — **Phase 4** |
| HR | CRUD `/employees` · CRUD `/shifts` · POST `/shifts/{publish,copy-week}` · POST `/attendance/{clock-in,clock-out}` · GET `/attendance` · GET `/leave` · POST `/leave/:id/{approve,reject}` · POST `/payroll-runs` · PATCH `/payroll-runs/:id/lines/:employeeId` · POST `/payroll-runs/:id/{approve,pay}` · GET `/payroll-runs/:id/payslips/:employeeId.pdf` [employee.*, shift.*, leave.*, payroll.*] |
| Reports | GET `/reports/:report?from=&to=&...` · GET `/reports/:report/export?format=csv|pdf` [report.*] |
| AI | GET `/ai/conversations` · GET `/ai/conversations/:id` [ai_admin.view] · GET/PATCH `/ai/settings` [ai_admin.manage] |
| MCP | GET/POST `/mcp/keys` · POST `/mcp/keys/:id/revoke` · GET `/mcp/activity` [mcp.manage] |
| Settings | GET/PATCH `/settings` · CRUD `/locations`, `/taxes`, `/users`, `/roles`, `/notification-templates` · GET `/audit` · GET `/audit/export` [settings.manage, user.*, role.*, audit.*] — **Phase 4 live:** settings, locations, taxes |

## MCP backend (`/api/mcp/*`, auth K)
One endpoint per MCP tool in [[20-MCP-Server#2. Tools]] (e.g. GET `/api/mcp/club-summary`, POST `/api/mcp/purchase-orders/prepare`), plus POST `/api/mcp/actions/:id/confirm` and `/cancel`.

## Webhooks and system
| Method | Path | Auth |
|---|---|---|
| POST | `/api/webhooks/razorpay` | W |
| POST | `/api/payments/mock/:intentId/{succeed,fail}` | dev/demo only (`PAYMENTS_PROVIDER=mock`) |
| GET | `/api/health` (liveness) · `/api/health/ready` (DB ping) | P |
