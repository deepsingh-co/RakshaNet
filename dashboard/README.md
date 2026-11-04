# SURAKSHA AI — Web Command Center

Role-aware safety operations dashboard for the SURAKSHA AI platform. It reads
real data from the backend only: there are no seeded dashboard fixtures, no
placeholder incidents, and no invented delivery numbers.

Stack: Vite + React 18 + TypeScript + React Router 6 + Socket.IO client +
Leaflet 1.9 (raw, no wrapper) + inline SVG charts. No UI kit, no chart library,
no fake data layer.

## Run

The backend must be running first (default `http://localhost:4000`).

```bash
cd dashboard
cp .env.example .env
npm install
npm run dev        # http://localhost:5174
```

```bash
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build on port 5174
```

### Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000/api/v1` | Backend API base URL used by the browser |

`credentials: 'include'` is required for the refresh cookie, so the backend
`CORS_ORIGINS` must include the dashboard origin (for local development:
`http://localhost:5174`).

## Access model

- An account is provisioned by registering through the mobile/API flow. There
  is no admin self-registration.
- Administrators are provisioned on the backend:
  ```bash
  cd backend
  npm run seed:admin -- --email ops@example.com --password "<strong-password>" --phone "+919800000001" --name "Control Room"
  ```
- Sign in with **email or phone** plus password. The access token is kept in
  memory only; the refresh token is an `httpOnly`, `SameSite` cookie rotated on
  every use. A hard reload restores the session through `/auth/refresh`.
- Signing out revokes the current refresh token and clears the cookie in this
  browser. "Sign out of all devices" revokes every session family.

### Role permissions in the UI

| Surface | USER | GUARDIAN | ADMIN |
|---|---|---|---|
| Overview / live incidents / map / history | own records | own + **VERIFIED** children | all records |
| Users & Roles | Access denied | Access denied | full admin |
| Guardians & Children | own links only | own links + create verified child account | all links overview |
| Trusted Contacts | own contacts | own contacts | own contacts (contacts are private to their owner) |
| Notifications | own deliveries | own + verified children | all deliveries |
| Analytics & Reports | own scope | own + verified children | all accounts + admin aggregates |
| Audit Logs | Access denied | Access denied | append-only audit reader |
| Settings | own profile/session | own profile/session | own profile/session |

Guardians never inherit administrator permissions, and a role is never elevated
implicitly. Admin-only pages show an explicit "Administrator access required"
state instead of a blank screen; the API also enforces the same rules.

## The 11 modules

| Module | Route | What it shows |
|---|---|---|
| Overview | `/` | Scope-aware KPIs, incident trend, status mix, priority queue |
| Live Incidents | `/incidents` | Active queue, status/type filters, live socket updates, incident drawer |
| Live Map | `/map` | Last-known device positions, accuracy radius, incidents without GPS listed separately |
| Incident History | `/history` | Paginated historical records, date/status/offline filters, CSV export |
| Users & Roles | `/users` | Account list, explicit roles, suspend/reactivate (ADMIN) |
| Guardians & Children | `/guardians` | Consent-based links, invite by email, verified child account creation |
| Trusted Contacts | `/contacts` | Owner-private contacts, verification OTP flow, primary contact, channel prefs |
| Notifications | `/notifications` | Per-recipient delivery truth across SMS/WhatsApp/push, masked destinations |
| Analytics & Reports | `/analytics` | Role-scoped metrics, delivery truth, report range, CSV export |
| Audit Logs | `/audit` | Append-only security/operational history with filters and pagination |
| Settings | `/settings` | Profile, phone/email verification, language, session revocation, honesty legend |

## Data honesty rules

These are product rules, not decorations:

- **No generated data.** Every number comes from the backend. Empty states say
  so explicitly.
- **`SENT` means the provider accepted the message**, not that a phone received
  it. **`DELIVERED`** requires a provider webhook with a valid HMAC signature and
  cannot be set from the dashboard.
- **Simulated rows are labelled.** With `NOTIFICATION_MODE=console`, sends are
  recorded with `simulated: true`; the UI shows "console-mode simulations" and
  never counts them as real-world delivery.
- **`DELIVERY_FAILED` is surfaced honestly.** Nobody verified could be reached,
  so the system says that instead of implying help is coming.
- **Offline is recorded, not hidden.** Offline-created incidents keep the device
  timestamp and expose `offlineDelaySeconds`; the UI marks them `Offline` and
  shows the delay. `PENDING_SYNC` means the server has not accepted the record
  yet.
- **No stale trust.** Contacts must be `VERIFIED` before they are alerted;
  guardian links must be `VERIFIED` before a guardian can read a child's data.
- **Account deletion is a request**, not an instant hard delete: the account is
  suspended, sessions are revoked, and an audit trail remains.

## Realtime

The dashboard opens one authenticated Socket.IO connection with the in-memory
access token. Live events (`incident:created`, `incident:status_changed`,
`incident:updated`, `incident:location_updated`, `incident:note_added`,
`notification:updated`, `notification:delivered`, etc.) bump a revision counter
that refreshes the open views. A 20s (or page-specific) polling fallback keeps
views correct if the socket is disconnected; the connection chip shows the
truth in both states.

## Incident actions

The incident drawer supports the backend's real lifecycle: acknowledge, mark
responding, escalate, resolve, cancel, and add responder notes. Every action is
validated by the backend state machine (closed incidents reject new notes) and
is written to the incident timeline and the audit log. Delivery truth per
recipient is shown alongside the timeline.

## CSV export

Incident History and Analytics export role-scoped CSVs from
`GET /analytics/incidents.csv`. The backend caps exports at 5,000 rows, returns
row/truncation metadata through `X-Export-*` headers (CORS-exposed), and writes
an `ANALYTICS_EXPORTED` audit record. A guardian's export contains only their
own and verified children's incidents.

## Verification performed

- TypeScript clean, production build succeeds.
- Admin flow: login, hard-reload session restore, all 11 routes, real KPIs,
  live socket update, incident status change + note, CSV download with expected
  rows, settings save, logout and refresh-cookie revocation.
- Guardian flow: `/users` and `/audit` show access denied; `/guardians` shows the
  verified child; `/contacts` shows owner-private contacts; history includes the
  child's resolved incident; notifications and analytics are scoped to the
  guardian network.
- Backend regression suite: 50/50 tests passing, including guardian incident
  list scoping and CORS export-header exposure.

## Known limitations

- Notification providers are not configured in development, so the delivery
  feed honestly shows console-mode simulations (0 delivered).
- The dashboard currently has typecheck/build verification and browser-level
  runtime checks; there is no automated component/E2E test suite yet.
- Admin accounts are provisioned via the backend seed command, by design.
