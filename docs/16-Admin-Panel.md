# 16 · Admin Panel (React)

> VERIFY IN CODEBASE: extend the existing admin's router, layout, nav config, API client, table and form components. Do not add a second UI kit.

## 1. Information architecture

Organised around how the club works (not around database tables). Items hidden without permission.

```
🏠 Dashboard
⚡ Front Desk                 (full-screen)            → [[09-Front-Desk]]
📅 Courts
   ├─ Booking calendar
   ├─ Bookings
   ├─ Social play
   ├─ Courts & sports
   └─ Blocks & maintenance
👥 Members
   ├─ Members
   ├─ Memberships
   ├─ Plans
   └─ Wallet & loyalty [RE]
🎾 Shop
   ├─ Online orders (Kanban)
   ├─ Pickup counter
   ├─ Products
   ├─ Inventory
   ├─ Stock moves
   ├─ Purchase orders
   └─ Suppliers
🍺 Bar & Café
   ├─ POS                      (full-screen /pos)
   ├─ Kitchen display          (full-screen /kds)
   ├─ Tabs
   ├─ Sessions & Z-reports
   ├─ Menu (bar products)
   └─ Floors & tables
📣 Enquiries (CRM)
   ├─ Pipeline
   ├─ Leads
   ├─ Follow-ups
   └─ Quotes
💰 Finance
   ├─ Invoices
   ├─ Payments
   ├─ Receivables
   ├─ Payables & bills
   ├─ Expenses
   ├─ Daily reconciliation
   └─ Tax summary
🧑‍💼 Staff
   ├─ Employees
   ├─ Roster (shifts)
   ├─ Attendance
   ├─ Leave
   └─ Payroll
📊 Reports
✨ AI & Integrations
   ├─ Assistant conversations
   ├─ AI settings
   ├─ MCP access (API keys)
   └─ MCP activity
⚙️ Settings
   ├─ Club & locations
   ├─ Users & roles
   ├─ Taxes
   ├─ Payments
   ├─ Notifications & templates
   ├─ POS terminals
   └─ Audit log
```

Global: command palette (⌘K / Ctrl+K) — jump to page, search member/booking/order/invoice by number, quick actions ("New booking", "Register member"). Notification bell (in-app notifications). User menu (profile, my shifts, leave request, logout).

## 2. Standard building blocks (build once, reuse everywhere)

| Component | Spec |
|---|---|
| `DataTable` | server-side pagination/sort/filter via URL query params (shareable URLs), column visibility, row selection + bulk actions bar, density toggle, sticky header, skeleton rows, empty state slot, error state with retry, CSV export (calls `/export` endpoint) |
| `FilterBar` | search input (debounced), chips for filters, date range picker with presets (Today, Yesterday, This week, This month, Last month, Custom) |
| `EntityDrawer` | right-side drawer for view/edit without losing list context; URL `?open=<id>` |
| `FormKit` | react-hook-form + zod resolver (shared schemas), field components (money input in ₹ → paise, phone input, date/time, select, async select for member/product search), inline + summary errors mapped from `VALIDATION_ERROR.details` |
| `ConfirmDialog` | destructive variant requires typing reason when the action is audited (cancel, refund, void) |
| `StatusChip` | one colour map for all statuses (shared enum → tone) |
| `Money` | formats paise as ₹ with Indian grouping (₹1,23,456) |
| `EmptyState`, `ErrorState`, `Skeleton` | consistent illustrations + CTA |
| `Can` / `usePermission` | permission gating |
| `useLiveQuery(room, queryKey)` | subscribes to socket room and invalidates the React Query key |

Data fetching: **TanStack Query** (if the admin already uses something else, keep it — VERIFY). Query keys `['bookings', filters]`. Mutations show toasts and invalidate related keys.

## 3. Per-module screen spec

For every module the doc of that module lists tables/columns/forms. Common requirements for **every** list screen:

- Search, filters, sort, pagination (25/50/100), bulk actions where listed.
- Loading: skeleton; Empty: friendly message + primary action; Error: message + requestId + retry.
- Permissions: page `view`, buttons per action.
- Audit: row drawer has an "Activity" tab showing `auditLogs` for that entity (`GET /api/admin/audit?entityType=&entityId=`).

| Module | List columns | Bulk actions | Detail/form |
|---|---|---|---|
| Bookings | No., Date, Time, Court, Booked by, Type, Channel, Status, Payment, Price | Cancel (with reason, notify), Export | Booking drawer: timeline, participants, payment, reschedule |
| Courts & sports | Name, Sport, Status, Hours, Peak price, Off-peak price, Social | Set maintenance | Court form: hours per weekday, pricing matrix, peak windows |
| Social play | Title, When, Courts, Joined/Capacity, Price, Status | Cancel | Session form + participants list (add walk-in) |
| Memberships | Member, Plan, Start, End, Status, Paid | Send reminder | Renew/upgrade/cancel |
| Online orders | No., Customer, Fulfilment, Items, Total, Payment, Status, Age | Mark ready, Export | Order drawer with state actions |
| Inventory | SKU, Product, Variant, On hand, Reserved, Available, Reorder lvl, Value | Create PO from selection | Adjust dialog (qty, reason) |
| Tabs | Tab, Customer, Table, Balance, Opened by, Opened at | — | Settle |
| Sessions | Session, Terminal, Opened by, Opened/Closed, Sales, Variance | — | Z-report view/PDF |
| Leads | see [[12-CRM-Enquiries]] | Assign, Lost, Export | Lead drawer |
| Invoices | Number, Kind, Customer, Stream(s), Date, Due, Total, Paid, Status | Send reminder, Export | Invoice view, record payment, credit note |
| Expenses | Date, Category, Vendor, Amount, Tax, Paid via | Export | Expense form + receipt upload |
| Employees | Code, Name, Department, Title, Status, Today's shift | — | Profile tabs: details, shifts, attendance, leave, payslips |
| Leave | Employee, Type, From–To, Days, Status, Requested | Approve, Reject | Decision dialog |
| Users & roles | User, Email, Roles, Status, Last login | Disable | Role editor: permission matrix checkboxes by module × action |
| MCP keys | Name, Prefix, Acting user, Scopes, Last used, Status | Revoke | Create key (shown once) |
| Audit log | Time, Actor, Source, Action, Entity, Reason | Export | Diff viewer |

## 4. Routing
`/` dashboard · `/front-desk` · `/courts/calendar` · `/courts/bookings` · `/members` · `/members/:id` · `/shop/orders` · `/shop/inventory` · `/bar/tabs` · `/pos` · `/pos/:terminalId` · `/kds` · `/crm/pipeline` · `/finance/invoices` · `/staff/roster` · `/reports/:report` · `/ai/conversations` · `/integrations/mcp` · `/settings/*`.

Full-screen layouts (`/front-desk`, `/pos/*`, `/kds`) use a separate `FullscreenLayout` without sidebar, with a small "exit" control.

## 5. Admin AI panel [RE]
A slide-over "Ask the club" assistant inside the admin (same orchestrator as members but with **staff tools** filtered by the user's permissions — read reports, find member, check availability). Optional; the primary management AI channel is ChatGPT via MCP.

## Implementation notes (Phase 3)

- **UI kit:** Bootstrap 5 + Reactstrap kept (ADR-0006). No Tailwind/shadcn migration.
- **Brand tokens:** `Odoo.Admin/src/assets/scss/_arambh-tokens.scss` — `--arambh-*` CSS variables + light `--vz-primary` override; dark via `[data-layout-mode="dark"]`.
- **Building blocks** (under `Components/Common/`): `EmptyState`, `ErrorState`, `Skeleton`, `StatusChip`, `Money` (paise→₹), `ConfirmDialog`, `KpiTile`, `CommandPalette` (lightweight Ctrl/⌘K, no `cmdk` dep). Reuses existing `DeleteModal`, `LoadingScreen`, `react-data-table-component`, `react-toastify`, axios client.
- **Nav:** Static Arambh group from `config/arambhNav.js` merged **after** API MenuMaster groups in `VerticalLayouts` — does not replace menu fetch. Items gated with `usePermission` / `Can` when `perm` is set. Placeholders show a "Soon" badge.
- **Routes:** Coming-soon pages for Front Desk, Bookings, Members, Plans, Courts, KDS, Shop, CRM, Finance, HR, Reports, Settings. Sample live list: `/staff/directory` (employees API). Fullscreen stub: `/pos` via `FullscreenLayout`.
- **Shell branding:** "Arambh Sports Arena" in sidebar logo area, header, login, footer. Dark mode toggle (`LightDark`) wired in header; preference in `localStorage` key `arambh-layout-mode`.
