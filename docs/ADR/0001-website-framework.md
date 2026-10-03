# 0001 · Website framework

- **Status:** accepted
- **Date:** 2026-10-03

## Context
The problem statement's "stranger finds the club online" scene depends on search visibility. The admin is React (existing). A client-only SPA is weak for SEO.

## Decision
Build `website/` with Next.js (App Router), consuming `/api/public/*`. Share design tokens and the API client shape with the admin.

## Consequences
One extra build target. If the team prefers a single toolchain, the fallback is Vite + static prerendering of public pages; update [[17-Website]] accordingly.
