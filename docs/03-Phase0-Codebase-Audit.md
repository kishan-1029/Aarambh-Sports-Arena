# 03 · Phase 0 — Codebase and Reference Audit

These docs were written **without access to `D:\odoo2026`**. Cursor must do this audit before Phase 1 and write the findings to `docs/Audit/`. Later phases reference these findings.

Time box: 60–90 minutes. Output is notes, not code.

## 1. Existing project (`D:\odoo2026` — admin + server)

Write `docs/Audit/existing-project.md` answering every item:

### Server
- [ ] Entry file, framework (Express? Fastify? Nest?), Node version (`engines`, `.nvmrc`)
- [ ] JS or TS? Module system (CommonJS / ESM)?
- [ ] Folder structure (tree, 3 levels)
- [ ] DB connection module: file, Mongoose version, connection options. Does it already point at Atlas?
- [ ] Existing models (list with fields). Is there a `User` model? Fields, password hashing lib (bcrypt/argon2)?
- [ ] Auth: JWT? Access + refresh? Cookie or header? Expiry? Where's the middleware?
- [ ] Authorization: roles? permissions? where checked?
- [ ] Validation library (zod / joi / express-validator / none)
- [ ] Error handling: custom error classes? global handler? response shape?
- [ ] Logging library (pino / winston / morgan / console)
- [ ] Existing routes (method + path list)
- [ ] File upload handling (multer? S3? local?)
- [ ] Tests: framework, how to run, any existing tests
- [ ] Env loading (`dotenv`?), list of existing env keys (names only)
- [ ] Scripts in `package.json`

### Admin
- [ ] Build tool (Vite / CRA / Next), React version, router (react-router v6/v7?)
- [ ] UI library (shadcn? MUI? Ant? Tailwind?)
- [ ] State / data fetching (React Query? Redux? Zustand? plain fetch?)
- [ ] API client: file, base URL env, how tokens are attached, refresh handling
- [ ] Layout: sidebar/nav config file, how routes are registered
- [ ] Reusable components: table, form, modal, drawer, toast, date picker, charts
- [ ] Auth flow on the client: login page, protected route component, token storage
- [ ] Theming / dark mode

### Decisions to record in `docs/Audit/folder-mapping.md`
- Real path for each target folder in [[02-Architecture#4. Repository layout (target)]]
- Which existing components become the design-system primitives
- Conflicts found (e.g. existing response shape differs from [[05-Backend-Conventions]]) and the chosen resolution. **Prefer the existing convention** unless it breaks a requirement; then write an ADR.

## 2. Reference projects

Write one file per project in `docs/Audit/ref-<name>.md` using this exact template:

```
# <Project>
## Architecture            (2–5 lines)
## Folder structure        (tree, 2–3 levels)
## Patterns worth copying  (file path → what → where it goes in our project)
## Reusable components     (path → purpose)
## Reusable services       (path → purpose)
## DB patterns             (transactions? indexes? soft delete? audit?)
## API patterns            (envelope, pagination, errors)
## Auth / AuthZ            (how it works; adapt or not)
## UI/UX patterns          (only for frontends)
## Performance / security techniques
## NOT worth reusing       (and why)
## Recommended adaptation  (bullet list of concrete actions + which phase)
```

What to look for in each:

| Reference | Look for | Feeds phase |
|---|---|---|
| `Reference Project/BFS.server` | **POS backend**: order model, line items, session/shift and cash drawer handling, payment split, table/tab handling, kitchen flow, receipt generation, daily closing, idempotency, socket usage | [[11-Bar-POS]], Phase 9 |
| `Reference Project/Elevate.Elly` | Chat architecture: message model, streaming (SSE vs websocket), stream parsing on the client, tool-call rendering, suggested prompts, conversation list, mobile layout, error/retry UX | [[19-AI-Assistant]], Phase 13 |
| `Reference Project/project360-mcp-server` | MCP SDK version, transport (stdio / SSE / streamable HTTP), tool registration pattern, input schemas, auth (OAuth? bearer?), how it calls its backend, error mapping, **how ChatGPT was connected** | [[20-MCP-Server]], Phase 14 |
| `Reference Project/datasetu-server` | Service layer pattern, validation, error classes, logging, folder org | Phase 1 conventions |
| `Reference Project/datasetu-app` | Data fetching, state management, form patterns, responsive layouts | Admin/website |
| `Reference Project/Elevate.Admin` | Nav config, data table (filters, column visibility, pagination), forms, permission gating in UI, dashboard cards | [[16-Admin-Panel]] |
| `Reference Project/Elevate.Application` | Member-facing flows, auth screens, API integration — check if it's React Native; if yes, it's the template for `mobile/` | [[18-Mobile-App]] |
| `Reference Project/Elevate.Server` | Background jobs, notifications, auth/refresh tokens, logging | Workers, notifications |

## 3. Comparison output

Finish with `docs/Audit/summary.md`:

1. **Conventions table**: for each concern (validation, errors, logging, auth, data fetching, UI kit), what the existing project uses, what references use, and **the chosen one**.
2. **Reuse list**: concrete files to port, in which phase.
3. **Gaps**: what nothing provides yet (likely booking engine, inventory moves, finance).
4. **Updates needed in these docs**: if a doc assumption is wrong, list it and create ADRs.

## 4. Acceptance

- [ ] `docs/Audit/` contains existing-project, folder-mapping, 8 reference files (7 named + BFS.server), summary
- [ ] Server starts locally against Atlas with the existing code untouched
- [ ] Admin starts and existing login still works
- [ ] No code changed in Phase 0 except adding `.env.example` if missing
