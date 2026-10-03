# 0007 · MCP API keys for ChatGPT / Claude

- **Status:** accepted
- **Date:** 2026-10-03

## Context
[[20-MCP-Server]] needs ChatGPT and Claude to call Arambh admin data. Admin UI stays on cookie sessions ([[ADR/0002-session-auth-for-admin]]). Project360 MCP uses employee JWTs + OAuth; Arambh admin login is session + consent fields, so a JWT-for-all-admin path would widen scope.

## Decision
- Keep admin panel on **express-session**.
- MCP clients authenticate to `Odoo.Server` with **Bearer API keys** (`ck_live_<prefix>_<secret>`), hashed at rest, scoped `mcp.read` | `mcp.write` | `mcp.admin`.
- Each key has an **acting user** (creator) so domain RBAC and audit (`source: mcp`) still apply.
- The `mcp/` process is a thin MCP SDK host (HTTP + stdio). It never opens Mongo; tools call `/api/mcp/*` only.
- OAuth for ChatGPT connectors can wrap the same keys later; v1 documents Claude Desktop / Cursor with the API key header and ChatGPT via a public HTTPS `/mcp` URL that uses a server-side key (or OAuth in a follow-up).

## Consequences
- New module `Odoo.Server/src/modules/mcp/`.
- Owner/admin needs `mcp.manage` to create/revoke keys.
- Write tools use pending-action confirmation (prepare → confirm).
