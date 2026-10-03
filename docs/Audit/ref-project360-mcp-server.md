# project360-mcp-server

**Branch read:** `development` (`50832b1`) tracking `origin/development`. Not a `production` branch checkout.

Hosted MCP bridge for Project360. **Primary reference for Phase 14 / [[20-MCP-Server]]** — SDK usage, transports, OAuth for ChatGPT, tool registration, REST-only backend access.

## Architecture

TypeScript ESM package (`@barodaweb/project360-mcp`). Dual entry:

1. **HTTP** (`src/index.ts` → Express `createApp`) — Streamable HTTP `/mcp`, legacy SSE `/sse`, OAuth AS, setup UI.
2. **stdio** (`src/stdio.ts`) — local Cursor/Antigravity; logs **stderr only**.

MCP server never touches Mongo. All tools call Project360 REST via `Project360ApiClient` + user JWT. Slim default tool set; `PROJECT360_MCP_FULL=1` loads extra packs.

SDK: `@modelcontextprotocol/sdk` ^1.12.1; validation with **zod**.

## Folder structure

```
project360-mcp-server/
  src/
    index.ts / stdio.ts / config.ts / load-env.ts
    mcp/           # create-server, create-server-full, context, prompts, resources
    mcp/tools/     # core, task-assign, reports, daybook, projects, hr, admin…
    client/        # api-client.ts
    auth/          # jwt, login, permissions, resolve-auth, token-store, refresh
    oauth/         # routes, pkce, clients, tokens, metadata, signing-secret
    server/        # app, middleware/auth, routes/{mcp-sse,health,setup}
    catalog/       # api-catalog.ts (passthrough discovery)
    utils/         # errors, api-response, dates
  web/             # Vite setup UI (login / paste JWT)
  CHATGPT.md AUTH.md ARCHITECTURE.md USAGE.md
```

## Patterns worth copying

| Path | What | Where in Arambh |
|---|---|---|
| `src/mcp/create-server.ts` | Register prompts/resources + slim tools; opt-in full pack | `mcp/` package structure — Phase 14 |
| `src/mcp/tools/*.ts` | `server.tool(name, schema, handler)` + zod inputs | One file per domain pack |
| `src/client/api-client.ts` | Bearer fetch wrapper; parse errors → `ApiError` | MCP → Odoo.Server REST only |
| `src/server/routes/mcp-sse.ts` | StreamableHTTP + SSE session maps; OAuth WWW-Authenticate | Hosted MCP transport |
| `src/oauth/*` + `CHATGPT.md` | PKCE OAuth, ChatGPT connector, `.well-known` under `/oauth` and `/mcp` | ChatGPT connection runbook |
| `src/auth/resolve-auth.ts` + `token-store.ts` | Newest JWT by `iat` (file vs env); watch file for refresh | Local Cursor auth UX |
| `src/auth/permissions.ts` | Snapshot menus/read-write from API; gate tools | Map to Arambh permission strings |
| `src/utils/errors.ts` | `toToolText` / `toToolError`; compact JSON (token thrift) | MCP error mapping |
| `src/catalog/api-catalog.ts` | Resource listing endpoints + `project360_api` passthrough | Escape hatch tool |

## Reusable components

- `web/` Vite setup page — login with email/password or paste JWT; pattern for Arambh MCP setup UI (re-skin, don’t import).
- Docs: `CHATGPT.md`, `AUTH.md`, `ANTIGRAVITY.md` — process templates for our `docs/`.

## Reusable services

Conceptual only (no DB services):

- Auth resolve + Project360 login (`src/auth/login.ts`) → call Arambh `/auth/login`.
- Permission fetch/cache (`src/auth/permissions.ts`) → `permissions.js` + `/me`.
- Tool packs as thin adapters over REST (assign_task, daybook, reports).

## DB patterns

None. Persistence is filesystem OAuth signing secret (`~/.project360/oauth/signing-secret`) and `mcp-auth.json` token file — fine for MCP host, not for arena domain data.

## API patterns

- MCP tools return `{ content: [{ type: "text", text }], isError? }`.
- Backend envelope unwrapped via `utils/api-response.ts` (`unwrapApiData`).
- Passthrough tool validates method/path against catalog.
- Health at `/health`; setup routes under `/` and `/api/auth-*`.

## Auth / AuthZ

- **stdio / Cursor:** `PROJECT360_JWT` or email/password → employee JWT; must reload host after switch.
- **ChatGPT:** OAuth 2.1-ish (PKCE); user logs in with Project360 credentials; MCP uses resulting token — see `CHATGPT.md` (Developer mode → add connector URL `…/mcp`).
- **HTTP MCP:** `requireJwt` middleware; OAuth metadata for protected resource.
- Tool authZ = same roles/menus as admin API (fetched permissions), not a separate RBAC.
- **Adapt for Arambh:** MCP must use `requireAuth` + permissions on REST; optional scoped MCP tokens (datasetu `mcpAccess.js` style) for safer ChatGPT.

## UI/UX patterns

Setup web UI: primary “Login with Project 360”, advanced JWT paste, auth-status, generated mcp_config snippets. Keep that UX for arena MCP onboarding.

## Performance / security techniques

- Slim ~18–20 tools by default (faster agent loops); full pack opt-in.
- Compact JSON tool results (no pretty-print).
- helmet + cors + express-rate-limit on HTTP app.
- OAuth signing secret auto-generated on server (not in git).
- stderr-only logging on stdio transport.
- nginx note: put `.well-known` under `/oauth` and `/mcp` because root `/.well-known` often blocked.

## NOT worth reusing

- Project360-specific HR/daybook/task tool names — replace with booking/inventory/finance tools.
- Hard-coded live URLs in `oauth/defaults.ts` — make Arambh env-driven.
- Full 60-tool surface as default (they already warn against it).
- Storing long-lived passwords in env for stdio except local dev.
- Any direct DB access pattern (there is none — keep it that way).

## Recommended adaptation

- **Phase 14:** Scaffold `mcp/` like this repo: `create-server`, tool packs, `api-client` → Odoo.Server, stdio + Streamable HTTP.
- **Phase 14:** Implement ChatGPT OAuth using `src/oauth/*` + publish an Arambh `CHATGPT.md` runbook (connector URL, well-known paths).
- **Phase 14:** Tools call **services via REST** only; never Mongoose — matches [[00-Cursor-Execution-Guide]] §5.
- **Phase 1/6:** Ensure REST permissions are granular enough that MCP inherits them.
- Prefer slim tool list: availability, create booking, cancel, stock check, today’s revenue — expand later.
- Combine with datasetu MCP scope allowlists for defense in depth.
