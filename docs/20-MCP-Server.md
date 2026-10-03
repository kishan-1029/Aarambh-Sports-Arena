# 20 · Management MCP Server (for ChatGPT)

Goal: the owner asks ChatGPT *"How much did the club earn today?"*, *"Break that down"*, *"Which products are running low?"*, *"Create a purchase order for these"* and gets real answers and safe actions.

Reference: `Reference Project/project360-mcp-server` (Phase 0 notes in `docs/Audit/ref-project360-mcp-server.md`). **Reuse its transport, tool registration and ChatGPT connection setup**, since it already works with ChatGPT.

## 1. Architecture
```
mcp/
├── src/
│   ├── index.js            # Streamable HTTP transport at /mcp, plus /healthz
│   ├── auth.js             # bearer API key (or OAuth, see §5)
│   ├── apiClient.js        # calls backend REST with the caller's credential; maps error codes
│   ├── tools/              # summary, revenue, bookings, members, inventory, pos, crm, finance, staff, actions
│   └── format.js           # ₹ with Indian grouping, dates in IST, small markdown tables
└── package.json            # @modelcontextprotocol/sdk, zod
```

The MCP server is **thin** and never touches MongoDB. Each tool calls a backend endpoint under `/api/mcp/*` (thin wrappers over `ReportService` and domain services) passing the caller's credential. The backend resolves it to an acting user + scopes, applies RBAC and writes audit with `source: mcp`. Business rules live in one place.

## 2. Tools

### READ (scope `mcp.read`)
| Tool | Args | Returns |
|---|---|---|
| `get_club_summary` | `period: today|week|month|custom`, `from?`, `to?` | earned total + by stream + change vs previous, collected, bookings, utilisation, new members, open tabs, low-stock count, overdue enquiries |
| `get_revenue` | period, `groupBy: stream|day|method` | breakdown |
| `compare_revenue` | periodA, periodB | change by stream ("which source grew the most?") |
| `get_booking_summary` | period, sport? | counts, cancellations, no-shows, channel mix |
| `get_court_availability` | date, sport?, from?, to? | free slots by court |
| `get_court_utilization` | period, `groupBy: hour|court|day` | % and peak hours |
| `search_members` | query, tier?, status? | top 10 |
| `get_member` | memberId or memberCode | profile, membership, recent activity |
| `get_expiring_memberships` | withinDays | list |
| `get_membership_report` | period | new, renewals, expired, by tier, revenue |
| `search_bookings`, `get_booking` | filters / id | |
| `get_inventory` | query?, category? | stock rows |
| `get_low_stock_items` | — | items at/below reorder level with suggested qty and supplier |
| `get_shop_sales` | period, top? | sales, top products |
| `get_bar_sales` | period, `groupBy: product|method|hour|table` | bar figures |
| `get_pos_sales` | period, terminal? | all POS terminals |
| `get_open_tabs` | — | tabs with balances |
| `get_enquiries` | stage?, period? | leads |
| `get_pending_followups` | assignee? | overdue + due today |
| `get_financial_summary` | period | earned, collected by method, expenses, payroll, receivables, payables, tax due |
| `get_receivables`, `get_payables` | — | ageing / due list |
| `get_tax_summary` | period | by rate |
| `get_staff_on_shift` | date | roster |
| `get_pending_leave` | — | requests |

### WRITE (scope `mcp.write`, confirmation required)
`create_booking`, `cancel_booking`, `reschedule_booking`, `create_court_block`, `create_purchase_order` (draft only), `assign_lead`, `log_lead_followup`, `send_membership_renewal_reminders`, `approve_leave`, `reject_leave`, `adjust_stock` (below the approval threshold).

### HIGH-RISK WRITE (scope `mcp.admin`, confirmation + reason, owner/admin only)
`refund_payment`, `cancel_membership`, `void_invoice` (issues a credit note), `approve_payroll`, `bulk_cancel_bookings`, `change_prices`. **No delete tools exist.**

## 3. Confirmation protocol (server-enforced)
Every write tool only *prepares*. It returns:
```json
{ "status": "confirmation_required",
  "confirmationId": "pa_8f2c…",
  "summary": "Create draft PO to Sportz Supplies: 12× tennis ball cans (₹4,800), 6× overgrips (₹1,200). Total ₹6,000 + GST.",
  "expiresAt": "2026-10-03T12:10:00+05:30",
  "riskLevel": "write" }
```
ChatGPT shows the summary, the owner says yes, ChatGPT calls `confirm_action({ confirmationId, reason? })` (reason mandatory for high-risk). The backend checks same credential, not expired, not used → executes with `idempotencyKey = confirmationId`. `cancel_action` discards it. Tool descriptions state: *call confirm_action only after the user explicitly approves the summary in their latest message*. Expiry and single use mean the worst case is an action the owner just read. Set MCP tool annotations (`readOnlyHint` on reads, `destructiveHint` on high-risk) so ChatGPT adds its own confirmation UI.

## 4. Conversation flows
| Owner says | Tool calls → answer |
|---|---|
| "How much did the club earn today?" | `get_club_summary(today)` → "₹48,250 earned today (₹41,900 collected), up 12% on last Saturday." |
| "Break that down." | `get_revenue(today, stream)` → Courts ₹14,400 · Membership ₹18,000 · Shop ₹9,350 · Bar ₹6,500 |
| "Which source grew the most?" | `compare_revenue(today vs last Saturday)` → stream with the largest increase, with numbers |
| "Show me low stock items." | `get_low_stock_items` → table |
| "Create a purchase order for these items." | `create_purchase_order(items from previous answer)` → summary → owner "yes" → `confirm_action` → "Draft PO-2026-0012 created; find it under Shop → Purchase orders." |
| "Who's expiring this week? Remind them." | `get_expiring_memberships(7)` → `send_membership_renewal_reminders(ids)` → confirm |
| "Is a tennis court free at 7 tomorrow? Book it for Rahul." | `get_court_availability` → `search_members("Rahul")` (asks which Rahul if several) → `create_booking` → confirm |

Answers always state the period and that times are IST.

## 5. Auth
- **API keys** (default): created by owner/admin in Admin → MCP access; shown once; stored hashed; scopes `mcp.read|mcp.write|mcp.admin`; acting user = creator so RBAC applies; expiry; revoke; `lastUsedAt`.
- ChatGPT connectors may require **OAuth**. VERIFY how project360-mcp-server authenticates with ChatGPT and copy it. If OAuth is needed: authorization-code + PKCE on the backend (`/oauth/authorize`, `/oauth/token`, plus dynamic client registration if ChatGPT requires it); the owner signs in with their admin account and approves scopes; issued tokens map to the same scope model.
- HTTPS only; 60 requests/min per credential; request bodies logged without secrets.

## 6. Admin screens
MCP access (keys: create with name/scopes/expiry, revoke), MCP activity (every call: tool, args summary, status, latency, credential; filter), pending/confirmed/expired confirmations, status card with the MCP URL to paste into ChatGPT and a health indicator.

## 7. Tests
- Read-only credential calling a write tool → 403.
- `confirm_action` with another credential's id → rejected; expired → rejected; reused → returns the original result.
- Every write → audit log with `source: mcp`.
- Contract tests: each MCP tool schema matches its backend endpoint.
- Manual: connect ChatGPT to the deployed `/mcp` URL and run every flow in §4.
