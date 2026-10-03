# 18 · Member Mobile App (React Native)

Tech: **Expo** (managed workflow, EAS builds). Match the repo's language. VERIFY `Reference Project/Elevate.Application`: if it's React Native, copy its folder structure, auth flow and API client.

Libraries: `expo-router`, `@tanstack/react-query`, `zustand` (cart, auth), `expo-secure-store` (tokens), `expo-notifications`, `react-native-razorpay` (needs a dev build; Expo Go uses the `mock` provider), `react-native-qrcode-svg`, `react-hook-form` + `zod`. No extra UI kit unless Elevate.Application already uses one; build primitives from [[21-Design-System]] tokens.

## 1. Structure
```
mobile/
├── app/
│   ├── (auth)/login, otp, register
│   ├── (tabs)/_layout, index (Home), book, shop, assistant, me
│   ├── booking/[id], booking/confirm, social/[id]
│   ├── product/[slug], cart, checkout, orders/index, orders/[id]
│   └── membership, wallet, notifications, settings, support, qr
├── src/api/ (client, endpoints/*), src/components/, src/theme/, src/hooks/, src/store/
└── app.config.(js|ts)          # EXPO_PUBLIC_API_URL
```

## 2. Screens → APIs

| Screen | Content | API |
|---|---|---|
| Login / OTP / Register | phone + OTP or email/password; registration creates a prospect member, then prompts for a plan | `POST /api/auth/otp/request`, `/otp/verify`, `/auth/login`, `/auth/register`, `/auth/refresh` |
| Home | membership card (tier, expiry countdown), next booking + QR, "Free tonight" quick slots, social play, orders ready for pickup | `GET /api/me/home` |
| Book | sport tabs, 14-day date strip, courts × times grid with price and reason if not allowed, "2 bookings left today" | `GET /api/availability` |
| Booking confirm | court, time, price + rule, participants, pay (free / online / wallet / pay at desk) | `POST /api/bookings`, `/:id/pay`, `/:id/confirm-payment` |
| My bookings | upcoming / past, cancel with refund preview, reschedule | `GET /api/me/bookings`, `/api/bookings/:id/cancel`, `/reschedule` |
| Social play | sessions, join | `GET /api/social-sessions`, `POST /:id/join` |
| Shop / Product | categories, search, filters, member price, variants, stock badge | `GET /api/public/products`, `GET /api/me/pricing/products?ids=` |
| Cart / Checkout | pickup date or delivery address, totals with discount, pay | `GET/PUT /api/cart`, `POST /api/orders/checkout` |
| Orders | status timeline, pickup code + QR, delivery status | `GET /api/me/orders`, `/:id`, `/:id/cancel` |
| Membership | plan, benefits, history, renew/upgrade | `GET /api/me/membership`, `POST /api/me/membership/renew` |
| Bar | open tab, past receipts | `GET /api/me/tabs`, `/api/me/pos-orders` |
| Wallet / Loyalty [RE] | balance, history, top-up | `GET /api/me/wallet` |
| Assistant | chat | `POST /api/ai/chat` (SSE), `/api/ai/actions/:id/confirm` |
| Notifications | list, mark read | `GET /api/me/notifications`, `POST /:id/read` |
| Profile / Settings | details, photo, guardian, notification prefs, logout | `GET/PATCH /api/me` |
| Support | contact club, FAQ, send message | `POST /api/me/support` |
| Member QR | full-screen QR for front desk and bar | `GET /api/me/qr-token` |

## 3. Behaviour
- Single-flight refresh interceptor; refresh failure logs out.
- `Idempotency-Key` header on every create.
- Push token registered after login (`POST /api/me/push-tokens`); deep links `champions://booking/<id>`, `champions://order/<id>`.
- React Query persisted cache so the membership card and upcoming bookings show offline.
- Book screen refetches on focus and every 30 s.
- Accessibility: 44 pt touch targets, dynamic type, AA contrast.

## 4. Demo
Expo Go with `PAYMENTS_PROVIDER=mock`, or an EAS dev build with Razorpay test keys. `EXPO_PUBLIC_API_URL` must point at the deployed backend so phones work off Wi-Fi.
