# SURAKSHA AI — Backend

Node.js + Express + MongoDB + TypeScript backend for the mobile app and web command center.

## Run

```bash
cd backend
cp .env.example .env      # fill in secrets
npm install
npm run dev               # http://localhost:4000
```

Health: `GET http://localhost:4000/api/v1/health`

## Auth model

- **Access token** — short-lived JWT (`ACCESS_TOKEN_TTL`, default 15m), sent as
  `Authorization: Bearer <token>`.
- **Refresh token** — long-lived JWT stored **hashed** in MongoDB, rotated on every use,
  revokeable, with reuse detection (reuse revokes the whole token family).
- Refresh token is delivered as an `httpOnly` cookie for browsers and in the JSON body
  for React Native (`{ refreshToken }` accepted on `/refresh`).

Roles: `USER`, `GUARDIAN`, `ADMIN`. Roles are explicit — a guardian never inherits
administrator permissions.

## Endpoints (Module 1 — auth)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | — | Service health |
| POST | `/api/v1/auth/register` | — | Create account |
| POST | `/api/v1/auth/login` | — | Login (email or phone) |
| POST | `/api/v1/auth/refresh` | refresh token | Rotate session |
| POST | `/api/v1/auth/logout` | refresh token | Revoke current session |
| POST | `/api/v1/auth/logout-all` | access token | Revoke all sessions |
| GET | `/api/v1/auth/me` | access token | Current user |
| POST | `/api/v1/auth/verify-otp` | access token | Verify phone OTP |
| POST | `/api/v1/auth/forgot-password` | — | Request reset token |
| POST | `/api/v1/auth/reset-password` | — | Set new password |
| DELETE | `/api/v1/auth/account` | access token | Request account deletion |

## Endpoints (Module 2 — contacts, users, guardian)

### Trusted contacts (owner-only)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/contacts` | List own contacts (primary first, phones masked) |
| POST | `/api/v1/contacts` | Add contact (max 20; first is primary) |
| GET | `/api/v1/contacts/:id` | Read own contact |
| PATCH | `/api/v1/contacts/:id` | Update details (phone change resets verification) |
| DELETE | `/api/v1/contacts/:id` | Delete; promotes next verified contact |
| POST | `/api/v1/contacts/:id/request-verification` | Send verification code |
| POST | `/api/v1/contacts/:id/confirm-verification` | Confirm with 6-digit code |
| POST | `/api/v1/contacts/:id/primary` | Set primary (VERIFIED contacts only) |

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| PATCH | `/api/v1/users/me` | user | Update name, language, phone/email |
| GET | `/api/v1/users` | ADMIN | Search/paginate users |
| GET | `/api/v1/users/:id` | self or ADMIN | Read profile |
| PATCH | `/api/v1/users/:id/status` | ADMIN | Suspend/reactivate (revokes sessions) |

### Guardian ↔ child

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/guardian/links` | GUARDIAN | Invite a child by email (consent code) |
| POST | `/api/v1/guardian/links/:id/accept` | invited child | Accept with consent code |
| GET | `/api/v1/guardian/links` | user | Own links (as guardian and as child) |
| DELETE | `/api/v1/guardian/links/:id` | either party / ADMIN | Revoke link |
| POST | `/api/v1/guardian/children` | GUARDIAN | Create a verified child account |
| GET | `/api/v1/guardian/links/all` | ADMIN | All links overview |

Guardian links are consent-based: nothing becomes `VERIFIED` until the child accepts
with the 6-digit consent code (24h expiry, hashed at rest). Either party can revoke.

## Endpoints (Module 3 — incidents, offline sync, notifications)

### Incidents

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/incidents` | user | Create an incident (idempotent by `clientIncidentId`) |
| POST | `/api/v1/incidents/sync` | user | Batch-upload offline incidents + queued locations |
| GET | `/api/v1/incidents` | user / guardian / ADMIN | List own, linked child's, or all incidents |
| GET | `/api/v1/incidents/:id` | owner / guardian / ADMIN | Detail + latest locations + delivery truth |
| PATCH | `/api/v1/incidents/:id/status` | role-scoped | Acknowledge / respond / escalate / resolve / cancel |
| POST | `/api/v1/incidents/:id/notes` | owner / guardian / ADMIN | Responder note |
| GET | `/api/v1/incidents/:id/notifications` | owner / guardian / ADMIN | Per-recipient delivery status |
| POST | `/api/v1/incidents/:id/locations` | owner only | Append a location ping |
| POST | `/api/v1/incidents/:id/locations/batch` | owner only | Flush offline location pings |
| GET | `/api/v1/incidents/:id/locations` | owner / guardian / ADMIN | Paginated location timeline |

### Lifecycle

```
CREATED -> PENDING_SYNC -> ALERTING -> NOTIFIED / DELIVERY_FAILED
              |                |
              +-> CANCELLED    +-> ACKNOWLEDGED -> RESPONDING -> RESOLVED
                               +-> ESCALATED -> ACKNOWLEDGED / RESPONDING / RESOLVED
```

- `PENDING_SYNC` is recorded only for incidents that were created on a device without
  network. The server promotes the record to `ALERTING` when it actually starts alerting,
  and keeps the offline gap in `statusHistory` + `offlineDelaySeconds`.
- `DELIVERY_FAILED` is returned when no verified contact could be reached (or no verified
  contacts exist). It is never silently reported as "help is coming".
- Only the owner or an administrator can cancel; only a guardian/admin can mark
  `RESPONDING` or `ESCALATED`.
- Terminal states (`RESOLVED`, `CANCELLED`) reject further transitions.

### Delivery semantics

- Every notification row is per recipient, per channel (`SMS`, `WHATSAPP`, `PUSH`).
- `SENT` = the provider accepted the message. `DELIVERED` is set **only** by a
  signature-verified provider webhook — never assumed.
- `POST /api/v1/notifications/webhook` requires `x-suraksha-signature:
  sha256=<HMAC-SHA256(raw body, NOTIFICATION_WEBHOOK_SECRET)>`.
- In `NOTIFICATION_MODE=console` (default outside production) sends are explicitly
  labelled `simulated: true`. In `live` mode an unconfigured gateway fails as
  `PROVIDER_NOT_CONFIGURED` instead of pretending to send.
- Gateway contract: POST `{ channel, to, message, from?, incidentId }` with optional
  `Authorization: Bearer <API_KEY>`; respond `{ id | messageId | sid }`.
- The server escalates unacknowledged `ALERTING`/`NOTIFIED` incidents every
  `ESCALATION_AFTER_SECONDS`, up to level 3, re-alerting the primary contact with a
  separate idempotency phase.
- Location points older than `LOCATION_STALE_AFTER_SECONDS` are stored with
  `isStale: true` and never replace a fresher incident snapshot.

## Realtime (Module 4 — Socket.IO)

Socket.IO runs on the same origin/path (`/socket.io`). Every connection must present a
valid **access token** — no anonymous sockets.

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: accessToken },          // or Authorization: Bearer <token>
  transports: ['websocket'],
});

socket.on('session:ready', ({ userId, role, rooms }) => { /* joined user room */ });

await socket.emitWithAck('incident:subscribe', { incidentId });
await socket.emitWithAck('incident:unsubscribe', { incidentId });
const pong = await socket.emitWithAck('ping:client');
```

- Every socket joins `user:<id>`. Admins additionally join `admins`.
- `incident:<id>` is joined only through `incident:subscribe`, which is verified
  server-side: the owner, an admin, or a guardian with a `VERIFIED` link may subscribe.
  Strangers receive `{ ok: false, error: 'FORBIDDEN' }`; max 20 subscriptions per socket.
- Rooms are left automatically on disconnect; no client-supplied room names are trusted.
- A socket is force-disconnected when its access token expires, so a connection never
  outlives the credential that opened it.

### Server events

| Event | Audience | Payload |
|---|---|---|
| `session:ready` | socket | `{ userId, role, rooms }` |
| `incident:created` | owner + admins | public incident |
| `incident:status_changed` | owner + incident room + admins | public incident |
| `incident:location_updated` | owner + incident room + admins | `{ incidentId, location }` |
| `incident:acknowledged` | owner + incident room | public incident |
| `incident:resolved` | owner + incident room | public incident |
| `incident:cancelled` | owner + incident room | public incident |
| `incident:note_added` | owner + incident room + admins | public incident |
| `notification:updated` | owner + incident room | public notification |
| `notification:delivered` | owner + incident room + admins | public notification |

Client → server events are limited to `incident:subscribe`, `incident:unsubscribe`, and
`ping:client`.

## Audit log API (admin only, read-only)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/audit` | Paginated logs; filters `action`, `actorId`, `actorRole`, `resourceType`, `resourceId`, `outcome`, `from`, `to`, `page`, `limit` |
| GET | `/api/v1/audit/actions` | All valid action names (for dashboard filters) |
| GET | `/api/v1/audit/:id` | Single immutable record |

There is intentionally no create/update/delete route. Audit rows are written only by the
trusted audit service, and every admin read of the audit log is itself audited.

## Security notes

- Passwords hashed with bcrypt (cost 12); hashes never leave the server.
- Login is rate-limited; unknown-account checks take comparable time (anti-enumeration).
- Every auth event is written to the append-only `auditlogs` collection.
- OTP/reset/consent codes are stored hashed with expiry. In `OTP_MODE=console` (dev only)
  the code is printed server-side and echoed as `devCode` in the response for testing.
  In production it is only sent through the configured SMS/WhatsApp provider.
- Contacts are strictly owner-scoped: admins have no write path into private contacts.
- Guardian never inherits admin rights; admin APIs require an explicit `ADMIN` role.
- Admin actions on users are audited; suspending a user revokes all refresh tokens.
- Incident access is owner / verified-guardian / admin only. Strangers get `404`, not
  `403`, so incident existence is not leaked.
- Location reads and writes are audited (`LOCATION_ACCESSED`, `LOCATION_UPDATED`).
- Duplicate offline retries are safe: unique indexes on
  `(userId, clientIncidentId)`, `(incidentId, clientLocationId)`, and
  notification `idempotencyKey`.

## Tests

```bash
npm test        # 45 tests (11 auth/health + 16 contacts/users/guardian + 9 incidents
                #           + 6 Socket.IO + 3 audit API)
npm run typecheck
```

Tests run against a real MongoDB at `mongodb://127.0.0.1:27017/suraksha_ai_test`.
