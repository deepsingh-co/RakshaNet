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

## Endpoints (Module 1)

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

## Security notes

- Passwords hashed with bcrypt (cost 12); hashes never leave the server.
- Login is rate-limited; unknown-account checks take comparable time (anti-enumeration).
- Every auth event is written to the append-only `auditlogs` collection.
- OTP/reset tokens are stored hashed with expiry. In `OTP_MODE=console` (dev only) the
  code/token is printed server-side for testing — never returned by the API.

## Tests

```bash
npm test        # 11 auth + health tests against MongoDB (suraksha_ai_test)
npm run typecheck
```
