# RakshaNet — Development Plan

**Women & Child Safety and Development | Offline-First Safety Platform**

This document is the working plan for building RakshaNet from the current empty repository to a
production release and beyond. It is a living document — update it as decisions are made and
scope changes.

---

## 1. Vision & Guiding Principles

RakshaNet helps women and children request emergency assistance, share location with trusted
contacts, and access safety features **even when connectivity fails**.

Every technical decision must respect these principles:

1. **Offline-first.** Essential safety actions (SOS, local alarm, event recording, SMS/call
   fallback) must work with zero internet connectivity. Network is an enhancement, never a
   dependency.
2. **Honest delivery status.** Never claim an alert was delivered when it was only prepared.
   Opening the WhatsApp composer is `HANDED_OFF`, not `SENT`. The UI must distinguish
   `QUEUED → HANDED_OFF → SENT → FAILED → ACKNOWLEDGED` per channel.
3. **Privacy by default.** Location is shared only with explicitly chosen contacts, only for
   the duration the user grants, and revocation is one tap away. No silent background tracking.
4. **Consent and disclosure.** WhatsApp automation requires an approved integration and user
   consent. Location freshness (timestamp/accuracy) is always shown to both sender and
   receiver.
5. **Reliability over features.** A boring, well-tested SOS path beats a feature-rich unreliable
   one.

---

## 2. Tech Stack (confirmed)

| Component | Technology |
|---|---|
| Android app | Kotlin, Jetpack Compose, Material 3 |
| Offline storage | Room (SQLite), DataStore (settings) |
| Location | Google Play services FusedLocationProvider + Android Location APIs fallback |
| Background work | WorkManager |
| WhatsApp | `ACTION_SEND`/`wa.me` intents (v1); WhatsApp Business Cloud API (later phase) |
| SMS / calls | `SmsManager`, `Intent.ACTION_CALL` |
| Wearable | Wear OS APIs, Bluetooth LE (later phase) |
| Backend | Node.js, Express, MongoDB (Mongoose) |
| Security | Android Keystore, HTTPS/TLS, JWT auth, role-based access control |
| Build/tooling | Gradle Kotlin DSL, Version Catalog, GitHub Actions CI |

**Minimum SDK 24 (Android 7.0), Target SDK 35.**

---

## 3. Repository Structure

Monorepo with a modular Android app plus backend:

```
RakshaNet/
├── PLAN.md
├── README.md
├── android/                          # Android project root
│   ├── settings.gradle.kts
│   ├── build.gradle.kts
│   ├── gradle/libs.versions.toml     # version catalog
│   ├── app/                          # Compose UI, navigation, DI wiring
│   ├── core/
│   │   ├── common/                   # result types, dispatchers, utilities
│   │   ├── data/                     # Room, DataStore, repositories
│   │   ├── domain/                   # models, use cases, state machines
│   │   ├── designsystem/             # theme, components
│   │   └── notifications/            # alarm, foreground services
│   ├── feature/
│   │   ├── sos/                      # trigger, alarm, event detail
│   │   ├── contacts/                 # trusted contacts, consent, revocation
│   │   ├── location/                 # live location, history, freshness
│   │   ├── journeys/                 # trip watch (Phase 2)
│   │   └── settings/                 # privacy, security, permissions
│   └── wear/                         # Wear OS companion (Phase 3)
├── backend/                          # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── routes/  ├── models/  ├── services/  ├── middleware/
│   │   └── config/
│   └── tests/
└── docs/                             # architecture notes, API spec, policy docs
```

**Pragmatic note:** start with `app` + `core:domain` + `core:data` + `core:designsystem`
modules; split out `feature:*` modules as screens grow. Do not over-modularize on day one.

---

## 4. Roadmap Overview

| Phase | Name | Target | Contents |
|---|---|---|---|
| 0 | Foundation | Weeks 1–2 | Project scaffold, CI, design system, navigation, data-layer skeleton, permission framework |
| 1 | **v1 Production Release** | Weeks 3–10 | Offline SOS, local alarm, GPS capture, trusted contacts, WhatsApp sharing, SMS/call fallback, event queue, privacy controls |
| 2 | Backend & Journeys | Weeks 11–16 | Node/Express API, MongoDB, auth, event ingestion & acknowledgments, journey safety |
| 3 | Wear OS | Weeks 17–20 | Watch-triggered SOS, shared data layer, BLE pairing |
| 4 | Advanced | Ongoing | WhatsApp Business Cloud API automation, nearby-device relay (BLE/mesh), multi-language, emergency-service integration |

Phases 2–4 depend on a stable Phase 1. Detailed breakdown of Phase 1 follows (§6).

---

## 5. Architecture (v1)

### 5.1 Layers

```
UI (Compose)  →  ViewModels  →  Use Cases (domain)  →  Repositories (data)
                                                        ├── Room DAOs
                                                        ├── DataStore
                                                        ├── Channel adapters (WhatsApp/SMS/Call)
                                                        └── Location data source
Background: WorkManager (queue drain, retry) + ForegroundService (location/alarm)
```

- **Unidirectional data flow**, StateFlow-driven UI state.
- **Hilt** for dependency injection.
- All channel access behind a `DeliveryChannel` interface so WhatsApp/SMS/call are swappable
  and unit-testable with fakes.

### 5.2 Core domain model

```kotlin
// EmergencyEvent — the central aggregate
data class EmergencyEvent(
    val id: String,                 // UUID, generated offline
    val type: EmergencyType,        // PERSONAL_SAFETY, MEDICAL, CHILD, HARASSMENT, OTHER
    val createdAt: Long,            // device time (store UTC + show local)
    val note: String?,
    val location: LocationFix?,     // may be null — never block SOS on location
    val status: EventStatus,        // ACTIVE, CANCELLED, RESOLVED
    val channelDeliveries: List<ChannelDelivery>,
)

data class LocationFix(
    val lat: Double, val lng: Double,
    val accuracyM: Float,
    val capturedAt: Long,           // freshness is mandatory
    val source: LocationSource,     // GPS, NETWORK, LAST_KNOWN, MANUAL
)

// Per-channel honest status — one row per (event, channel, contact)
data class ChannelDelivery(
    val id: String,
    val eventId: String,
    val channel: Channel,           // WHATSAPP, SMS, CALL, EMAIL, PUSH
    val contactId: String,
    val status: DeliveryStatus,
    val attempts: Int,
    val lastAttemptAt: Long?,
    val resolvedAt: Long?,
    val error: String?,
)

enum class DeliveryStatus {
    QUEUED,        // stored offline, not yet attempted
    HANDED_OFF,    // system UI opened (e.g., WhatsApp composer) — user must confirm send
    SENT,          // transport confirmed (SMS SENT broadcast / backend ACK)
    FAILED,        // transport reported failure after retries
    ACKNOWLEDGED,  // recipient confirmed receipt
}
```

**Status rules (enforced in domain, unit-tested):**
- WhatsApp intent success ⇒ `HANDED_OFF` only. Never `SENT`.
- SMS `SmsManager` SENT broadcast success ⇒ `SENT`.
- `ACKNOWLEDGED` is only set by an explicit recipient action (app link tap, reply keyword,
  or backend acknowledgment) — never inferred.
- `QUEUED` events retry via WorkManager with exponential backoff and network/battery
  constraints.

### 5.3 Offline SOS flow

```
Trigger (app button / shake / wearable)
  → create EmergencyEvent locally (synchronous, < 1s)
  → start local alarm (full-screen activity, siren via USAGE_ALARM, vibration pattern)
  → request a fresh location fix (timeout 10s; fall back to last-known; may be null)
  → evaluate channels for each trusted contact, in priority order:
       1. WhatsApp  (internet available)  → hand off to composer → HANDED_OFF
       2. SMS       (cellular available)  → SmsManager → SENT/FAILED
       3. Call      (manual, one-tap)
  → enqueue anything not yet delivered (QUEUED) into WorkManager
  → WorkManager drains queue as connectivity allows → updates per-channel status
  → UI shows per-contact, per-channel status timeline (honest at every step)
```

Key behaviors:
- **SOS never waits for network or location.** Recording the event is the first action.
- **Cancel path:** hold-to-cancel within N seconds with PIN/biometric option to prevent
  accidental dismissal; cancelled events remain in history.
- **Battery:** alarm + location use a foreground service with correct type declarations.

### 5.4 WhatsApp specifics

- Detect availability via `queryIntentActivities` for `whatsapp` package; fall back to SMS
  with a visible notice if absent.
- Use `ACTION_SEND` with pre-formatted message (type, time, coordinates or maps link,
  freshness, help request). Prefer `ACTION_SENDTO`/`wa.me` deep link for direct-to-contact.
- Message template (illustrative):

  ```
  RakshaNet Emergency Alert — SOS ALERT: HELP NEEDED
  Emergency type: Personal safety
  Time: <local time>
  Location: <lat, lng> (<maps link>) — captured <N minutes ago, ±<accuracy>m
  Request: Please contact me and follow our agreed emergency plan.
  ```
- **Status stays `HANDED_OFF`** until the user explicitly marks "I sent it" or a backend
  integration confirms delivery. Copy shown to user: *"WhatsApp message prepared —
  press send in WhatsApp."*
- Automated delivery (no user tap) is deferred to Phase 4 via WhatsApp Business Cloud API
  with template messages, Meta business verification, and explicit user consent.

### 5.5 Trusted contacts & privacy controls

- Contact records store: name, phone, relation, consent state (`INVITED → CONSENTED →
  REVOKED`), sharing scope (per-event / time-boxed live location), and priority order.
- Revocation takes effect immediately: cancels live-location jobs and blocks future sends.
- Sharing is scoped: **per-event** (default) or **time-boxed live location** with a visible
  countdown and a stop button.
- Audit log (local, later synced): who received what, when, via which channel — viewable by
  the user.

---

## 6. Phase 1 — Detailed Breakdown (v1 Production Release)

### M0 · Foundation (Week 1–2)

- [ ] Initialize Android project (Gradle KTS, version catalog, Compose BOM, Material 3)
- [ ] CI: GitHub Actions — lint, unit tests, debug build on every PR
- [ ] Hilt wiring; navigation graph (SOS, History, Contacts, Location, Settings)
- [ ] Design system: color/type/spacing tokens; core components (primary SOS button,
      status chips, permission cards)
- [ ] Data-layer skeleton: Room database + migrations strategy, DataStore prefs,
      repository interfaces
- [ ] Permission framework: single `PermissionManager` with rationale screens, status
      dashboard, and re-request flows
- [ ] Foreground-service and WorkManager scaffolding with correct Android 14+ service types

**Acceptance:** app installs, navigates, persists a test entity across restart, CI green.

### M1 · Data layer & domain (Week 3)

- [ ] Room entities: `EmergencyEvent`, `ChannelDelivery`, `TrustedContact`, `LocationFix`,
      `AuditEntry`, `Settings`
- [ ] DAOs + repositories with Flow observation; migration tests
- [ ] Domain use cases: `TriggerSos`, `CancelSos`, `AddTrustedContact`, `RevokeContact`,
      `RecordLocationFix`, `QueueDelivery`, `AdvanceDeliveryStatus`
- [ ] Delivery state machine as a pure domain object — exhaustive unit tests for every
      legal/illegal transition

**Acceptance:** state-machine test suite covers all transitions incl. illegal-transition
rejection; DB round-trip + migration tests pass.

### M2 · SOS trigger + local alarm (Week 4)

- [ ] SOS screen: large hold-to-trigger button, emergency-type selector, optional note
- [ ] `SosForegroundService` (type `specialUse`/`dataSync` as applicable): creates event,
      keeps process alive during alert
- [ ] Full-screen alarm activity: siren (USAGE_ALARM audio attrs, looping), vibration
      pattern, screen-on, hold-to-cancel with optional biometric/PIN lock
- [ ] Shake-to-trigger and home-screen widget/shortcut (optional stretch)
- [ ] Boot receiver re-registers scheduled work

**Acceptance:** SOS creates a persisted event in < 1s with **airplane mode on**; alarm
sounds and cancel path works reliably.

### M3 · Location capture (Week 5)

- [ ] `LocationProvider` abstraction: FusedLocationProvider primary, platform Location
      fallback, `LAST_KNOWN` marked distinctly
- [ ] Fresh-fix request with 10 s timeout; graceful null result; never blocks SOS
- [ ] Accuracy/freshness metadata recorded with every fix; maps link generation
- [ ] Live-location job (time-boxed) for sharing mode, with visible countdown + stop
- [ ] Background-location permission flow with prominent disclosure (required only for
      live-location feature; core SOS works with foreground location)

**Acceptance:** fix recorded with source/accuracy/timestamp; graceful behavior with
location off/denied; battery impact measurable and acceptable over a 1-h live share.

### M4 · Trusted contacts + privacy (Week 6)

- [ ] Contact CRUD with phone-number validation and duplicate detection
- [ ] Consent state machine + invitation flow (send consent request via SMS/WhatsApp)
- [ ] Per-contact priority order and channel preference
- [ ] Revoke = immediate (cancels live jobs, blocks sends, UI banner confirms)
- [ ] Privacy settings screen: sharing defaults, retention/clear-history, app lock
      (biometric), analytics opt-out

**Acceptance:** add → invite → consent → revoke cycle works end-to-end; revoked contact
receives nothing further (verified by tests on repository layer).

### M5 · Delivery channels (Week 7)

- [ ] `DeliveryChannel` interface + implementations:
  - `WhatsAppChannel` — availability detection, message formatting, intent hand-off,
        status = `HANDED_OFF`
  - `SmsChannel` — `SmsManager`, split >160 chars, SENT/Delivery intent broadcasts,
        status = `SENT`/`FAILED`
  - `CallChannel` — one-tap `ACTION_CALL` with confirmation dialog
- [ ] Per-contact delivery matrix UI: channel × status × timestamp, honest labels
- [ ] "I sent it" confirmation for WhatsApp hand-offs; auto-mark abandoned hand-offs after
        timeout with a clear "unconfirmed" label
- [ ] Retry policy: exponential backoff, max attempts, network/battery constraints

**Acceptance:** unit tests with fake channels prove the status rules in §5.2; manual test
matrix passes on ≥3 devices with/without internet, SIM present/absent.

### M6 · Event queue & history (Week 8)

- [ ] `EventQueueWorker` (WorkManager): drains `QUEUED` deliveries when constraints allow;
      idempotent (unique event+contact+channel key) to prevent duplicate sends
- [ ] Retry/backoff + permanent-failure handling (invalid number, no SIM)
- [ ] History screen: timeline of events with per-channel status; filters; export
- [ ] Event detail: full audit trail, location freshness, actions (retry, resolve, share
        again)
- [ ] Notification of status changes ("SMS delivered to Mom", "WhatsApp message
        unconfirmed")

**Acceptance:** kill-and-relaunch app mid-queue → no duplicates, no lost events; queue
drains correctly when connectivity returns (verified with network-toggle tests).

### M7 · Hardening & release (Weeks 9–10)

- [ ] Security pass: no plaintext PII in logs; Keystore for tokens/secrets; encrypted
      DataStore where needed; screenshot blocking on sensitive screens
- [ ] Play Console policy prep (see §8 Risks): restricted-permission declarations,
      background-location disclosure, full-screen-intent permission
- [ ] Accessibility: TalkBack labels on SOS controls, min touch targets, high-contrast
- [ ] Performance: cold start < 2 s, SOS trigger < 1 s, offline startup with no network
      wait; baseline profiles
- [ ] Testing: unit ≥ core domain/queue coverage; instrumentation for Room + permission
      flows; manual offline matrix; crash/analytics integration (opt-in)
- [ ] Internal testing track → closed beta with real users → production listing
- [ ] Docs: README (setup, build, features), privacy policy, data-safety form content

**Definition of Done for v1:** all §4 Phase-1 items shipped; offline SOS verified on the
test matrix; no P0/P1 bugs; policy forms approved by Play; honest-delivery wording
reviewed end-to-end.

---

## 7. Phase 2+ Summary

### Phase 2 — Backend & Journey Safety (Weeks 11–16)
- Node.js/Express API: auth (JWT + refresh), profiles, trusted-contact sync, event
  ingestion, acknowledgment endpoints
- MongoDB models mirroring Room entities; idempotent ingestion keyed by client event ID
- Push channel (FCM) as an additional delivery path; backend fan-out to guardians
- **Journey safety:** set destination + ETA + guardian → local WorkManager check-in
  reminders → missed-arrival escalation (SMS/WhatsApp/push to guardians, then backend
  escalation policy)
- Optional: guardian web view to see acknowledged alerts

### Phase 3 — Wear OS (Weeks 17–20)
- Watch app: single-tap SOS, mirrored state from phone via Data Layer API
- BLE pairing/health-signal triggers (stretch); falls back to phone-side alerting when
  disconnected

### Phase 4 — Advanced (Ongoing)
- WhatsApp Business Cloud API automated delivery (template messages, consent, opt-out)
- Nearby-device relay: BLE/mesh broadcast of SOS to nearby RakshaNet devices
- Multi-language (Hindi + regional), child-mode/dependent profiles
- Verified integration with local emergency services where available

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Play Store restricted permissions (`SEND_SMS`, `USE_FULL_SCREEN_INTENT`, background location) | App rejection | Declare use-cases honestly, submit policy forms early (M7 start), keep core SOS functional with foreground-only permissions |
| WhatsApp policy on automated messaging | Feature blocked | v1 uses user-completed share only; automation only in Phase 4 with official Cloud API + consent |
| Claiming delivery when only hand-off occurred | Trust/safety failure | `HANDED_OFF` state baked into domain; UI copy review; automated tests assert no path sets `SENT` from an intent hand-off |
| SMS cost/abuse, spam-flagging of short codes | Alerts missed | Rate-limit per event, personalize message content, prefer user-specific sender |
| Location unavailable (indoors, permission denied) | Weaker alerts | Never block on location; send event with `location = null` + explicit "location unavailable" label |
| Battery drain from location/foreground service | Uninstalls | Time-boxed live location only, fused provider, measurable budget in M3 |
| Device-specific OEM background-kill (Xiaomi, etc.) | Missed retries | Battery-optimization exemption prompt, sticky foreground service, documented onboarding step |
| False/accidental SOS | Alert fatigue | Hold-to-trigger + cancel window + optional PIN; cancellation audit trail |

## 9. Open Questions

1. **Primary market/region** — affects emergency-number integration (e.g., 112), default
   language, and SMS/cost assumptions.
2. **Is a backend required for v1 launch**, or is app-only (per the recommended first
   release) acceptable? Current plan assumes **app-only for v1**.
3. **User accounts for v1** — phone-OTP accounts (needs backend) vs. local-only profile?
   Plan assumes local-only, added in Phase 2.
4. **Target age group / child accounts** — parental-consent flows may add compliance work.
5. **Analytics/crash reporting** — opt-in only? Which vendor?
6. **Budget for WhatsApp Business API** and Play Console developer account availability.

---

## 10. Milestone Checklist (v1)

- [ ] M0 Foundation — scaffold, CI, navigation, permissions framework
- [ ] M1 Data layer & domain — Room schema, state machine + tests
- [ ] M2 SOS trigger + local alarm — offline event creation, alarm, cancel
- [ ] M3 Location capture — fresh fix, freshness metadata, live share
- [ ] M4 Trusted contacts + privacy — consent, revoke, settings
- [ ] M5 Delivery channels — WhatsApp hand-off, SMS, call, honest status UI
- [ ] M6 Event queue & history — WorkManager drain, retry, timeline UI
- [ ] M7 Hardening & release — security, policy forms, beta, production
