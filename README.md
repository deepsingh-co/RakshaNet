# RakshaNet

**Women & Child Safety and Development | Offline-First Safety Platform**

RakshaNet is a mobile safety platform that helps women and children request emergency
assistance, share their location with trusted contacts, and access essential safety features
**even when internet connectivity is unavailable**.

Its core innovation is an offline-first SOS system combined with WhatsApp connectivity,
SMS/call fallback, GPS location tracking, and smartwatch integration. Essential emergency
actions happen locally on the device; alerts go out through whatever communication channel is
available.

---

## Features

### v1 — First Production Release
- **Offline SOS** — trigger an emergency alert with no internet; the event is recorded
  locally in under a second and retried when connectivity returns.
- **Local alarm** — full-screen siren and vibration to deter an attacker and draw attention.
- **GPS location capture** — fresh coordinates when available, last-known location as
  fallback, with accuracy and freshness always recorded (and never blocking the SOS).
- **Trusted contacts** — add, prioritize, and revoke contacts; sharing is per-event or
  time-boxed, never silent or permanent.
- **WhatsApp alerts** — pre-formatted emergency message (type, time, location, freshness)
  handed off to WhatsApp for sending.
- **SMS & call fallback** — when there's no internet but cellular service works, alerts go
  out by SMS with delivery confirmation; one-tap calling as last resort.
- **Event queue** — undelivered alerts are queued with exponential backoff and drained by
  WorkManager as channels become available. No duplicates, no lost events.
- **Honest delivery status** — every alert shows `queued → handed off → sent → failed →
  acknowledged` per contact *per channel*. Opening WhatsApp is never reported as "delivered".
- **Privacy controls** — consent states, instant revocation, sharing defaults, audit trail,
  and app lock.

### Later Phases
- **Journey safety** — set a destination and ETA; get check-in reminders, with escalation to
  guardians if you miss your arrival.
- **Backend sync & acknowledgments** — Node.js/Express + MongoDB for multi-device sync,
  push notifications, and confirmed recipient acknowledgments.
- **Wear OS** — trigger an SOS from a compatible smartwatch without touching the phone.
- **WhatsApp Business Cloud API** — fully automated delivery (with consent) where the official
  integration permits it.
- **Nearby-device relay** — BLE/mesh broadcast of SOS to nearby RakshaNet devices.

---

## How the WhatsApp flow works

```
1. User activates SOS            (app or supported wearable)
2. App prepares the alert        (type • time • location • freshness • help request)
3. Channel check
   ├─ Internet available   → open WhatsApp composer → status: HANDED_OFF
   ├─ No internet          → save locally, offer SMS/call if cellular works
   └─ Neither              → event stays QUEUED until a channel is available
4. Delivery status tracked per contact, per channel — queued / handed off / sent /
   failed / acknowledged
```

**Honesty rules (enforced in code):**
- Ordinary WhatsApp sharing requires the user to complete the send — the app reports
  `handed off`, not `sent`.
- Automated messaging requires an approved integration and explicit consent.
- WhatsApp cannot deliver without internet, and the app never claims delivery just because
  it opened WhatsApp.

---

## Tech Stack

| Component | Technology |
|---|---|
| Android app | Kotlin, Jetpack Compose, Material 3 |
| Offline storage | Room (SQLite), DataStore |
| Location | FusedLocationProvider + Android Location APIs |
| Background work | WorkManager |
| WhatsApp | Sharing intents (v1); Business Cloud API (later) |
| SMS & calls | `SmsManager`, calling intents |
| Wearable | Wear OS APIs, Bluetooth LE (later) |
| Backend | Node.js, Express, MongoDB |
| Security | Android Keystore, HTTPS/TLS, JWT auth, RBAC |
| Build & CI | Gradle KTS, Version Catalog, GitHub Actions |

**Minimum SDK:** 24 (Android 7.0) · **Target SDK:** 35

---

## Project Status

🚧 In development. See **[PLAN.md](PLAN.md)** for the full roadmap, architecture, milestone
checklists, and risk register.

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation (scaffold, CI, design system, permissions) | Not started |
| 1 | **v1 production release** (offline SMS, GPS, contacts, WhatsApp/SMS, queue, privacy) | Not started |
| 2 | Backend, acknowledgments, journey safety | Not started |
| 3 | Wear OS companion | Not started |
| 4 | WhatsApp Business API, nearby relay, multi-language | Not started |

---

## Getting Started

### Prerequisites
- Android Studio (Ladybug or newer)
- JDK 17+
- A physical Android device for testing (emulators lack SMS/telephony behavior)

### Build & run
```bash
git clone <repo-url>
cd RakshaNet
# Open the android/ directory in Android Studio, or:
cd android
./gradlew :app:assembleDebug
./gradlew test          # unit tests
./gradlew lint          # static analysis
```

### Backend (Phase 2+)
```bash
cd backend
npm install
npm run dev             # http://localhost:3000
```

---

## Privacy & Safety

- Location is shared only with contacts you explicitly choose, for as long as you grant it.
- Revoking a contact takes effect immediately — no further alerts or location go to them.
- Sensitive data stays encrypted on-device; nothing is shared without your action.
- Delivery status is always truthful: the app distinguishes preparing an alert from actually
  sending it.

---

## Documentation

- **[PLAN.md](PLAN.md)** — architecture, roadmap, milestones, risks, open questions
- `docs/` — API specification, architecture decision records (coming soon)

---

## License

TBA — choose a license before publishing.
