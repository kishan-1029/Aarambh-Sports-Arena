# 0003 · DATABASE env alias for MONGODB_URI

- **Status:** accepted
- **Date:** 2026-10-03

## Context
Docs and the user brief use `MONGODB_URI`. The existing server reads `process.env.DATABASE`. Live `.env` already has `DATABASE`.

## Decision
Config module (Phase 1) accepts **`MONGODB_URI` or `DATABASE`** (prefer `MONGODB_URI` if both set). Existing `.env` keeps working. `.env.example` documents both names with placeholders only. Never log the value.

## Consequences
Tests and seeds read URI only through config. Atlas URI stays in git-ignored `.env`.
