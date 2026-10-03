# 15 · Dashboard and Reports

Problem statement: *"The owner wants to see how the club is doing today, this week and this month, and to share the numbers when needed."* · *"Revenue and operations: No visibility at all."*

## 1. Owner dashboard — every widget answers a question

Period switcher: **Today · This week · This month · Custom**, with comparison to previous period (▲/▼ %).

| Row | Widget | Question it answers | Source |
|---|---|---|---|
| 1 | **Revenue earned** (big number) + split chips Courts / Membership / Shop / Bar / Other | How much did we earn, from where? | invoice lines by stream |
| 1 | **Collected by method** (cash / card / UPI / online) | Where's the money? | payments |
| 1 | **What we owe** (payables due ≤ 7 days) | What do we owe? | bills, payroll, tax |
| 1 | **Outstanding receivables** | Who owes us? | invoices due |
| 2 | **Court utilisation** heat strip by hour (today) / by day (week) | Are courts being used? peak hours? | slotLocks booked units ÷ available units |
| 2 | **Bookings**: count, cancellations, no-shows, walk-in vs member | Is booking demand healthy? | bookings |
| 3 | **Members**: active by tier, new this period, expiring in 7 days (list, click → renew reminder) | Is the member base growing? who's about to lapse? | members/memberships |
| 3 | **Enquiries**: new, overdue follow-ups, trials booked, conversion % | Are we converting interest? | leads |
| 4 | **Bar today**: revenue, orders, avg ticket, open tabs (₹) | What did the bar earn? anything unsettled? | posOrders/tabs |
| 4 | **Shop**: sales, top 5 products, orders awaiting pickup/dispatch | What sells? what's waiting? | invoices/orders |
| 4 | **Low stock** list with "Create PO" | What do we need to reorder? | stockItems |
| 5 | **Alerts feed**: cash variance, overdue leads, failed payments, pending leave approvals | What needs my attention? | events |

Revenue trend chart (line, daily, stacked by stream) only for week/month/custom.

## 2. Implementation

`ReportService` with aggregation pipelines; all functions take `{from, to, locationId}` (local dates) and return plain numbers so the dashboard, report pages, AI and MCP share them:

```
revenueSummary(range)        -> { totalPaise, byStream: {...}, prevTotalPaise, changePct }
collectionsByMethod(range)
payablesSummary({ dueWithinDays })
receivablesAgeing(asOf)
courtUtilisation(range, { groupBy: hour|day|court })
bookingStats(range)
memberStats(range)
expiringMemberships({ withinDays })
leadFunnel(range)
barSales(range, { groupBy: product|table|method|hour })
shopSales(range, { top })
lowStock()
inventoryValuation(asOf)
taxSummary(range)
```

Performance:
- `dailySnapshots` collection (`{localDate, locationId, metrics}`) written at 23:55 by the worker; ranges > 2 days read snapshots for closed days + live query for today. Snapshot rebuild command for backfills.
- Indexes on `localDate` fields used by every pipeline.
- Dashboard endpoint `GET /api/admin/dashboard?period=today` returns all widgets in one response (parallel `Promise.all`), cached 30 s; socket `dashboard.tick` invalidates on payments.

## 3. Report pages (Reports section)

| Report | Content | Filters | Export |
|---|---|---|---|
| Revenue | by stream, by day, by method; earned vs collected | range, stream | CSV, PDF |
| Bookings | volume, utilisation by court/hour/day, peak heatmap, cancellations, no-shows, channel mix | range, sport, court | CSV |
| Members | new, active, by tier, churned/expired, renewals, membership revenue | range, tier | CSV |
| Shop | sales, top products, category mix, online vs counter, pickup vs delivery | range, category | CSV |
| Inventory | stock on hand, value at cost, low stock, movements | as of, category | CSV |
| Bar | sales by product, by table, by hour, by payment method, discounts, voids, Z-reports list | range, terminal | CSV, PDF |
| CRM | funnel, conversion by source, response time vs SLA | range, source | CSV |
| Finance | receivables ageing, payables, expenses by category, P&L-lite (revenue − expenses − payroll) | range | CSV, PDF |
| Tax | tax summary by rate, B2B/B2C | range | CSV |
| HR | attendance, leave taken, payroll totals | month | CSV |

**Sharing:** export CSV/PDF; [RE] "Share link" creates a signed, expiring (7 days), read-only URL to a report snapshot (no login), revocable; and owner can simply ask ChatGPT via MCP.

## 4. Tests
Seed a fixed day of transactions → assert every report total against hand-computed expected values (`test/fixtures/reportDay.json`). Snapshot path and live path return identical numbers for the same closed day.
