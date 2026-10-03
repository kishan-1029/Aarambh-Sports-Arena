# Existing project audit — Arambh Sports Arena

**Date:** 2026-10-03  
**Base branches (per user directive):**
- `Odoo.Server` ← `Barodaweb-Marwiz/BwebDemoProject.Server` @ `feature/finalRBAC` (`714a03a`)
- `Odoo.Admin` ← `Barodaweb-Marwiz/BwebDemoProject.Admin` @ `feature/finalRBAC1` (`9a3502f`)

Workspace monorepo: `kishan-1029/Aarambh-Sports-Arena` (`main`). Admin/Server trees were replaced with the finalRBAC tips; local `.env` preserved. `.env` is git-ignored (confirmed via `git check-ignore`).

---

## Server — `Odoo.Server`

| Item | Finding |
|---|---|
| Entry | `server.js` |
| Framework | Express `^4.21.2` |
| Language / modules | JavaScript, ESM (`"type": "module"`) |
| Node | No `engines`; CI uses Node 20; Sharp needs 18+ |
| Package manager | npm (`package-lock.json`) |
| `src/` tree | **Absent** — flat `controllers/`, `routes/`, `models/`, `middlewares/`, `services/`, `utils/`, `config/` |

### Folder structure (3 levels)

```
Odoo.Server/
├── server.js
├── package.json
├── .env / .env.example
├── config/                 # security.config.js, swagger.js
├── controllers/v1/         # 20 controllers (masters + CMS)
├── middlewares/            # auth, checkPermission, requireSuperAdmin, …
├── models/                 # 23 mongoose models
├── routes/v1/              # 16 route modules under /api/v1
├── services/authService.js # login lockout
├── utils/                  # generateToken (unused), sanitize, referenceHelper
├── uploads/
└── .github/workflows/
```

### Database

| Item | Finding |
|---|---|
| Connection | Inline in `server.js` (not a separate module) |
| Driver | Mongoose `^8.x` |
| Env var | **`DATABASE`** (not `MONGODB_URI`) |
| Atlas | Yes (`mongodb+srv://…`) |
| Sessions store | `connect-mongo` → collection `sessions` |

### Auth (critical — differs from docs)

| Item | Finding |
|---|---|
| Mechanism | **`express-session` + cookie `sessionId`** (httpOnly, sameSite lax, 24h) |
| JWT | `jsonwebtoken` + `utils/generateToken.js` present but **unused** on login |
| Roles | `ADMIN` (CompanyMaster) / `EMPLOYEE` |
| RBAC | `checkPermission(menuUrl, action)` — menu CRUD flags (`read/write/edit/delete`) |
| Super-admin | `requireSuperAdmin` → `session.user.isSuperAdmin` |
| Password | bcrypt cost 10 |
| Lockout | `LoginAttempt` + `authService` (3 fails → lock) |

### Models (23)

`BlogCategory`, `BlogMaster`, `BlogTag`, `City`, `CompanyMaster`, `Country`, `CurrencyMaster`, `Department`, `EmailFor`, `EmailSetup`, `EmailTemplate`, `EmailTo`, `Employee`, `EmployeeRoles`, `Faq`, `FaqCategory`, `Guide`, `LoginAttempt`, `MenuGroupMaster`, `MenuMaster`, `Otp`, `RoleMaster`, `State`

**No `User` model.** Auth principals are Employee + CompanyMaster.

### Validation / errors / logging

- Validation: **express-validator** (+ mongo-sanitize, hpp)
- Errors: no custom class; envelope mostly `{ isOk, message, status, data?, error? }`; `authMiddleware` uses `{ success: false }`
- Logging: morgan + console + `log/error.html`

### Routes (summary)

- Auth/session: company/employee login, logout, me, verify-session
- Masters with `checkPermission`: employees, departments, roles, employee-roles, menus, locations, currencies, email-*, company-details, login-attempt-logs
- Super-admin: company create/list/delete
- **PUBLIC (no auth):** blog/faq/guide CRUD, OTP, some location list GETs

### Uploads / tests / scripts

- Uploads: multer + `secureUpload.js` (magic bytes, WebP) → local `uploads/`
- Tests: Jest in deps, **no test files**
- Scripts: `start` (nodemon), `test` (jest)

### Env key names (`.env` / `.env.example`)

`DATABASE`, `PORT`, `NODE_ENV`, `REACT_APP_API_URL`, `ADMIN_JWT_SECRET_KEY`, `EMPLOYEE_JWT_SECRET_KEY`, `JWT_EXPIRY`, optional rate-limit/CORS/SMTP/AWS.  
**Used but missing from example:** `SESSION_SECRET`, `APP_NAME`.

---

## Admin — `Odoo.Admin`

| Item | Finding |
|---|---|
| Build | **Vite 7** (`vite.config.js`), not CRA |
| React | 18.2 + react-router-dom v6 |
| UI | Bootstrap 5.2 + Reactstrap 9 (Velzon-style), Sass |
| State | React Context (`AuthContext`, `MenuContext`); no React Query |
| Forms | Controlled inputs; Formik/Yup on template auth pages only |
| Package manager | npm; engines `node >= 22` |

### Auth / API client

| Item | Finding |
|---|---|
| Client | `src/api/index.jsx` — axios, **`withCredentials: true`** |
| Token | Cookie session (server); client stores **`localStorage.role` only** |
| Boot | `verifySession()` → `GET /api/v1/auth/verify-session` |
| Guards | `AuthProtected` + **`PermissionProtected`** (menu `read`) |
| Toast | `react-toastify` in `App.jsx` — single system |
| Tables | `react-data-table-component` + `DraggableDataTable.jsx` |
| API base | `src/config.jsx` — prod hardcoded; dev `http://localhost:7002` |

### Layout / routes

- Shell: `src/Layouts/index.jsx` (Header, Sidebar, Footer)
- Live nav: API menus via `MenuContext` → `VerticalLayouts`
- Routes: `src/Routes/allRoutes.jsx` — dashboard, masters, CMS (blogs/faqs/guides), setup
- Permissions: menu CRUD flags on pages; ADMIN bypasses

### Folder structure

```
Odoo.Admin/
├── index.html, vite.config.js, package.json
├── public/, build/
└── src/
    ├── main.jsx, App.jsx, config.jsx
    ├── api/          # axios + domain *.api.jsx
    ├── context/      # Auth, Menu
    ├── Components/Common/
    ├── Layouts/
    ├── pages/        # Auth, Dashboard, Master, Setup, CMS, HelpGuides
    └── Routes/       # AuthProtected, PermissionProtected, allRoutes
```

### Scripts

`dev`/`start` → vite; `build` → vite build; `preview`; `lint`; `format`.

### Env

`.env` present; **no `.env.example`**. Runtime API URL from `config.jsx`, not `VITE_*`.

---

## Gaps vs Arambh spec (for later phases)

1. No `src/` modular layout, `lib/db.js`, `withTransaction`, zod, pino, money/time helpers.
2. Auth is **session cookies**, not JWT access/refresh (docs assume JWT) → ADR-0002.
3. DB env is `DATABASE`, not `MONGODB_URI` → ADR-0003.
4. Response envelope is `{ isOk, … }`, not `{ data }` / `{ error }` → ADR-0004.
5. Permissions are menu CRUD flags, not strings like `booking.create` → Phase 2 extends.
6. No booking, inventory, finance, POS, CRM domain yet.
7. Blog/FAQ/Guide routes currently public on server — harden in Phase 2/18.
