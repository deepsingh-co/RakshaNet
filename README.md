# RakshaNet

**Women & Child Safety and Development | Offline-First Safety Platform**

**Owner:** Anurudh Singh

RakshaNet is a mobile safety platform that helps women and children request emergency
assistance, share their location with trusted contacts, and access essential safety features
**even when internet connectivity is unavailable**.

Its core innovation is an offline-first SOS system combined with WhatsApp connectivity,
SMS/call fallback, GPS location tracking, and smartwatch integration. Essential emergency
actions happen locally on the device; alerts go out through whatever communication channel is
available.

---

## Live now — Web PWA

The first release is a **fully working web PWA** (React + Vite + TypeScript), installable on
any phone and usable completely offline.

**Flow:** Landing page → Sign up / Log in → Safety app

| Screen | What it does |
|---|---|
| **Landing** (`/`) | Explains the project, honest about WhatsApp limitations |
| **Sign up / Log in** (`/#/signup`, `/#/login`) | Device-local accounts (no backend yet) |
| **SOS** (`/#/`) | Big hold-to-trigger button, protection status, plain-language steps |
| **Contacts** | Add trusted contacts, per-channel choice, consent + revoke |
| **History** | Every event with per-contact, per-channel delivery status |
| **Settings** | Profile, data stats, account/logout, delete-all |

### Built & verified
- **Design:** calm light theme; green = safe, red = SOS only, amber = needs your action
- **Honest delivery:** `Queued → Prepared → Sent → Acknowledged`. WhatsApp hand-off is
  **never** reported as "Sent" — the user must press send.
- **Offline-first:** Dexie (IndexedDB), service worker precache, installable PWA
- **15/15 unit tests**, clean TypeScript, production build green

### Run it
```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # production build + service worker
npx vitest run   # unit tests
```

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

### Web PWA (built)
| Layer | Technology |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Build | Vite, vite-plugin-pwa (Workbox) |
| State | Zustand |
| Offline storage | Dexie (IndexedDB) |
| Routing | React Router (HashRouter) |
| Tests | Vitest |

### Planned — Android & Backend
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

**Minimum SDK (Android):** 24 (Android 7.0) · **Target SDK:** 35

---

## Project Status

🚧 In development. See **[PLAN.md](PLAN.md)** for the full roadmap, architecture, milestone
checklists, and risk register.

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation (scaffold, CI, design system, permissions) | ✅ Done (Web) |
| 1 | **Web PWA v1** (offline SOS, GPS, contacts, WhatsApp/SMS, queue, privacy, auth, landing) | ✅ Shipped |
| 2 | Backend, acknowledgments, journey safety | Not started |
| 3 | Wear OS companion | Not started |
| 4 | WhatsApp Business API, backend auth, Android app, nearby relay, multi-language | Not started |

---

## Getting Started

### Web PWA (works today)
```bash
git clone https://github.com/deepsingh-co/RakshaNet.git
cd RakshaNet/web
npm install
npm run dev             # http://localhost:5173
```

### Android (Phase 4+)
- Android Studio (Ladybug or newer), JDK 17+, physical device for SMS/telephony testing.

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
- **Accounts are device-local for now** (no backend yet). Passwords are stored hashed; your
  data never leaves your device until a synced backend ships.

---

## Documentation

- **[PLAN.md](PLAN.md)** — architecture, roadmap, milestones, risks, open questions
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — architecture diagrams

---

## License

TBA — choose a license before publishing.
