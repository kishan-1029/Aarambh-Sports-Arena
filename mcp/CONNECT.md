# Connect Arambh MCP to Claude / ChatGPT / Cursor

Admin-only management MCP. Tools call `Odoo.Server` `/api/mcp/*` with an API key ([ADR-0007](../docs/ADR/0007-mcp-api-keys.md)). Patterns adapted from `Reference Project/project360-mcp-server` (no imports from that tree).

## 1. Create an API key

1. Log into admin as owner (`mcp.manage`).
2. Open **Settings → MCP access** (or `POST /api/admin/mcp-keys` with session cookie).
3. Create a key with scopes `mcp.read` (+ `mcp.write` if you want booking prepares).
4. Copy `ck_live_…` once — it is not shown again.

Example (logged-in browser / curl with session):

```http
POST /api/admin/mcp-keys
{ "name": "Claude desktop", "scopes": ["mcp.read", "mcp.write"], "expiresInDays": 90 }
```

## 2. Run the MCP host

```bash
cd mcp
cp .env.example .env
# set ARAMBH_API_URL=http://localhost:7003
# set ARAMBH_MCP_API_KEY=ck_live_...
npm install
npm start          # HTTP → http://localhost:7337/mcp
# or
npm run stdio      # Claude Desktop / Cursor
```

Health: http://localhost:7337/healthz

## 3. Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "arambh": {
      "command": "node",
      "args": ["D:/odoo2026/Odoo Project/mcp/src/stdio.js"],
      "env": {
        "ARAMBH_API_URL": "http://localhost:7003",
        "ARAMBH_MCP_API_KEY": "ck_live_YOUR_KEY"
      }
    }
  }
}
```

Restart Claude Desktop. Ask: *How much did Arambh earn today?*

## 4. Cursor

Add an MCP server entry pointing at the same `stdio.js` + env, or HTTP URL `http://localhost:7337/mcp` with header `Authorization: Bearer ck_live_…` if your Cursor build supports remote MCP headers.

## 5. ChatGPT (single-domain)

Preferred prod layout (see `deploy/README.md`):

| URL | What |
|-----|------|
| `https://sportsarena.aarambhevents.in/` | Customer site |
| `https://sportsarena.aarambhevents.in/admin/` | Admin |
| `https://sportsarena.aarambhevents.in/api/` | API |
| `https://sportsarena.aarambhevents.in/mcp` | **ChatGPT connector** |

1. Deploy with nginx + PM2 per `deploy/README.md` (or temporary tunnel to port 7337).
2. ChatGPT → Developer mode → **Add connector**.
3. URL: `https://sportsarena.aarambhevents.in/mcp`
4. MCP host uses `ARAMBH_MCP_API_KEY` from env; API is loopback `http://127.0.0.1:7002`.

Smoke questions from [[20-MCP-Server#Conversation flows]]:
- How much did the club earn today?
- Break that down.
- Who’s expiring this week?
- Is a court free tomorrow at 7?

Writes return `confirmation_required` — only call `confirm_action` after you say yes.

## Tools (slim v1)

| Tool | Scope |
|------|--------|
| `get_club_summary`, `get_revenue`, `get_booking_summary`, `get_court_availability` | read |
| `search_members`, `get_member`, `get_expiring_memberships`, `get_financial_summary` | read |
| `create_booking`, `cancel_booking` → prepare | write |
| `confirm_action`, `cancel_action` | write |
