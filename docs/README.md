# Champions Club — Sports Club Management Platform

> Odoo Hackathon 2026 · "Build the digital backbone of a club that has outgrown WhatsApp and Excel."

This folder is the **implementation specification** for Cursor (or any AI coding agent). It is also an Obsidian vault: open `docs/` as a vault and the `[[links]]` work.

## Stack (decided)

| Layer | Technology |
|---|---|
| Backend | Node.js (existing server in `D:\odoo2026`), Express-style modular monolith |
| Database | MongoDB Atlas (`odoo2026` database), Mongoose, **replica-set transactions** |
| Admin panel | React (existing admin in `D:\odoo2026`) |
| POS + Kitchen Display | React, full-screen layouts inside the admin app (`/pos`, `/kds`), backend patterns from `Reference Project/BFS.server` |
| Public website | React (Next.js recommended for SEO; see [[02-Architecture#Website choice]]) |
| Member mobile app | React Native (Expo), same backend |
| Realtime | Socket.IO (bookings board, kitchen tickets, stock) |
| AI assistant | Backend orchestrator + LLM tool calling + SSE streaming (UX from `Elevate.Elly`) |
| Management MCP | Separate Node service using `@modelcontextprotocol/sdk` (patterns from `project360-mcp-server`), for ChatGPT |
| Payments | Provider abstraction: `mock` (demo) + Razorpay test mode (card/UPI) + cash |

## Read in this order

1. [[00-Cursor-Execution-Guide]] — rules for the coding agent. **Read first.**
2. [[01-Requirements-Traceability]] — every problem-statement scene mapped to modules.
3. [[03-Phase0-Codebase-Audit]] — what to inspect before writing code.
4. [[02-Architecture]] — system design, Odoo alignment, folder structure.
5. [[04-Database-Schema]] — every collection, field, index.
6. [[05-Backend-Conventions]] — module layout, errors, validation, logging, transactions.
7. [[06-Auth-RBAC]] — users, roles, permissions, audit.
8. Domain specs:
   - [[07-Membership]]
   - [[08-Booking-Engine]] ⚠️ critical
   - [[09-Front-Desk]]
   - [[10-Shop-Inventory-Orders]]
   - [[11-Bar-POS]]
   - [[12-CRM-Enquiries]]
   - [[13-Staff-HR]]
   - [[14-Finance]]
   - [[15-Dashboard-Reports]]
9. Clients:
   - [[16-Admin-Panel]]
   - [[17-Website]]
   - [[18-Mobile-App]]
10. AI and management:
    - [[19-AI-Assistant]]
    - [[20-MCP-Server]]
11. Cross-cutting:
    - [[21-Design-System]]
    - [[22-API-Reference]]
    - [[23-Security]]
    - [[24-Testing]]
    - [[25-Environment-Deployment]]
12. [[26-Implementation-Phases]] — the build order with acceptance criteria.
13. [[27-Demo-Script]] — the 12-minute judging demo.
14. [[28-Risks-Extensions]]

## Folder conventions inside the vault

```
docs/
├── README.md                 ← you are here
├── 00…28-*.md                ← specification (this set)
├── ADR/                      ← architecture decisions (template in ADR/0000-template.md)
├── Audit/                    ← Phase 0 findings, written by Cursor
└── Changelog.md              ← one line per merged phase
```

## Labels used in these docs

- **[PS]** — required by the problem statement.
- **[RE] Recommended Extension** — not in the problem statement, but needed for a production-quality build. The reason is always given.
- **VERIFY IN CODEBASE** — depends on existing code; Cursor must inspect it before acting.
