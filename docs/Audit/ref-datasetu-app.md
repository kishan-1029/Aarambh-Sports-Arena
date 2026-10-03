# datasetu-app

**Checked out:** `Production` @ `866d28cd`. Expo ~54 / RN 0.81 “DataSetu” networking app (contacts, meetings, chat, planner, travel, widgets). Strong reference for admin/website **and** mobile data-fetching, forms, realtime, and responsive list UX. Feeds Phase 3 admin patterns (by analogy) and Phase 15 mobile.

## Architecture

Expo app with MobX `RootStore`, feature screens under `src/screens/*`, API modules under `src/services/api/*`, optional SQLite/cache helpers, Socket.IO chat, home-screen widgets (Android/iOS). Axios singleton with in-memory token cache, selective `axios-retry`, and session-expiry callback registration (avoids circular imports). i18next for copy. No React Query — stores own loading/pagination.

## Folder structure

```
datasetu-app/
├── App.js, app.json, eas.json
├── src/
│   ├── components/       # Button, Input, Skeleton, Modals, ErrorBoundary, v2/
│   ├── screens/          # auth, home, contacts, meetings, network, chat-related, planner, …
│   ├── services/
│   │   ├── api/          # apiClient, endpoints, *Api.js per domain
│   │   └── cache/        # chatCache, contactPageCache, contactSync
│   ├── stores/           # Auth, Chat, Meeting, Todo, Planner, Travel, …
│   ├── navigation/, hooks/, theme/, i18n/, utils/
│   └── widgets/          # Android/iOS widget bridge + providers
└── package.json
```

## Patterns worth copying

| Path | What | Where in Arambh |
|---|---|---|
| `src/services/api/apiClient.js` | Token memory cache + hydrate; FormData Content-Type fix; idempotent-only retry; `registerSessionExpiredHandler` | Mobile (Phase 15) and optionally admin client hardening |
| `src/services/api/endpoints.js` + `*Api.js` | Central paths + thin domain APIs | `admin`/`mobile` API modules |
| `src/stores/ChatStore.js` | Socket.IO lifecycle, event name registry, pagination maps, memory caps | Realtime booking board / notifications (Phase 6–7, 15) |
| `src/services/cache/chatCacheService.js` | Offline-friendly message cache | Mobile resilience |
| `src/screens/home/hooks/useHomeData.js` | Screen hook coordinating store fetches | Dashboard composition |
| `src/utils/toUserFacingError.js` | Map API errors to safe strings | Shared client errors |
| `src/utils/permissions/ensurePermission.js` | OS permission prompts with copy | Camera/gallery for shop/profile |
| FlashList usage across network/home/contacts | Performant lists | Mobile lists; admin virtualization inspiration |
| `src/components/Skeleton/*`, `ErrorBoundary/` | Consistent loading/failure | Phase 3 + 15 |

## Reusable components

- `components/Button/`, `Input/`, `Skeleton/`, `Modals/`, `CommonHeader/`, `Avatar/`, `PasswordStrength/`.
- `components/ErrorBoundary/` + `react-error-boundary` usage.
- `components/v2/` — newer UI variants (prefer these patterns over legacy).
- Meeting/calendar: `react-native-big-calendar` screens under `screens/planner`, `screens/meetings`.
- Payment UI under `components/payment/` (IAP/plans — pattern for membership checkout, not business logic).

## Reusable services

- `services/api/apiClient.js`, `authApi.js`, `chatApi.js`, `meetingsApi.js`, `todoApi.js`, `plannerApi.js`, `paymentApi.js`, `uploadApi.js`, …
- `services/cache/*` — page/contact/chat caching.
- `services/NotificationService.js`, `ChatNotificationHandler.js`, `LocationService.js`, `analyticsService.js`, `configService.js`, `appVersionService.js`.
- Stores: `AuthStore`, `ChatStore` (socket + caps), `MeetingStore`, `TodoStore`, `PlannerStore`, `AppStore`.

## DB patterns

- Client-side: `expo-sqlite` available; chat/contact caches in services (not a full offline DB design to copy blindly).
- Soft limits in ChatStore: `MAX_CACHED_CONVERSATIONS = 50`, `MAX_MESSAGES_PER_CONVERSATION = 200`.
- No server transactions here; assumes backend pagination (`messagePagination` map).

## API patterns

- `ENDPOINTS` constant object; APIs return axios promises; screens/stores interpret `response.data`.
- Bearer via cached token; 401 → registered logout handler.
- Retries: 3× exponential, **GET/idempotent only**; never retry multipart uploads / STT / card-scan.
- Debug-gated request/response logs.
- Socket events: `new_message`, `message_status_update`, `user_typing`, `user_online`, etc.

## Auth / AuthZ

- Token `@businessmeet_token` in AsyncStorage + memory; `hydrateAuthToken` on startup.
- Auth screens/OTP under `screens/auth` + `ENDPOINTS.AUTH.*` (login, register, OTP, forgot password).
- Premium/plan gates: `utils/premiumGate.js`, `travelPremiumGate.js` — analogous to membership feature flags.
- **Adapt:** align storage keys and refresh with Arambh auth; keep session-expiry callback pattern.

## UI/UX patterns

- Home dashboard composed of widgets/sections with FlashList; filter chips without nested ScrollViews.
- Tab navigators (bottom + material top tabs) for network/meetings.
- Skeleton loaders; error boundaries; haptics; localization.
- Deep links for widgets (`widgets/linking/*`).
- Forms: screen-local state + dedicated hooks folders (`screens/*/hooks`).

## Performance / security techniques

- In-memory auth token (fewer AsyncStorage bridge hits).
- Careful axios-retry (avoids triple upload bug — document this for our upload routes).
- FlashList; chat memory caps; socket listener cleanup via static `SOCKET_EVENTS` list.
- `babel-plugin-transform-remove-console` in prod tooling.
- Permission helper messaging; tracking transparency / Firebase analytics (use selectively).

## NOT worth reusing

- Domain: business cards, call-log native modules, Facebook SDK, IAP catalog, home-screen widgets — out of scope for sports arena MVP.
- Token key naming and DataSetu-specific endpoint map.
- Duplicating MobX + a second global state system if admin already uses React Query — choose per client.
- `google-services.json` / plist in repo — never copy secrets/config blobs into Arambh.

## Recommended adaptation

- Phase 3 (admin/website analogy): endpoint registry + thin API modules; error→toast mapping; skeleton/empty/error on lists.
- Phase 15: Copy `apiClient` retry/upload rules, Auth hydrate/expiry callback, FlashList list screens, ChatStore socket lifecycle as template for live court board / member chat if needed.
- Phase 6–7: Socket room join pattern from ChatStore for front-desk live updates (pair with server `realtime/socket.js`).
- Phase 1: Ensure one shared error vocabulary so `toUserFacingError` can map server codes.
- Read-only reference; patterns only into `admin/` / `mobile/` / `website/`.
