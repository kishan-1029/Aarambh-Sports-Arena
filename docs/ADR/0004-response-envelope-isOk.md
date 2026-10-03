# 0004 · Keep `{ isOk }` response envelope

- **Status:** accepted
- **Date:** 2026-10-03

## Context
[[05-Backend-Conventions]] proposes `{ data }` / `{ error: { code, message } }`. Existing admin and server use `{ isOk, message, status, data?, error? }`.

## Decision
Preserve the **`isOk` envelope** for all HTTP APIs so the existing admin keeps working. Domain error **codes** from the conventions table are placed in `error` (string or object with `code`) and mapped by a single error handler. Pagination meta may appear as `meta` alongside `data`.

## Consequences
New clients (website/mobile) adapt to `isOk`. A future ADR may introduce versioned `/api/v2` with the docs envelope if needed.
