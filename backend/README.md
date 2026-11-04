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

## Tests

```bash
npm test        # 27 tests (11 auth/health + 16 contacts/users/guardian)
npm run typecheck
```

Tests run against a real MongoDB at `mongodb://127.0.0.1:27017/suraksha_ai_test`.
