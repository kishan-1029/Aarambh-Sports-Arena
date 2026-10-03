# datasetu-server

**Branch read:** detached HEAD at `origin/production` (`616b9aa`) — preferred production tip.

Data Setu / BusinessMeet API. Largest, most mature Express reference. Primary source for **Phase 1 conventions**: ESM layout, services, errors, logging, security, MCP-scoped auth, payments.

## Architecture

Express ESM (`"type": "module"`) monolith (`server.js`) mounting many explicit `routes/v1/*` routers. Controllers + dedicated `services/` for money, WhatsApp, STT, search, SEO. Winston logging, RabbitMQ, Socket.io, node-cron, Meilisearch, Razorpay/Stripe/PayPal. Serves SPA builds from `out/`. Second Mongo connection for WhatsApp (`config/whatsappDb.js`) — **do not copy dual DB** unless an ADR requires it; Arambh stays one connection.

## Folder structure

```
datasetu-server/
  server.js
  config/           # swagger, seo, mcpAccess, whatsappDb
  routes/v1/        # *.routes.js (explicit imports in server.js)
  controllers/v1/   # HTTP adapters
  services/         # domain services (+ payments/, workflowEngine/)
  models/
  middlewares/      # auth, errorHandler, securityHeaders, rateLimiter, inputValidator…
  utils/            # logger, queryHelpers, rabbitmq, money-ish helpers, cronJobs
  jobs/ cron/ tests/ scripts/ migrations/
```

## Patterns worth copying

| Path | What | Where in Arambh |
|---|---|---|
| `middlewares/errorHandler.js` | `ApiError` + global handler; `{ isOk: false, status, message }` | Single error class — Phase 1 |
| `utils/logger.js` | Winston + daily rotate; prod vs dev transports | Replace console/file HTML logs |
| `middlewares/securityHeaders.js` + `rateLimiter.js` + `inputValidator.js` | Helmet, CORS, auth/search rate limits, mongo-sanitize, field allowlists | Phase 1 hardening |
| `config/mcpAccess.js` | Deny-by-default MCP scope allowlists (`mcp_read` / `prepare` / `write`) | Phase 14 MCP + admin API |
| `middlewares/authMiddleware.js` | Role JWT secrets + separate `MCP_JWT_SECRET_KEY` + scope enforcement | Extend Odoo auth; don’t fork |
| `services/*.service.js` | Business rules outside controllers (e.g. `sttBalance.service.js`, `payments/*`) | Template for all Arambh services |
| `utils/queryHelpers.js` | Central soft-delete / active filters | List queries consistency |
| DB pool options in `server.js` | `maxPoolSize`, retry reconnect, debug only in non-prod | `lib/db.js` |

## Reusable components

N/A for admin React (see datasetu-app audit). Server-side: swagger setup in `config/swagger.js` if Odoo lacks OpenAPI.

## Reusable services

Copy **patterns**, not domain logic:

- `services/sttBalance.service.js` — wallet ledger mindset (integer seconds, ensure-row, check entitlement before spend) → inventory/credits style for shop.
- `services/payments/*` — webhook raw body, gateway completion idempotency ideas → finance Phase.
- `services/notification.service.js` / `mail.service.js` — outbound side effects after commit.
- `services/authService.js` — login flows (compare with existing Odoo; extend only).

## DB patterns

- Soft status filters (`status: { $ne: 'Deleted' }`) via helpers — good; align with our schema’s soft-delete fields.
- **No mongoose sessions / `withTransaction` found** — payment completion often relies on careful ordering + unique gateway IDs. Arambh **must** add `withTransaction()` for multi-doc writes.
- Indexes and lean queries used heavily in analytics services.
- Ledger-style collections (e.g. STT usage) — pattern for stock moves / payments.
- Money: mixed (rupees/floats in places; some frontend paise helpers in built assets). **Enforce paise in Arambh** regardless.

## API patterns

- Dominant envelope: `{ isOk, message, data, status?, code? }`.
- Versioned paths `/api/v1/...`; routes are thin wrappers calling controllers.
- Validation: mostly `express-validator` + hand-rolled `validate*Input` in controllers (see `tests/mcp*.test.mjs`) — Arambh prefers **zod** per [[05-Backend-Conventions]]; keep the “validate then service” split.
- Pagination/list helpers vary by controller — introduce shared `listQuery`.
- Webhooks: raw body capture for Stripe/PayPal signature verify.

## Auth / AuthZ

- Multi-role Bearer JWTs (`EMPLOYEE_JWT_SECRET_KEY`, business/registered, etc.).
- MCP tokens: `scope` claim, dedicated secret, path allowlist in `config/mcpAccess.js` — excellent model for ChatGPT/Cursor calling Arambh APIs without full admin power.
- Login attempt / rate limit on auth routes.
- **Adapt:** map scopes → our permission strings; keep deny-by-default allowlist for MCP.

## UI/UX patterns

N/A (frontends live elsewhere / `out/`). Note response shape `isOk` already assumed by their SPA.

## Performance / security techniques

- `compression`, `trust proxy`, canonical host redirect, body size limits, webhook path exceptions for sanitizer.
- Winston JSON logs; morgan only in dev.
- RabbitMQ for async; Meilisearch for search — optional later, not Phase 1.
- Firebase admin, geoip — skip unless needed.
- Connection retry with backoff on main DB.

## NOT worth reusing

- Giant `server.js` with hundreds of explicit imports — prefer modular router aggregator **once**, still explicit.
- Dual Mongo DB for WhatsApp.
- express-validator as primary (use zod).
- Domain-specific networking/ML/card-scan services.
- Inconsistent money units.
- Swallowing `uncaughtException` without process policy.

## Recommended adaptation

- **Phase 1:** Adopt `ApiError` + winston logger + security/rate-limit middleware patterns into Odoo.Server (extend existing; one of each).
- **Phase 1:** Service-layer convention: controllers validate (zod) → call services → `audit.record` after commit.
- **Phase 1:** Soft-delete query helpers analogous to `utils/queryHelpers.js`.
- **Phase 14:** Port MCP scope allowlist idea (`mcpAccess.js`) for Arambh MCP user tokens.
- **Finance phases:** webhook raw-body + completion service structure from `services/payments/`.
- Always add transactions where datasetu omitted them.
