# 0006 · Keep Bootstrap/Reactstrap admin UI kit

- **Status:** accepted
- **Date:** 2026-10-03

## Context
[[21-Design-System]] leans toward Tailwind/shadcn. `feature/finalRBAC1` admin is Velzon-style Bootstrap 5 + Reactstrap with working tables, toasts, and permission gates.

## Decision
Keep **Bootstrap + Reactstrap** for the admin/POS/front-desk surfaces for the hackathon. Implement Phase 3 building blocks (DataTable, FilterBar, EntityDrawer, etc.) on top of existing Common components. Public **customer-site** may use a distinct visual system (React + Vite per ADR-0001).

## Consequences
Faster delivery; less churn on login/shell. Branding "Arambh Sports Arena" applied via theme/CSS variables without a full kit rewrite.
