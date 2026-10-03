# Elevate.Admin

**Checked out:** detached HEAD `6aac1ad` (“admin setup”). CRA React 18 + Reactstrap/Bootstrap 5 admin for Elevate Golf (company/employee masters, CMS email, RBAC menus). Feeds [[16-Admin-Panel]], Phase 3 shell + Phase 2 UI gating.

## Architecture

CRA (`react-scripts` 5) SPA with `react-router-dom` v6, axios via CRA `proxy` → `http://localhost:7001`. Layout shell (Vertical/Horizontal/TwoColumn) + `AuthProvider` / `MenuProvider`. Feature pages call thin `functions/*` axios wrappers; forms are mostly local state + modals (Formik/Yup present but lightly used). UI kit is Bootstrap/Reactstrap + `react-data-table-component` + `react-toastify` + i18next.

## Folder structure

```
Elevate.Admin/
├── public/
├── src/
│   ├── Components/Common/     # TableContainer, DeleteModal, filters, loaders
│   ├── config/apiEndpoints.js # REST + legacy path map
│   ├── context/               # AuthContext, MenuContext
│   ├── functions/             # axios CRUD by domain (Master, Setup, CMS, Auth)
│   ├── Layouts/               # Sidebar, Header, LayoutMenuData
│   ├── pages/                 # Auth, Dashboard, Master/*, Setup/*, CMS/*
│   ├── Routes/                # allRoutes, AuthProtected
│   └── locales/               # i18n JSON
├── package.json
└── build/
```

## Patterns worth copying

| Path | What | Where in Arambh |
|---|---|---|
| `src/config/apiEndpoints.js` | Single map of REST + legacy endpoints | `admin/src/lib/apiEndpoints.js` (Phase 3) — keep one client, drop dual legacy once server is clean |
| `src/Routes/allRoutes.js` + `AuthProtected.js` | Route table + gate on session key | Admin router + protected layout (Phase 3) |
| `src/context/MenuContext.js` | Menu fetch, 30m cache, `currentPagePermissions` (read/write/edit/delete/print/mail) | Adapt to string perms `booking.create` via `usePermission` / `<Can>` (Phase 2–3) |
| `src/pages/Master/GameMaster.js` | List + modal create/edit + DataTable + permission-aware actions | Template for master CRUD screens (courts, products, plans) Phase 3–4 |
| `src/Layouts/Sidebar.js` + menu data | Sidebar driven by fetched menus | Nav config with `perm` per item (Phase 3) |
| `src/pages/Authentication/Login.js` | Login + OTP forgot-password multi-step | Staff login / password reset UX (Phase 2) |

## Reusable components

- `src/Components/Common/TableContainer.js` — react-table wrapper (sort, filter, pagination, row select); pattern only — prefer TanStack Table + our `DataTable`.
- `src/Components/Common/DeleteModal.js`, `FormsHeader.js`, `FormAddFooter.js`, `FormUpdateFooter.js`, `FormsModalHeader.js` — modal CRUD chrome.
- `src/Components/Common/LoadingOverlay.js`, `Loader.js`, `BreadCrumb.js`, `GlobalSearchFilter.js`, `ImageUploader.js`.
- `src/Components/Common/filters.js` — column filter helpers for tables.

## Reusable services

No true service layer (browser-only). Closest equivalents:

- `src/functions/Master/*.js`, `Setup/*.js`, `CMS/*.js` — one file per resource, axios CRUD + Bearer from `localStorage`.
- `src/functions/Admin/adminFunc.js` — company/admin fetch used by `AuthContext`.
- Pattern to copy: thin API modules; **do not** copy per-call header repetition — use one axios interceptor.

## DB patterns

N/A (frontend). Assumes backend envelope `{ isOk, data, role }` and menu/role documents with CRUD flags. Soft-delete / audit are server-side elsewhere.

## API patterns

- Base: `/api/...` via CRA proxy; Bearer `localStorage.token`.
- Dual endpoint naming in `apiEndpoints.js` (REST + `*_LEGACY`) — useful migration idea; do not keep forever.
- List/get/create/update/delete naming mirrors server (`/api/auth/list/...` legacy still used on pages).
- Toasts on success/error at call sites; no shared error normalizer.

## Auth / AuthZ

- Session: `localStorage._id` + `token`; `AuthProtected` only checks `_id`.
- `AuthContext` loads company via `getCompany(_id)`; stores `adminData` + `role`.
- `MenuContext`: `/api/auth/get/current-user` → ADMIN vs employee; employee menus from `/api/auth/get/employee-roles/{roleId}`; page permissions object for button disable.
- Login: company/employee paths in `Login.js`; OTP send/verify/reset password steps.
- **Adapt:** keep gate + menu idea; replace CRUD flags with permission strings; add refresh single-flight; never trust localStorage alone for sensitive UI (server still enforces).

## UI/UX patterns

- Vertical sidebar admin shell; master pages = DataTable + “Add” modal + edit modal.
- `react-toastify` feedback; loading overlays on fetch.
- Light/dark toggle components exist (`LightDark.js`) — theme is template-heavy.
- i18n scaffolding (`locales/en.json` etc.) — optional later.

## Performance / security techniques

- Menu cache 30 minutes in `MenuContext` (reduces role/menu refetch).
- Proxy keeps API same-origin in dev.
- **Gaps:** token in localStorage (XSS); AuthProtected ignores token validity; axios headers duplicated; CORS/proxy only as secure as backend.

## NOT worth reusing

- Full Velzon/theme asset dump (`assets/scss`, demo pages in `LayoutMenuData.js`) — noise vs our design system.
- `react-data-table-component` + Bootstrap — Arambh targets Tailwind/shadcn (Phase 3).
- Formik/Yup stack if we standardize on RHF + zod.
- Dual legacy endpoint forever; CRA (prefer Vite if existing admin already uses it).
- Golf-specific masters (Game, FocusArea, Orientation) as-is.

## Recommended adaptation

- Phase 2: Port OTP forgot-password UX; map MenuContext → `usePermission` / role matrix editor; keep Bearer header pattern via one API client.
- Phase 3: Nav items with `perm`; DataTable inspired by GameMaster list/modal flow; DeleteModal/ConfirmDialog equivalents; loading/empty/error states on every list.
- Phase 4+: CRUD screen recipe from `pages/Master/*` + `functions/Master/*` for club setup entities.
- Do not import this repo; copy patterns only into `admin/`.
