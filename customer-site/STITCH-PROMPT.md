# Arambh Sports Arena — Stitch / AI design prompt

Paste the block below into **Google Stitch**, Midjourney, Galileo, v0, or similar. Then drop exported screens into `customer-site/src/pages` + `styles.css`.

---

## Master prompt (copy everything)

```
Design a premium public website for “Arambh Sports Arena” — a multi-sport club in Vadodara, Gujarat (tennis, padel, badminton, cricket nets). Not a generic SaaS landing page.

Brand: Arambh Sports Arena. Hero-level brand name. Court-green primary (#0F7A4A), deep green charcoal (#0C3D28), warm sand accents, crisp white. Expressive display + clean body fonts (NOT Inter/Roboto/Arial). Full-bleed photography of real courts/players as the dominant first viewport — no inset cards in the hero, no floating badges/stickers on the hero image. First viewport only: brand, one headline, one short line, one CTA group, one edge-to-edge image. Atmosphere via subtle grain/gradient over photos — not flat purple or cream-serif clichés.

Reference vibe (do not copy layouts literally): Playtomic / CourtReserve member-facing sites, Soho House sports clubs, premium padel club sites — athletic, confident, bookable.

Pages / screens to generate (desktop + mobile):

1) HOME
   - Full-bleed hero: “Train. Play. Belong.” CTA: Book a trial | See availability
   - Sports strip (Tennis, Padel, Badminton, Cricket) — not card-grid spam; one section, one job
   - Membership teaser (Gold / Silver / Junior) with clear price in ₹
   - How it works: 3 steps (Pick sport → Check slot → Book trial)
   - Location strip: Vadodara + map placeholder + phone
   - Footer with nav

2) SPORTS
   - List each sport with court count, surface, suitable levels
   - CTA to availability filtered by sport

3) AVAILABILITY / BOOK
   - Date picker + sport filter
   - Court timeline / slot grid (Available / Held / Booked as simple states — free/busy only)
   - CTA: Book trial or Contact for membership booking

4) MEMBERSHIP
   - Plan comparison: Gold, Silver, Junior — price/month, entitlements (guest passes, peak hours)
   - CTA: Start trial / Enquire

5) TRIAL BOOKING
   - Short form: name, phone, email, sport interest, preferred date
   - Success state

6) CONTACT / ENQUIRE
   - Form: name, phone, email, interest, message
   - Club address, WhatsApp-style phone, hours

Visual rules:
- One composition per viewport; reduce clutter; no pill clusters or stat strips in hero
- Cards only when they wrap an interaction (plan select, slot pick, form)
- 2–3 intentional motions: hero fade/ken-burns subtle, nav underline, CTA hover
- Accessible contrast; mobile-first
- Deliver: high-fidelity UI frames labeled by page name for React (Vite) implementation
```

---

## Feature checklist (what the live React site should cover)

| Feature | Status today | Notes |
|--------|--------------|--------|
| Home hero + brand | Basic | Restyle from Stitch |
| Sports list from API | Basic | `/api/public/sports` |
| Live availability | Basic | `/api/public/availability` |
| Membership plans | Basic | `/api/public/membership-plans` |
| Trial lead form | Basic | `POST /api/public/trials` |
| Contact / enquiry | Basic | `POST /api/public/enquiries` |
| Shop / ecommerce | Later | Phase 10 |
| Member login portal | Later | Phase 15 |
| Online court pay | Later | Needs Razorpay live |
| AI chat widget | Later | Phase 16 |

## Local run after design import

- Site: `http://localhost:3001` (`customer-site`, React + Vite)
- API: `http://localhost:7003` (`VITE_API_URL`)
- Admin (green panel): `http://localhost:3000`
```
