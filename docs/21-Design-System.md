# 21 · Design System

One token set shared by admin, POS, website and mobile. Goal: feels like a premium commercial product, not a template.

> VERIFY IN CODEBASE: if the admin already uses a UI kit (shadcn/ui, MUI, Ant…), keep it and map these tokens onto its theme. If it uses nothing consistent, adopt **Tailwind + shadcn/ui (Radix primitives)** for admin and website. Don't add a second kit.

## 1. Direction
"Clubhouse modern": calm neutral surfaces, one confident brand colour (court green), a warm accent (clay), dense but breathable data screens for staff, bolder and more photographic for the website. Numbers are the hero on dashboards: large, tabular figures.

## 2. Tokens (`packages/shared/tokens.json` → CSS variables + RN theme)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F7F8F6` | `#0E1210` | app background |
| `--surface` | `#FFFFFF` | `#151A17` | cards, tables |
| `--surface-2` | `#F0F2EE` | `#1C2320` | hover, zebra, inputs |
| `--border` | `#E2E6E0` | `#2A322E` | |
| `--text` | `#111714` | `#ECEFEC` | |
| `--text-muted` | `#5B665F` | `#98A39C` | |
| `--brand` | `#0F7A4A` | `#3BC489` | primary actions, active nav |
| `--brand-fg` | `#FFFFFF` | `#06140D` | text on brand |
| `--accent` | `#D9622B` | `#F08A55` | highlights, clay-court accent |
| `--success` | `#1A8F5A` | `#46C98C` | |
| `--warning` | `#B7791F` | `#E3A84A` | expiring, low stock |
| `--danger` | `#C2362F` | `#EF6A62` | errors, destructive |
| `--info` | `#2563C9` | `#6B9CF0` | |
| Tier Gold / Silver / Junior | `#B8892B` / `#7C8794` / `#2F8FB8` | lighter variants | tier chips only |

Verify contrast ≥ 4.5:1 for text pairs in both themes (add a unit test using a contrast helper).

- **Type:** Inter (UI) with `font-variant-numeric: tabular-nums` for all figures; a display face for the website headings (e.g. "Space Grotesk" or "Clash Display"-style geometric; self-host). Scale: 12 / 13 / 14 (base admin) / 16 (base web, mobile) / 18 / 20 / 24 / 30 / 36 / 48.
- **Spacing:** 4-px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Radius:** 6 (inputs, chips), 10 (cards, buttons), 16 (modals, mobile sheets), 999 (pills).
- **Shadows:** `sm` 0 1 2 rgba(0,0,0,.05); `md` 0 4 12 rgba(0,0,0,.08); `lg` 0 12 32 rgba(0,0,0,.12). Dark mode uses borders instead of shadows.
- **Icons:** `lucide-react` / `lucide-react-native`, 16 px in tables, 20 px in nav, stroke 1.75.
- **Motion:** 150 ms ease-out for hovers, 200 ms for drawers; respect `prefers-reduced-motion`.

## 3. Components

| Component | Rules |
|---|---|
| Button | variants primary / secondary / ghost / destructive / link; sizes sm 32, md 36, lg 44 (POS 56); loading spinner replaces icon, keeps width |
| Input | 36 px (admin), 44 px (mobile/web); label above, helper below, error in `--danger` with icon; money input shows ₹ prefix |
| Table | header 36 px muted uppercase 12 px; rows 44 px (comfortable) / 36 px (compact); right-align numbers; sticky header; row hover `--surface-2`; selected row brand tint |
| Card / KPI tile | title (muted 13 px), value (28–36 px tabular), delta chip (▲ green / ▼ red), optional sparkline; click drills into the report |
| Status chip | one tone map: success / warning / danger / info / neutral; text + dot, never colour alone |
| Modal | for confirmations and short forms only; destructive confirm requires reason when audited |
| Drawer | right side, 480 px (admin), for view/edit records; bottom sheet on mobile |
| Toast | bottom-right (admin), top (mobile); success auto-hide 4 s; errors stay until dismissed, show `requestId` copy button |
| Command palette | ⌘K; sections Pages / Members / Bookings / Orders / Actions; keyboard first (`cmdk`) |
| Charts | Recharts (admin/web); max 5 series; colours from tokens; always label units (₹, %, bookings); no 3D, no pie charts for > 5 slices |
| Calendar grid | CSS grid resource view (see [[08-Booking-Engine#15. Admin UI — Booking calendar]]); 30-min rows 28 px; booking blocks with left colour bar by type |
| POS tiles | 120×96 px min, product name 15 px, price below, category colour strip; whole tile tappable |
| AI chat | from Elly; user bubbles brand-tinted, assistant plain on surface; tool cards bordered with icon and title; confirmation card with primary Confirm and ghost Change |
| Empty state | icon/illustration, one sentence, primary action |
| Loading | skeletons matching final layout; never full-page spinners after first load |
| Error state | plain-language message, Retry, `requestId` |

## 4. Layout
- Admin: 240 px sidebar (collapsible to 64 px), 56 px top bar with search, bell, user. Content max-width none for tables; 1200 px for forms/settings.
- Full-screen staff UIs (front desk, POS, KDS): no sidebar, larger targets, high contrast option.
- Website: 12-column, 1200 px container, generous whitespace, real photography.
- Mobile: bottom tab bar (Home, Book, Shop, Assistant, Me), safe areas, 16 px side padding.

## 5. Accessibility
Keyboard focus rings visible (`--brand` 2 px outline), all icons buttons have labels, forms announce errors, colour never the only signal, POS usable with large text.

## 6. External references
- shadcn/ui + Radix for primitives; `cmdk` for the palette; TanStack Table for data tables; Recharts for charts.
- PromptKit-style chat components are optional; Elly's components come first.
- `github.com/mattpocock/skills`: Cursor should skim it in Phase 0 and note in `docs/Audit/summary.md` any skill/rule worth copying into `.cursor/rules` (e.g. TypeScript or testing guidance). Adopt nothing that adds runtime dependencies.
