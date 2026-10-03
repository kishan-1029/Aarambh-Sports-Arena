# 0005 · Hybrid server layout (`src/modules` + legacy flat)

- **Status:** accepted
- **Date:** 2026-10-03

## Context
Docs specify `server/src/modules/<domain>/`. The finalRBAC server is flat (`controllers/v1`, `models`, `routes/v1`). Moving everything would risk the working admin masters.

## Decision
- Leave existing masters in `controllers/`, `models/`, `routes/`, `middlewares/`.
- Add new Arambh domain code under `Odoo.Server/src/` (`lib/`, `modules/`, `middleware/` aliases as needed, `seed/`, `worker.js`).
- Mount new routers from `server.js` alongside `/api/v1`.
- Shared DB connection extracted to `src/lib/db.js` and imported by `server.js`.

## Consequences
Two layouts until a later cleanup. Import paths must prefer existing middleware (`middlewares/authMiddleware.js`) rather than duplicating auth.
