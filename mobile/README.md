# SURAKSHA AI — Mobile App

Expo app for the SURAKSHA AI safety platform. The interface is English; incident
chat and alert content are Hinglish. The app is offline-first: an SOS or report
is saved on the device first, with its original device time, and synced later.

Stack: Expo SDK 58, React Native 0.88.1, React 19.3, TypeScript 6,
React Navigation 7, Vitest 5.1. Web is supported through React Native Web
(used for the verification runs below). No UI kit, no state library, no chart
library.

## Run

The backend must be running first (default `http://localhost:4000`).

```bash
cd mobile
cp .env.example .env      # set EXPO_PUBLIC_API_URL
npm install
npm run web               # http://localhost:8081
```

For a device or emulator:

```bash
npm start                 # Expo dev server + QR code for Expo Go
npm run android           # Android emulator
npm run ios               # iOS simulator (macOS only)
```

```bash
npm run typecheck         # tsc --noEmit
npm test                  # Vitest, 32 tests
npm run export:web        # static web export to dist/
```

### Environment

| Variable | Default | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | Backend API base URL |

`EXPO_PUBLIC_*` values are inlined at build time. Changing `.env` requires a
restart of the Expo dev server.

API URL by target:

- Web / iOS simulator on this machine: `http://localhost:4000/api/v1`
- Android emulator: `http://10.0.2.2:4000/api/v1`
- Physical phone on Expo Go: `http://<computer-LAN-IP>:4000/api/v1`
  (phone and computer on the same network; the backend must listen on `0.0.0.0`
  and the LAN origin must be allowed by the backend CORS settings)

## Accounts and roles

Roles are explicit (`USER`, `GUARDIAN`, `ADMIN`) and a guardian never inherits
administrator access. The app has no admin self-registration and no admin
screens; administrators are provisioned with `npm run seed:admin` in the
backend. A guardian can invite a child by email, or create a child account and
link it immediately. The child must enter the consent code for an invitation to
become verified, and either party can revoke the link.

## Screens

| Area | Screen | What it does |
|---|---|---|
| Auth | Sign in / Create account | Email or phone + password; session restored from the keychain |
| Home | Safety command center | Live alerts from the server, SOS hold button, quick actions, contact readiness |
| Alerts | Incident list + filters | Active/all queues, local-only and pending-sync records kept visible |
| Incident detail | Live or local record | Timeline, delivery truth, location, notes, owner/guardian actions |
| Report | Hinglish templates + free text | Severity, optional location, creates a local record first |
| Safety assistant | Hinglish guidance | Calls the backend AI adapter, labels console/degraded answers honestly, keeps every action user-confirmed |
| People | Person hub | Entry points for contacts and guardian links |
| Contacts | Trusted contacts | Add, verify, make primary, remove; phone changes reset verification |
| Guardians | Guardian links | Invite, consent, create child account, revoke; scoped safety access only |
| Settings | Profile and privacy | Profile/language, phone OTP, offline queue, session revocation, deletion request |

The SOS button requires a 3-second hold so a pocket press does not send an
alert. Location is requested once, silently, before the alert is queued. The
alert never waits for GPS; if permission is denied it is still saved and sent,
and the detail screen says that location was unavailable.

## Offline-first model

Persisted device state lives in `AsyncStorage` under
`suraksha.offline-data.v1`. It is scoped per signed-in user, so signing out does
not leak one person's queued alerts into another account. The refresh token is
stored with Expo SecureStore (the OS keychain on device), never in
AsyncStorage.

1. **Create locally.** An SOS/report gets a `clientIncidentId` generated on the
   device, the device's original `startedAt`/`clientCreatedAt`, and is written
   to the outbox before any network call. The UI immediately shows
   `Saved on this device` + `Pending sync` + `Local only`.
2. **Try the server.** If reachable, the record is uploaded. The server treats
   `clientIncidentId` as idempotent, so retries cannot create duplicates.
3. **Queue what is left.** Failed items stay in the outbox and are retried when
   the network returns, when the app comes to the foreground, on app start, and
   through **Sync now** in Settings. A permanent `4xx` failure is kept visible
   with its error instead of being silently dropped.
4. **Keep honesty after sync.** The server stores the original device time and
   the real receive time. The app shows an **Offline honesty** panel with
   device time, server receive time, and the delay (for example `5s late`).
   Nothing is rewritten to pretend the alert was sent immediately.
5. **Status changes and locations also queue.** Cancelling while offline, and
   location pings appended to an active incident, are outbox entries too. They
   send in order once connectivity returns. Cancelling before sync means nobody
   was alerted, and the app says so explicitly.
6. **Merge, do not overwrite.** After a sync the device record keeps its local
   history and adopts the server status/notification summary. Server payloads
   remain the source of truth for delivery counts.

Delivery semantics match the backend: `SENT` means a provider accepted a
message; `DELIVERED` requires a signature-verified provider webhook. In console
mode the app labels every notification `simulated` and shows `0 delivered`
unless a real webhook has confirmed delivery. A `Delivery failed` state means no
verified contact could be alerted; the app does not imply help is on the way.

## Verification performed

- Mobile typecheck clean; `32/32` Vitest tests pass (outbox 13, sync 10,
  formatting 4, report content 5); Expo web export succeeds (1.5 MB JS bundle).
- Backend regression suite passes: `50/50` tests; backend typecheck clean.
- Runtime checks against the real backend in Expo web:
  - Guardian sign-in, hard reload session restore, live Home data.
  - Report creation, incident detail, responder note, SOS hold trigger with
    notification rows, cancellation (`Cancelled` in the timeline).
  - Contact add, verification via console OTP, make primary, remove.
  - Guardian invite, child acceptance with consent code, create-child, revoke.
  - Settings profile save, phone-change OTP verification, account-deletion
    request (sessions revoked, signed out).
  - Location permission denied -> honest "Location unavailable" message; the
    alert still completes.
  - Safety assistant in console mode: a Hinglish SOS returned `Immediate
    danger` / `Critical`, a `Call 112` action, and an explicit **Console
    guidance · simulated** badge; no incident was created automatically.
- Offline E2E: rejected `/api/v1` fetches and forced `navigator.onLine = false`.
  The report showed `Local only` / `Pending sync` / original device time. After
  restoring the network it synced automatically, then showed `Offline honesty`,
  `5s late`, both timestamps, and `Delivery failed` because the test account had
  no verified contacts. A queued SOS also survived a page reload.

## Known limitations

- **Native builds were not executed.** Verification ran on Expo web. iOS and
  Android builds, store signing, and physical-device behavior are unverified.
- **No voice pipeline.** The Safety assistant accepts typed text only. There is
  no speech-to-text, text-to-speech, wake word, or audio upload.
- **Gnani live mode is not verified.** With no credentials configured, the app
  receives the backend's deterministic console guidance and labels it
  `simulated`. The Gnani request contract has not been validated against the
  vendor.
- **Notification delivery is simulated in development.** No SMS, WhatsApp, or
  push provider is configured, so the app honestly shows console-mode
  simulations and `0 delivered`. There is no push-notification integration or
  background notification handler in this version.
- **Background sync is limited.** The outbox syncs on app start, on network
  regain, on foreground, and manually. A terminated app does not run a
  background task, and there is no guaranteed OS-level retry.
- **No offline map or cached base map.** The app shows last-known coordinates
  and staleness; it does not embed a map or tiles.
- **No automated UI/E2E test suite.** Logic is unit-tested; the flows above were
  verified manually in a browser. React Native Web keeps hidden screens in the
  DOM, so browser assertions must filter for visible elements.
- **Web cosmetic issue:** the Expo web document title renders as `undefined`.
  It does not affect functionality and there are no console errors.
- **Console OTP/dev codes are development-only.** They appear only when
  `OTP_MODE=console`; production relies on a configured SMS provider.
- Account deletion is a request: the backend revokes sessions, marks the
  account, and preserves the audit trail. It is not an instant hard delete.

## Project structure

```
mobile/
  App.tsx                     providers + root navigation
  src/
    components/               UI primitives, SOS button, sync banner
    context/                  auth, offline outbox/auto-sync
    lib/                      API + refresh rotation, location, network,
                              device info, storage, formatting, confirm
    navigation/               typed stack + tabs
    offline/                  outbox, batch sync engine, tests
    screens/                  auth, home, alerts, incident detail, report,
                              people, contacts, guardians, settings
    theme.ts                  colors, spacing, typography
```
