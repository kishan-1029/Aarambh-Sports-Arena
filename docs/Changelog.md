# Changelog

One line per merged phase: `YYYY-MM-DD · Phase N · what shipped · PR link`.

- 2026-10-03 · Phase 0 · Reference audits: Elevate.Admin, Elevate.Elly, Elevate.Application, datasetu-app.
- 2026-10-03 · Docs · Initial implementation specification (00–28).
- 2026-10-03 · Phase 0 · Codebase/reference audit; bases synced to finalRBAC/finalRBAC1; ADRs 0001–0006; `.env.example` placeholders.
- 2026-10-03 · Phase 1 · Foundation: config, db/withTransaction, money/time/clock/counters, middleware, audit/notifications, worker, seed, health, shared package, Jest+MongoMemoryReplSet tests (15 pass).
- 2026-10-03 · Phase 2 · Auth/RBAC: string permissions (shared + server re-export), seeded arambhRoles, requirePermission middleware, session stringPermissions (keep menu CRUD), admin usePermission/Can, auth login/logout audit; 36 tests pass.
- 2026-10-03 · Phase 3 · Admin shell: Arambh brand tokens (SCSS), Common building blocks (EmptyState/ErrorState/Skeleton/StatusChip/Money/ConfirmDialog/KpiTile), static Arambh nav merged after MenuMaster, Ctrl/⌘K palette, dark mode toggle, Coming soon placeholders, Staff directory sample list, FullscreenLayout `/pos`; Bootstrap kept (ADR-0006).
