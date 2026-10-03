# Folder mapping — docs target → workspace

| Docs target ([[02-Architecture]]) | Real path | Notes |
|---|---|---|
| `server/` | `Odoo.Server/` | Extend in place; introduce `src/` gradually (ADR-0005) |
| `server/src/app.js` / `server.js` | `Odoo.Server/server.js` | Single entry today; Phase 1 may extract `src/app.js` |
| `server/src/lib/*` | *(new)* `Odoo.Server/src/lib/*` | No `lib/` yet |
| `server/src/modules/*` | *(new)* `Odoo.Server/src/modules/*` | Keep existing masters under `controllers/v1` + `models/` |
| `server/src/middleware/*` | `Odoo.Server/middlewares/` | Existing plural folder — extend here, don't create second |
| `admin/` | `Odoo.Admin/` | Vite + React 18 |
| `website/` | *(new)* `website/` at monorepo root | Phase 14 |
| `mobile/` | *(new)* `mobile/` | Phase 15 |
| `mcp/` | *(new)* `mcp/` | Phase 17 |
| `packages/shared/` | *(new)* `packages/shared/` | Phase 1 optional |
| `docs/` | `docs/` | Spec vault (this folder) |
| `Reference Project/**` | `d:\odoo2026\Reference Project\**` | **Outside** monorepo; read-only |

## Design-system primitives to reuse (Admin)

| Need | Existing file | Action |
|---|---|---|
| HTTP client | `Odoo.Admin/src/api/index.jsx` | Extend only |
| Endpoints map | `src/api/endpoints.jsx` | Extend |
| Toast | `react-toastify` in `App.jsx` | Do not add second toast lib |
| Table | `Components/Common/DraggableDataTable.jsx` | Prefer over new table until Phase 3 DataTable |
| Modal / confirm | `DeleteModal.jsx`, Reactstrap Modal | Extend |
| Forms chrome | `FormsHeader`, `FormAddFooter`, `FormUpdateFooter` | Extend |
| Auth gate | `Routes/AuthProtected.jsx` | Extend |
| Permission gate | `Routes/PermissionProtected.jsx` | Extend; map string perms in Phase 2 |
| Nav | `MenuContext` + VerticalLayouts | Plug new menus via MenuMaster API |
| Layout shell | `Layouts/index.jsx` | Extend; FullscreenLayout for POS/KDS later |

## Conflicts & resolutions

| Conflict | Existing | Docs | Resolution |
|---|---|---|---|
| Auth transport | Cookie session | JWT access+refresh | **Keep session for admin** (ADR-0002); JWT optional for mobile/MCP later |
| DB env name | `DATABASE` | `MONGODB_URI` | Accept both in config (ADR-0003) |
| Response envelope | `{ isOk, message, data }` | `{ data }` / `{ error }` | Keep `isOk` for existing clients; new Arambh APIs may dual-shape then converge (ADR-0004) |
| Validation | express-validator | zod | Add zod for new modules; don't rip out express-validator yet |
| Permissions | Menu CRUD flags | `booking.create` strings | Dual: keep menu flags for legacy screens; add string perms for new modules (Phase 2) |
| Server layout | Flat controllers/models | `src/modules/*` | New domain code under `src/modules/`; leave masters in place (ADR-0005) |
| Money | N/A (no money domain) | Integer paise | Follow docs for all new money fields |
| Admin build | Vite (finalRBAC1) | Assumed CRA in older notes | Vite is source of truth |
| Package paths | `Odoo.Server` / `Odoo.Admin` | `server/` / `admin/` | Docs use logical names; code uses `Odoo.*` |
