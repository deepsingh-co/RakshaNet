# RakshaNet — One-Page Solution Pitch

**Women & Child Safety and Development | Offline-first, voice-first safety platform**

**Great Indian AI Internship Challenge — Submission**

**Team:** Anurudh Singh & Team RakshaNet · **Repo:** https://github.com/deepsingh-co/RakshaNet

## The problem

When a woman or child is in danger, the response cannot depend on network bars, battery percentage, or a bystander noticing in time. Most safety apps are online-first, English-first, and stop at an SOS button. In India, emergencies are multilingual, code-mixed, noisy, and often happen on weak or no connectivity.

## The solution

RakshaNet turns a phone into a complete safety loop:

**Prevent → Detect → Dispatch → Preserve evidence → Recover**

- **Offline-first SOS:** hold-to-trigger SOS works without internet; alerts leave the device through whatever channel is available — WhatsApp hand-off, SMS, or call fallback.
- **Trusted contacts & guardians:** consent-based contacts, guardian/child links, live location, and per-contact delivery status.
- **Honest delivery:** every alert shows Queued → Prepared → Sent → Acknowledged; a WhatsApp hand-off is never reported as "sent".
- **Command center:** role-aware dashboard for guardians and admins with incidents, live map, escalation, audit log, and analytics.
- **Mobile app:** Expo/React Native with an offline SOS outbox that syncs when connectivity returns.

## The AI layer: Gnani.ai Prisma v3.0

Voice is the fastest way to ask for help when hands are shaking or a phone is hidden. We use **Gnani.ai Prisma v3.0 Speech-to-Text** for the voice layer.

**Why Prisma v3.0:**

- One model, 10 languages — 9 Indian languages + English.
- Built for code-mixed speech: "Hindi + English" is how India actually speaks under stress.
- Automatic language detection (`indic-auto`) and up to 4 language hints.
- Tuned for noisy 8 kHz telephony, regional accents, and weak recordings.
- Context hints (`keyterms`, `topic`, `speaker_names`) improve safety vocabulary without retraining.
- Gnani's published benchmark reports 36.3% lower word error rate than Deepgram Nova 3 and 17.5% lower than Azure STT.

**How it is wired:** the app sends a short audio clip to the Gnani STT API (`model=prisma-v3.0`); the transcript goes to a local, deterministic intent engine that checks for distress phrases. The model transcribes; the intent decision stays local, explainable, and auditable. A live Gnani STT request has been verified with synthetic audio.

## What is built

- **Web PWA:** React 19 + TypeScript + Vite, installable, offline-first (Dexie + service worker), 15/15 tests.
- **Backend:** Node/Express/MongoDB, JWT + RBAC, incidents, guardians, delivery tracking, Socket.IO, append-only audit.
- **Command Center:** role-aware operations dashboard with live map and analytics.
- **Mobile:** Expo/React Native, offline SOS/report outbox, contacts, guardians.
- **Advanced feature lab:** 15 demo-labelled modules exploring mesh SOS, stalker detection, deepfake defence, safety pods, legal aid, and more. Clearly marked as preview — not presented as production.

## Why it matters

RakshaNet is designed for the last mile: the phone with one bar, the user who speaks Hinglish, the moment when a generic English-first assistant fails. It combines offline-first engineering with a speech model built for real Indian audio, and keeps the AI's role narrow, transparent, and auditable.

**GitHub:** https://github.com/deepsingh-co/RakshaNet

**Run the demo:** `cd web && npm install && npm run dev` (web PWA); backend and mobile instructions are in the repo README.
