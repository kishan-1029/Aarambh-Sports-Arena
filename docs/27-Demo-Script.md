# 27 · Hackathon Demo Script (≈12 minutes)

Story: one week at The Champions Club, compressed into one evening. Every scene maps to a scene in the problem statement and ends by showing what it replaced (WhatsApp, Excel, paper, phone calls).

**Setup:** seeded data for today; three screens/windows: Admin (front desk + POS on a tablet if possible), Website/phone (member), ChatGPT. `PAYMENTS_PROVIDER=mock`.

| # | Time | Scene (problem statement) | What we show | Replaces |
|---|---|---|---|---|
| 0 | 0:00–0:45 | Hook | One slide: WhatsApp chat, Excel sheet, paper receipt → "one platform". Architecture diagram for 10 s. | — |
| 1 | 0:45–2:00 | **A new member walks in** | Front desk: register *Ananya* (Silver), DOB, plan cards with entitlements, cash payment → member code + QR; invoice created automatically. Search "anan" → recognised instantly with tier and expiry. Try Junior for a 19-year-old → blocked with reason. | Excel member list |
| 2 | 2:00–4:00 | **Booking a court on a busy evening (6 pm)** | Ananya books Tennis 1 at 18:30 on her phone → price shows Silver 50% rule → confirmed. Simultaneously a staff member clicks the same slot on the front desk → "just booked" + alternatives. Show the calendar updating live. Try a third booking that day → "2 bookings per day" message. Walk-in at the counter booked at walk-in price, paid by UPI. Show Friday social session filling up. | WhatsApp booking |
| 3 | 4:00–4:30 | *Proof moment* | Run the concurrency test live (or show its output): 50 parallel requests → 1 booking. One sentence: unique index on court + half-hour slot. | — |
| 4 | 4:30–6:00 | **Gearing up before a match** | Counter: racket restring + string sold in 3 taps with member discount. Website: Ananya orders shoes for click-and-collect → admin Kanban → "Ready" → phone notification with pickup code → collected. Show the same shoe's stock dropped once and the website badge updated. Low-stock alert appears. | Guessing stock |
| 5 | 6:00–7:45 | **After the match, at the bar** | POS: Table 12, four items, guest labels; attach Ananya by QR → 10% applied automatically; send to kitchen → KDS ticket → Ready toast. Another group opens a tab; later settles split cash + card. Close the bar session → Z-report: "the bar earned ₹X today". | Paper receipts, lost tabs |
| 6 | 7:45–8:45 | **A stranger finds the club online** | Website: plans and prices, live "free this week", shop. Visitor books a free trial → admin pipeline shows a new lead assigned to Priya with SLA timer and notification. Send a quote in two clicks. | No website, lost enquiries |
| 7 | 8:45–9:45 | **The owner, end of the month** | Dashboard: earned vs collected, by stream (courts/membership/shop/bar), by method, what we owe, receivables, utilisation heat strip, expiring members, leave approvals pending. Switch Today → Month. Export the revenue report. | No visibility |
| 8 | 9:45–11:30 | **Owner asks ChatGPT (MCP)** | "How much did the club earn today?" → "Break that down." → "Which source grew the most?" → "Which products are running low?" → "Create a purchase order for these" → ChatGPT shows the summary, owner says yes → PO appears in admin; audit log shows `source: mcp`. | Spreadsheet digging |
| 9 | 11:30–12:00 | Close | Member assistant one-liner on the phone: "Book me a court tomorrow evening" → confirmation card. Recap slide mapping the six scenes to modules. | — |

## Rehearsal rules
- Rehearse twice with a timer; cut scene 9 if over 12:30.
- Pre-open all tabs; logged-in sessions ready; phone screen mirrored.
- Have fallback screenshots/video for every scene in case Wi-Fi or ChatGPT is slow.
- Speak in the problem statement's language: "nobody has to remember expiry dates", "two people never on the same court", "same shelf".
