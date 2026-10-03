# 0002 · Session auth for admin (not JWT)

- **Status:** accepted
- **Date:** 2026-10-03

## Context
[[06-Auth-RBAC]] and [[02-Architecture]] assume JWT access + refresh tokens. The `feature/finalRBAC` server and `feature/finalRBAC1` admin use **express-session** cookies (`sessionId`) with `connect-mongo`, and the admin axios client uses `withCredentials`. JWT helpers exist but are unused.

Changing to JWT would break the working admin login and PermissionProtected flow.

## Decision
Keep **cookie session auth for the admin panel**. Extend `authMiddleware` / session user shape for string permissions and member users. Introduce JWT (access + refresh) later for **mobile app and MCP** clients only, behind the same permission checks.

## Consequences
- CORS must allow credentials from the admin origin.
- Mobile/MCP phases add JWT without removing sessions.
- Docs that say "Bearer for admin" should be read as "authenticated request"; admin uses cookies.
