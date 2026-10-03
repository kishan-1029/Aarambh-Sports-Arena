# Elevate.Application

**Checked out:** `main` @ `f87ed43c`. Expo ~54 / React Native 0.81 member app (“Elevate Golf”) — player/coach roles, onboarding, tips, payments, and full Elly chat client. Template for [[18-Mobile-App]] (Phase 15) and AI UI (Phase 16).

## Architecture

Expo app entry `App.js` / `index.js`; navigation stack switches Auth → Onboarding → main tabs by MobX `AuthStore` flags. Domain logic in `src/services/*` + MobX stores under `src/stores/` (RootStore + context). Axios `apiClient` for Elevate.Server; separate `ellyService` (HTTP + WebSocket) for Elevate.Elly. React Query present in deps; primary UI state is MobX. Deep links for OAuth (`elevategolf://`).

## Folder structure

```
Elevate.Application/
├── App.js, app.config.js, eas.json
├── src/
│   ├── components/     # UI kit + Elly/* rich chat widgets
│   ├── screens/        # auth, onboarding, home, profile, Elly, payments, …
│   ├── navigation/     # AppNavigator, Auth/Onboarding/Tab + feature navigators
│   ├── stores/         # Auth, Elly, User, Ticket, Notification, …
│   ├── services/       # apiClient, ellyService, authService, supportService, …
│   ├── constants/, config/, theme/, hooks/, contexts/
│   └── modules/        # firebase, video editor native module
└── package.json
```

## Patterns worth copying

| Path | What | Where in Arambh |
|---|---|---|
| `src/navigation/AppNavigator.js` | Splash → auth gate → onboarding → app; deep linking | `mobile/` root navigator (Phase 15) |
| `src/services/api/apiClient.js` | Axios + Bearer from storage; 401 refresh hook (TODO stub) | Mobile API client — finish single-flight refresh |
| `src/stores/AuthStore.js` | Tokens, role helpers (`isCoach`/`isPlayer`), persist session | Member auth store |
| `src/stores/EllyStore.js` + `services/ellyService.js` | WS stream parse, REST fallback, suggestions, ticket/coach flows, chat history sidebar | Phase 16 AI client |
| `src/components/Elly/*` | Message bubble, typing wave, rich coach/tip cards, ticket cards, chat input, feature sidebar | AI assistant screens |
| `src/components/Shimmer/*`, `Error/*`, `Network/NoInternetScreen.jsx` | Loading/error/offline UX | Mobile design system |
| `src/components/BottomSheet/*`, `Modal/*` | Sheets for filters, confirms, payments | Member flows (book, pay, filters) |
| `src/navigation/navigationRef.js` | Navigate outside React tree (Elly navigation mode) | Deep link / AI-driven navigation |

## Reusable components

- Chat: `EllyMessage.jsx`, `EllyChatInput.jsx`, `EllyTypingWave.jsx`, `EllyHeader.jsx`, `EllyFeatureSidebar.jsx`, `EllyRichCoachCard.jsx`, `EllyRichTipCard.jsx`, ticket cards (`TicketFormCard`, `TicketSuccessCard`, …), `ClarificationBubble.jsx`.
- Chrome: `ScreenWrapper.jsx`, `Header.jsx`, `AppButton.jsx`, `Avatar/*`, `Badge/*`, `StatusBadge.jsx`.
- Feedback: `FullScreenLoader.jsx`, shimmer set, `RetryButton.jsx`, `ApiErrorScreen.jsx`, `ForcedUpdateScreen.jsx`, `MaintenanceScreen.jsx`.
- Forms/onboarding: `Onboarding/DynamicQuestionScreen.jsx`, steppers, date pickers.
- Lists: FlashList usage alongside coach/tip cards.

## Reusable services

- `src/services/api/apiClient.js` + domain services (`authService`, `supportService`, …).
- `src/services/ellyService.js` — `chat`, paraphrase tip/bio, sessions, `createWebSocket`.
- `src/services/storage/asyncStorage.js` — typed storage keys.
- `src/stores/EllyStore.js` — session lifecycle, streamingMessageId, coach recommendation state machine, navigation mode auto-advance.
- `src/stores/NotificationStore.js` + Firebase messaging module — push pattern.
- `@tanstack/react-query` available for server-cache lists if we prefer it over MobX for fetches.

## DB patterns

N/A locally (no SQLite). Relies on server + Elly Mongo sessions. Client caches Elly settings / chat history in AsyncStorage (`STORAGE_KEYS.ELLY_SETTINGS`, history arrays in store).

## API patterns

- JSON REST with Bearer access token; refresh token stored but refresh implementation incomplete in interceptor.
- Elly: `POST` chat body matches Elly `ChatRequest`; WS URL = HTTP base with `http`→`ws`.
- Stream handling in `EllyStore.connectWebSocket`: append chunks to assistant message; on failure set `useWebSocket` path to REST.
- Envelope handling varies by endpoint — normalize to Arambh `{ ok, data, error }` when integrating.

## Auth / AuthZ

- Cognito/OAuth-style tokens in AsyncStorage (`ACCESS_TOKEN`, `REFRESH_TOKEN`).
- Role via `userRole.slug` / `userType` (coach vs player) drives navigators and Elly `user_type`.
- Guest mode components under `components/Guest/`.
- Onboarding status machine (`onboardingStatus` → `ACCESS_GRANT_DONE` / bio complete).
- **Adapt:** member JWT + refresh rotation per [[06-Auth-RBAC]]; drop Cognito-specific bits; keep role-split navigators if members vs guests differ.

## UI/UX patterns

- ChatGPT-like history sidebar + support level / tone settings screens.
- Streaming tokens into one bubble; suggested follow-ups; rich structured cards mid-thread.
- Elly “navigation mode” overlay guiding users across screens step-by-step.
- Shimmer placeholders; bottom sheets over full-page filters; Lottie/splash branding.
- Coach vs player home stacks (`CoachHomeNavigator` / `PlayerHomeNavigator`).

## Performance / security techniques

- FlashList for long lists; lazy video-editor screen to avoid Expo Go crash.
- WS preferred for chat latency; REST fallback.
- MobX `wsController` / timers marked non-observable.
- NetInfo / no-internet screen; forced update / maintenance gates.
- Avoid logging raw tokens (still verbose user logs in AuthStore — strip in ours).

## NOT worth reusing

- Golf tip/coach marketplace domain models and video editor native module.
- Incomplete token refresh TODO — reimplement properly.
- Dual API clients without shared error types (merge patterns, keep one style).
- Heavy console logging in navigators/stores.
- Cognito-specific auth if Arambh uses custom JWT.

## Recommended adaptation

- Phase 15: Scaffold Expo app from navigation + AuthStore + apiClient + shimmer/error/offline primitives; member booking/shop screens as new features.
- Phase 16: Port `ellyService` event parser + `EllyStore` stream/REST fallback + core `components/Elly/*` against Arambh AI API; wire tools to booking/membership structured_data.
- Phase 2: Finish refresh single-flight; secure storage keys; permission-aware UI only where member roles exist.
- Keep MobX **or** React Query — pick one primary data approach in ADR if existing mobile differs.
- Read-only reference; copy into `mobile/`, never import.
