# 14 · Finance — Invoices, Payments, Receivables, Payables, Tax

Problem statement: *"How much did we earn, from where, and what do we owe? Money arrives from courts, the shop and the bar, by card, cash and online, and today none of it is in one place. There are memberships and business clients to invoice, employees to pay, leave to approve, and taxes to report."*

## 1. Principle: every rupee is an invoice line + a payment

| Event | Invoice (`kind`, `revenueStream`) | Payment |
|---|---|---|
| Membership purchase/renewal | customer_invoice · membership | cash/card/upi/online |
| Court booking (paid) | customer_invoice · court | per booking payment |
| Social play join | customer_invoice · social | |
| Shop counter sale | customer_invoice · shop | POS |
| Online order (on collect/dispatch) | customer_invoice · shop (+ delivery line) | online |
| Bar order | customer_invoice · bar | POS (incl. tab settlement) |
| Business client (corporate court hire, events) | customer_invoice · court/other, **due date + terms** | bank transfer later → receivable |
| Supplier purchase | vendor_bill | outgoing payment → payable |
| Payroll | vendor_bill-like payroll payable | outgoing |
| Expense (electricity, repairs) | `expenses` (+ optional bill) | outgoing |
| Refund | credit_note (reversal) | refund |

**POS consolidation option:** high-volume bar sales can be invoiced per order (simple, default) or as one consolidated invoice per session at close (`settings.posInvoiceMode = per_order | per_session`), like Odoo's session journal entry.

Revenue recognition for reporting = **posted invoice lines by `localDate` and `revenueStream`** (minus credit notes). Cash view = payments by method. Both are shown, clearly labelled ("Earned" vs "Collected").

## 2. Taxes (GST)
- `taxes` collection, configurable rates and components (CGST/SGST split for intra-state; IGST for inter-state delivery [RE]).
- Each product/plan/court references a tax. Lines store the breakdown.
- Club GSTIN on location; customer GSTIN on B2B invoices (B2B vs B2C flag in tax report).
- **Tax summary report**: output tax by rate and component for a period, taxable value, B2B/B2C split, input tax from vendor bills/expenses → net payable. Export CSV in a GSTR-friendly column layout.
- ⚠️ Rates are seed placeholders. Owner/accountant must confirm current rates per category (court hire, food & beverage, sports goods, apparel, membership) in Settings → Taxes.

## 3. Payments
- Methods: `cash`, `card`, `upi`, `online` (Razorpay), `wallet`, `bank_transfer`.
- Provider abstraction `PaymentProvider` with `createIntent`, `verifySignature`, `refund`, `parseWebhook`. Drivers: `razorpay`, `mock`. Card/UPI at the physical counter are recorded as `manual` with a reference (EDC terminal slip / UPI UTR).
- Webhook endpoint verifies signature, is idempotent on event id, and calls the domain confirm method (booking/order/membership).
- Refunds: to original method via provider, or wallet credit, or cash (POS session). Always a credit note + audit + reason.

## 4. Receivables & payables
- **Receivables (what others owe us):** posted customer invoices with `duePaise > 0`; ageing buckets 0–30/31–60/61–90/90+; send reminder email; record payment (partial allowed); statement PDF per customer.
- **Payables (what we owe):** vendor bills + approved unpaid payroll + tax payable for the period; due dates; mark paid.
- "What do we owe?" card on the dashboard = payables total with the top 5 by due date.

## 5. Reconciliation (daily)
Daily close screen for finance: per payment method — expected (system) vs actual (cash counted in Z-reports, card settlement amount entered, Razorpay settlement fetched or entered) → difference with note. [RE] Auto-fetch Razorpay settlements.

## 6. Invoicing business clients
Customer type `company` with GSTIN, billing address, payment terms (net 15/30). Create invoice manually or from an accepted quote; recurring monthly invoice for corporate packages [RE]. Email PDF with payment link (Razorpay payment link [RE]).

## 7. Admin screens
Invoices (filters: kind, status, stream, customer, date, overdue), invoice view/PDF/credit note, Payments (method, source, session), Receivables (ageing), Payables, Expenses (with receipt upload), Taxes summary, Daily reconciliation, Payment settings.

## 8. Rules
- Invoice numbers sequential per kind per financial year (April–March): `INV/2026-27/00042`. Counter key `invoice:2026-27`.
- Posted invoices immutable; corrections via credit note.
- All amounts in paise; totals recomputed server-side from lines.

## 9. Tests
- Booking paid online → one invoice (court) + one payment; cancellation with refund → credit note + refund; revenue report nets to zero for that booking.
- Tax summary equals the sum of line taxes for the period.
- Partial payments update `paidPaise`/`duePaise` and status.
- Webhook replay doesn't double-confirm.
