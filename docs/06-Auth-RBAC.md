# 06 · Authentication, RBAC and Audit

## 1. Authentication

> VERIFY IN CODEBASE: reuse the existing login, hashing and JWT code. Add only what's missing below.

| Actor | Method |
|---|---|
| Staff (admin, POS, front desk) | Email/phone + password → access JWT (15 min) + refresh token (7 days, rotated, stored hashed in `refreshTokens`). Web: refresh token in `httpOnly; Secure; SameSite=Lax` cookie; access token in memory. |
| POS quick switch | Staff **PIN** (4–6 digits, hashed) to switch the active cashier on an already-logged-in terminal. PIN only works on a device with a valid terminal session. Rate-limited, 5 attempts → lock 5 min. |
| Members (mobile) | Phone + OTP **or** email + password. Tokens in `expo-secure-store`. Refresh via body (no cookies on RN). |
| Members (website) | Same API; cookie-based refresh like admin. |
| MCP service | `Authorization: Bearer ck_live_<prefix>_<secret>` API key → resolves `actingUserId` + `scopes`. Optional OAuth 2.1 for ChatGPT, see [[20-MCP-Server#Auth]]. |
| Payment webhooks | Signature verification (Razorpay `X-Razorpay-Signature`), no user. |

OTP: `otpCodes {phone, codeHash, expiresAt (TTL 5 min), attempts}`. In dev/demo, `OTP_DEV_BYPASS=123456` (refused when `NODE_ENV=production`).

JWT claims: `{ sub: userId, kind: staff|member, roles: [...], perms_v: <roleVersionHash>, locationId, tv: tokenVersion }`. Permissions are loaded from roles (cached in memory 60 s) — not embedded in the token — so role edits take effect quickly.

## 2. Roles

Mapped to responsibilities in the problem statement:

| Role key | Who at The Champions Club | Scope |
|---|---|---|
| `owner` | Club owner | Everything incl. finance, settings, MCP keys |
| `admin` | System admin | Everything except deleting audit; manages users/roles |
| `manager` | Club manager | Operations, members, CRM, inventory, HR approvals, reports (no system settings) |
| `front_desk` | Front desk staff | Members, bookings, walk-ins, shop counter sale, enquiries, view schedule |
| `bar_staff` | Bar / cafeteria | Bar POS, tabs, tables, own session |
| `kitchen` | Kitchen | KDS only |
| `shop_staff` | Gear shop | Shop POS, online order fulfilment, stock receive |
| `finance` | Accountant | Invoices, payments, expenses, refunds approval, tax, reports |
| `hr` | HR | Employees, shifts, attendance, leave approval, payroll draft |
| `marketing` | Marketing / sales | CRM, leads, quotes, website content |
| `coach` | Coach | Own schedule, coaching bookings, view assigned members |
| `member` | Club member | Own data only (implicit role for `kind: member`) |

## 3. Permissions

Format `<resource>.<action>`. Defined once in `server/src/modules/auth/permissions.js` (exported to admin via shared package).

Actions: `view`, `create`, `edit`, `delete` (archive), `approve`, `export`, `refund`, `cancel`, `manage` (config of that module).

| Resource | owner | admin | manager | front_desk | bar_staff | kitchen | shop_staff | finance | hr | marketing | coach |
|---|---|---|---|---|---|---|---|---|---|---|---|
| dashboard | view | view | view | — | — | — | — | view | — | — | — |
| member | all | all | view create edit export | view create edit | view¹ | — | view¹ | view | — | view | view² |
| membership | all | all | view create edit cancel | view create | — | — | — | view refund | — | view | — |
| membership_plan | all | all | view edit | view | — | — | — | view | — | view | — |
| court / court_block | all | all | all | view, block create | — | — | — | — | — | — | view |
| booking | all | all | all | view create edit cancel | — | — | — | view refund | — | view | view² create |
| social_session | all | all | all | view create edit | — | — | — | — | — | view | view |
| product / catalog | all | all | all | view | view | — | view edit | view | — | view | — |
| inventory | all | all | all | view | view | — | view create(receive, adjust³) | view export | — | — | — |
| purchase_order | all | all | create edit approve | — | — | — | create | view approve | — | — | — |
| order (online) | all | all | all | view edit | — | — | view edit cancel | view refund | — | — | — |
| pos (sell) | all | all | all | create (shop/front_desk mode) | create (bar) | — | create (shop) | — | — | — | — |
| pos_session | all | all | view approve(close variance) | own | own | — | own | view | — | — | — |
| pos_order void/refund | all | all | approve refund | — | request | — | request | refund | — | — | — |
| kds | view | view | view | — | view edit | view edit | — | — | — | — | — |
| lead / quote | all | all | all | view create edit | — | — | — | view | — | all | view |
| invoice / payment | all | all | view | create(payment at desk) | create(at POS) | — | create(at POS) | all | — | — | — |
| expense | all | all | create | — | — | — | — | all | — | — | — |
| employee | all | all | view | — | — | — | — | view | all | — | — |
| shift / attendance | all | all | all | view own | view own | view own | view own | view | all | — | view own |
| leave | all | all | approve | create own | create own | create own | create own | view | approve | create own | create own |
| payroll | all | all | — | — | — | — | — | view approve | create edit | — | — |
| report | all | all | view export | — | bar daily | — | shop daily | all | hr | crm | — |
| ai_admin | manage | manage | view | — | — | — | — | — | — | — | — |
| mcp | manage | manage | — | — | — | — | — | — | — | — | — |
| audit | view export | view export | view | — | — | — | — | view | — | — | — |
| settings / user / role | manage | manage | — | — | — | — | — | — | — | — | — |

¹ name, tier and discount only (to attach to a sale). ² only members/bookings assigned to them. ³ adjustments over ₹2,000 value need `inventory.approve`.

**Members** get implicit permissions scoped to themselves: `self.profile.*`, `self.booking.*`, `self.order.*`, `self.wallet.view`, `self.ai.chat`. Every member route filters by `memberId = req.user.memberId` in the **service** (not just the route).

## 4. Middleware

```js
router.post('/admin/bookings',
  requireAuth({ kinds: ['staff'] }),
  requirePermission('booking.create'),
  idempotency('booking.create'),
  validate({ body: CreateAdminBookingSchema }),
  controller.createAdminBooking);
```

`requirePermission(...perms)` → any-of. `requireAllPermissions` for rare cases. Record-level checks (coach sees own bookings, member sees own data) live in services via `ctx`:

```js
// every service method receives ctx
ctx = { user, permissions: Set, memberId?, employeeId?, locationId, source, requestId, ip }
```

## 5. Admin UI gating

`usePermission('booking.cancel')` hook + `<Can perm="booking.cancel">`. Nav items declare `perm` and are hidden if missing. Hiding UI is cosmetic; the server always checks.

## 6. Audit log

`audit.record(ctx, { action, entity, before, after, reason })` writes `auditLogs` (schema in [[04-Database-Schema#A. Identity and access]]). Written **after commit** (same pattern as events) — but for money actions (refund, void, payment capture), write audit inside the transaction so it can't be lost.

Must be audited:

| Area | Actions |
|---|---|
| Auth | login success/fail, logout, password reset, role change, API key create/revoke |
| Members | create, edit (changed fields), archive, merge |
| Membership | purchase, renew, upgrade, cancel, manual date change |
| Booking | create, cancel, reschedule, price override, no-show, check-in |
| Court | block create/remove, status change, pricing change |
| Inventory | adjustment, receive, write-off, price change |
| POS | session open/close (with cash variance), void line, void order, discount override, refund, tab close |
| Orders | status change, cancel, refund |
| Finance | invoice post/void, credit note, payment capture, refund, expense |
| HR | leave decision, payroll approve, salary change |
| AI / MCP | every write tool call, every confirmation, denials |
| Settings | any change |

Admin screen: Settings → Audit log, filter by actor, entity, action, source, date; row drawer shows before/after diff. Export CSV (`audit.export`).
