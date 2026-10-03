# 0001 · Website framework

- **Status:** accepted (amended)
- **Date:** 2026-10-03
- **Amended:** 2026-10-03 — React + Vite (not Next.js)

## Context
The problem statement's "stranger finds the club online" scene needs a public site. The admin is React + Vite. A Next.js second toolchain was tried briefly; the team chose one React toolchain for the hackathon demo.

## Decision
Build the public site as **React + Vite** in `customer-site/`, consuming `/api/public/*`. Dev server on port **3001** (admin remains on 3000). Any Next.js tree under `website/` (or `website-next-*`) is parked and not the demo target.

## Consequences
Shared React mental model with admin; weaker SEO than SSR — acceptable for the hackathon. If SEO becomes required later, revisit SSR/prerender and update [[17-Website]].
