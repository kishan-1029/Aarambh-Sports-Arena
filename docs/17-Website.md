# 17 · Public Website

Problem statement: *"Someone searches for a place to play near them. Today the club has no website, so they never find it. If they could see the club, its plans and prices, what is free this week, and what the shop sells, they might book a trial session on the spot."*

Tech: **Next.js (App Router)** in `website/` (record the choice in an ADR). Server-renders SEO pages from `/api/public/*`; live availability fetched client-side. Logged-in members can book and shop from the website with the same APIs as mobile.

## 1. Pages

| Route | Purpose | Data | Rendering |
|---|---|---|---|
| `/` | Hero ("Book a court in 30 seconds"), sports, live "free tonight" strip, plans teaser, shop highlights, bar & café, location map, trial CTA | `/public/club`, `/public/availability?date=today` | ISR 60 s + client refresh |
| `/sports/[sport]` | Courts, surfaces, member vs walk-in pricing, coaching | `/public/sports/:key` | ISR |
| `/availability` | 7-day grid (courts × slots), sport filter, legend; free slot → login/book or trial | `/public/availability` | client, poll 30 s |
| `/membership` | Gold/Silver/Junior comparison, FAQs, Join (signup + payment) or "Talk to us" | `/public/membership-plans` | ISR |
| `/shop`, `/shop/[category]`, `/shop/p/[slug]` | Catalogue with filters (category, price, brand, size); product page with variant picker and live stock badge | `/public/products` | ISR + client stock |
| `/cart`, `/checkout` | Pickup or delivery, address, payment | member auth | client |
| `/trial` | Sport → slot → details → confirmation | `/public/trials` | client |
| `/contact` | Enquiry form (interest, message), phone, WhatsApp link, map, hours | `/public/enquiries` | static |
| `/bar` | Menu highlights, hours | `/public/menu` | ISR |
| `/login`, `/register`, `/account/*` | Bookings, orders, membership, profile | member APIs | client |
| `/quote/[token]` | Quote view + accept | `/public/quotes/:token` | dynamic |

## 2. SEO and "near me"
- Per-page metadata, Open Graph images, `sitemap.xml`, `robots.txt`.
- JSON-LD `SportsActivityLocation` (a `LocalBusiness` subtype) with address, geo, opening hours, phone, price range.
- Lighthouse ≥ 90 on mobile for performance, SEO and accessibility. `next/image`, self-hosted fonts.
- [RE] Google Business Profile: it is what actually surfaces "near me" results. Keep name, address and phone identical on the site.

## 3. Design
Bold sports look from the shared tokens ([[21-Design-System]]): large display type, court-green and clay accents, real club photography (placeholders until supplied), restrained motion. Mobile-first with a sticky "Book a trial" bar.

## 4. AI chat widget
Floating "Ask Champions" button → chat panel in guest mode (public tools only: plans, prices, availability, shop search, create enquiry/trial after confirmation). See [[19-AI-Assistant]].

## 5. Privacy
Public availability never shows who booked. Enquiry form has a contact-consent checkbox and links to a privacy page.

## 6. Acceptance
- [ ] Visitor goes from home to a booked trial in ≤ 4 steps on a phone.
- [ ] Enquiry appears in the admin pipeline within 2 s, assigned, with a notification.
- [ ] Product page stock badge reflects a counter sale within 30 s.
- [ ] Lighthouse mobile ≥ 90.
