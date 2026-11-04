import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDb, disconnectDb } from '../db/connect.js';
import { User } from '../models/User.js';
import { TrustedContact } from '../models/TrustedContact.js';
import { GuardianLink } from '../models/GuardianLink.js';
import { Incident } from '../models/Incident.js';
import { Location } from '../models/Location.js';
import { Notification } from '../models/Notification.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../services/password.js';
import { env } from '../config/env.js';
import { signWebhookPayload } from '../routes/notificationWebhook.js';
import { escalateStaleIncidents } from '../services/escalation.js';

const app = createApp();
const DB = 'mongodb://127.0.0.1:27017/suraksha_ai_test';

async function register(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/v1/auth/register')
    .send({
      fullName: 'Module Three',
      email: `m3_${Math.random().toString(36).slice(2, 9)}@example.com`,
      phone: `+9198${Math.floor(10000000 + Math.random() * 89999999)}`,
      password: 'Str0ngPass1',
      preferredLanguage: 'en',
      accountType: 'INDIVIDUAL',
      ...overrides,
    });
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function addVerifiedContact(
  token: string,
  input: { name: string; phone: string; relationship?: string; prefs?: unknown },
) {
  const created = await request(app)
    .post('/api/v1/contacts')
    .set(auth(token))
    .send({
      name: input.name,
      phone: input.phone,
      relationship: input.relationship ?? 'FRIEND',
      ...(input.prefs ? { notificationPreferences: input.prefs } : {}),
    });
  const id = created.body.contact.id as string;

  const requested = await request(app)
    .post(`/api/v1/contacts/${id}/request-verification`)
    .set(auth(token));
  const confirmed = await request(app)
    .post(`/api/v1/contacts/${id}/confirm-verification`)
    .set(auth(token))
    .send({ code: requested.body.devCode });

  if (confirmed.status !== 200) {
    throw new Error(`contact verification failed: ${confirmed.status}`);
  }
  return id;
}

async function createIncident(token: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/v1/incidents')
    .set(auth(token))
    .send({
      clientIncidentId: `inc_${Math.random().toString(36).slice(2, 12)}`,
      type: 'SOS',
      startedAt: new Date().toISOString(),
      description: 'Test emergency',
      location: {
        lat: 12.9716,
        lng: 77.5946,
        accuracyMeters: 12,
        capturedAt: new Date().toISOString(),
        source: 'GPS',
      },
      ...overrides,
    });
}

async function createAdmin() {
  const email = `admin_${Math.random().toString(36).slice(2, 8)}@example.com`;
  await User.create({
    fullName: 'M3 Admin',
    email,
    phone: `+9197${Math.floor(10000000 + Math.random() * 89999999)}`,
    passwordHash: await hashPassword('AdminPass1'),
    role: 'ADMIN',
    accountType: 'INDIVIDUAL',
    status: 'ACTIVE',
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ identifier: email, password: 'AdminPass1' });
  return login.body.accessToken as string;
}

beforeAll(async () => {
  await connectDb(DB);
  await Promise.all([
    User.deleteMany({}),
    TrustedContact.deleteMany({}),
    GuardianLink.deleteMany({}),
    Incident.deleteMany({}),
    Location.deleteMany({}),
    Notification.deleteMany({}),
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({}),
    TrustedContact.deleteMany({}),
    GuardianLink.deleteMany({}),
    Incident.deleteMany({}),
    Location.deleteMany({}),
    Notification.deleteMany({}),
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  await disconnectDb();
});

describe('incidents', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/incidents');
    expect(res.status).toBe(401);
  });

  it('creates an SOS, alerts only verified contacts, and is idempotent', async () => {
    const user = await register({ fullName: 'Asha Verma' });
    const token = user.body.accessToken as string;
    await addVerifiedContact(token, {
      name: 'Maa',
      phone: '+919812300001',
      relationship: 'MOTHER',
    });
    // Unverified contact must never be alerted.
    await request(app)
      .post('/api/v1/contacts')
      .set(auth(token))
      .send({ name: 'Unverified', phone: '+919812300099' });

    const clientIncidentId = 'sos-idempotent-1';
    const res = await createIncident(token, { clientIncidentId });

    expect(res.status).toBe(201);
    expect(res.body.incident.status).toBe('NOTIFIED');
    expect(res.body.notifications.total).toBe(2); // SMS + WhatsApp for the verified contact
    expect(res.body.notifications.sent).toBe(2);
    expect(res.body.notifications.delivered).toBe(0); // SENT is not DELIVERED
    expect(res.body.notifications.simulated).toBe(2);
    expect(res.body.incident.location.lat).toBeCloseTo(12.9716);

    const stored = await Notification.findOne({ incidentId: res.body.incident.id });
    expect(stored?.status).toBe('SENT');
    expect(stored?.simulated).toBe(true);
    expect(stored?.deliveredAt).toBeNull();

    const retry = await createIncident(token, { clientIncidentId });
    expect(retry.status).toBe(200);
    expect(retry.body.deduplicated).toBe(true);
    expect(retry.body.incident.id).toBe(res.body.incident.id);
    expect(await Incident.countDocuments({ clientIncidentId })).toBe(1);
    expect(await Notification.countDocuments({ incidentId: res.body.incident.id })).toBe(2);
  });

  it('ends in DELIVERY_FAILED when there is nobody verified to alert', async () => {
    const user = await register();
    const token = user.body.accessToken as string;

    const res = await createIncident(token, { clientIncidentId: 'no-contacts-1' });
    expect(res.status).toBe(201);
    expect(res.body.incident.status).toBe('DELIVERY_FAILED');
    expect(res.body.notifications.total).toBe(0);
    expect(
      res.body.incident.statusHistory.some(
        (h: { note: string }) => h.note === 'no verified trusted contacts to alert',
      ),
    ).toBe(true);
  });

  it('accepts a signed delivery webhook but never assumes delivery', async () => {
    const user = await register();
    const token = user.body.accessToken as string;
    await addVerifiedContact(token, {
      name: 'Papa',
      phone: '+919812300002',
      prefs: { sms: true, whatsapp: false },
    });
    const created = await createIncident(token, { clientIncidentId: 'webhook-1' });
    const incidentId = created.body.incident.id as string;

    const detail = await request(app)
      .get(`/api/v1/incidents/${incidentId}/notifications`)
      .set(auth(token));
    const notification = detail.body.notifications[0];
    expect(notification.status).toBe('SENT');
    expect(notification.deliveredAt).toBeNull();

    const payload = JSON.stringify({
      providerMessageId: notification.providerMessageId,
      status: 'DELIVERED',
    });

    const invalid = await request(app)
      .post('/api/v1/notifications/webhook')
      .set('content-type', 'application/json')
      .set('x-suraksha-signature', 'sha256=deadbeef')
      .send(payload);
    expect(invalid.status).toBe(401);

    const valid = await request(app)
      .post('/api/v1/notifications/webhook')
      .set('content-type', 'application/json')
      .set('x-suraksha-signature', signWebhookPayload(payload))
      .send(payload);
    expect(valid.status).toBe(200);
    expect(valid.body.notification.status).toBe('DELIVERED');
    expect(valid.body.notification.deliveredAt).toBeTruthy();

    const summary = await request(app)
      .get(`/api/v1/incidents/${incidentId}/notifications`)
      .set(auth(token));
    expect(summary.body.summary.delivered).toBe(1);
    expect(summary.body.summary.sent).toBe(0);

    // Provider webhook retries are idempotent no-op successes.
    const repeat = await request(app)
      .post('/api/v1/notifications/webhook')
      .set('content-type', 'application/json')
      .set('x-suraksha-signature', signWebhookPayload(payload))
      .send(payload);
    expect(repeat.status).toBe(200);
    expect(repeat.body.deduplicated).toBe(true);
  });

  it('appends idempotent locations, flags stale points, and blocks strangers', async () => {
    const user = await register();
    const token = user.body.accessToken as string;
    const created = await createIncident(token, {
      clientIncidentId: 'locations-1',
      location: {
        lat: 12.9,
        lng: 77.5,
        accuracyMeters: 20,
        capturedAt: new Date(Date.now() - 10_000).toISOString(),
        source: 'GPS',
      },
    });
    const incidentId = created.body.incident.id as string;

    const appended = await request(app)
      .post(`/api/v1/incidents/${incidentId}/locations`)
      .set(auth(token))
      .send({
        clientLocationId: 'loc-2',
        lat: 12.91,
        lng: 77.51,
        accuracyMeters: 8,
        capturedAt: new Date().toISOString(),
        source: 'GPS',
      });
    expect(appended.status).toBe(201);
    expect(appended.body.deduplicated).toBe(false);
    expect(appended.body.incidentLocation.lat).toBeCloseTo(12.91);

    const duplicate = await request(app)
      .post(`/api/v1/incidents/${incidentId}/locations`)
      .set(auth(token))
      .send({
        clientLocationId: 'loc-2',
        lat: 12.91,
        lng: 77.51,
        capturedAt: new Date().toISOString(),
        source: 'GPS',
      });
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.deduplicated).toBe(true);

    const stale = await request(app)
      .post(`/api/v1/incidents/${incidentId}/locations`)
      .set(auth(token))
      .send({
        clientLocationId: 'loc-stale',
        lat: 12.0,
        lng: 77.0,
        capturedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        source: 'CACHED',
      });
    expect(stale.status).toBe(201);
    expect(stale.body.location.isStale).toBe(true);

    const detail = await request(app)
      .get(`/api/v1/incidents/${incidentId}`)
      .set(auth(token));
    expect(detail.status).toBe(200);
    // A stale point must not overwrite the freshest location snapshot.
    expect(detail.body.incident.location.lat).toBeCloseTo(12.91);
    expect(detail.body.locations).toHaveLength(3);

    const stranger = await register();
    const blocked = await request(app)
      .get(`/api/v1/incidents/${incidentId}`)
      .set(auth(stranger.body.accessToken));
    expect(blocked.status).toBe(404);
  });

  it('syncs offline incidents and locations exactly once', async () => {
    const user = await register();
    const token = user.body.accessToken as string;
    await addVerifiedContact(token, {
      name: 'Sync Contact',
      phone: '+919812300005',
    });
    const old = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const payload = {
      incidents: [
        {
          clientIncidentId: 'offline-a',
          type: 'SOS',
          startedAt: old,
          clientCreatedAt: old,
          offlineCreated: true,
          location: { lat: 19.07, lng: 72.87, capturedAt: old, source: 'GPS' },
        },
        {
          clientIncidentId: 'offline-b',
          type: 'FALL_DETECTED',
          startedAt: old,
          clientCreatedAt: old,
          offlineCreated: true,
          locations: [
            { clientLocationId: 'ob-1', lat: 19.08, lng: 72.88, capturedAt: old, source: 'GPS' },
            {
              clientLocationId: 'ob-2',
              lat: 19.09,
              lng: 72.89,
              capturedAt: old,
              source: 'GPS',
            },
          ],
        },
      ],
    };

    const first = await request(app)
      .post('/api/v1/incidents/sync')
      .set(auth(token))
      .send(payload);
    expect(first.status).toBe(207);
    expect(first.body.accepted).toBe(2);
    expect(first.body.duplicates).toBe(0);
    for (const result of first.body.results) {
      expect(result.ok).toBe(true);
      expect(result.status).toBe('NOTIFIED');
      expect(result.offlineDelaySeconds).toBeGreaterThanOrEqual(290);
    }

    const incidents = await request(app).get('/api/v1/incidents').set(auth(token));
    expect(incidents.body.incidents).toHaveLength(2);
    const synced = incidents.body.incidents.find(
      (i: { clientIncidentId: string }) => i.clientIncidentId === 'offline-a',
    );
    expect(synced.offlineCreated).toBe(true);
    expect(synced.syncedFromOffline).toBe(true);
    const statuses = synced.statusHistory.map((h: { status: string }) => h.status);
    expect(statuses).toContain('PENDING_SYNC');
    expect(statuses).toContain('ALERTING');

    const retry = await request(app)
      .post('/api/v1/incidents/sync')
      .set(auth(token))
      .send(payload);
    expect(retry.status).toBe(207);
    expect(retry.body.accepted).toBe(0);
    expect(retry.body.duplicates).toBe(2);
    expect(await Incident.countDocuments({ userId: user.body.user.id })).toBe(2);
    expect(
      await Location.countDocuments({ clientLocationId: { $in: ['ob-1', 'ob-2'] } }),
    ).toBe(2);
  });

  it('lets a linked guardian follow and acknowledge a child incident', async () => {
    const guardian = await register({
      fullName: 'Guardian M3',
      accountType: 'GUARDIAN',
    });
    const child = await register({ fullName: 'Child M3' });
    const guardianToken = guardian.body.accessToken as string;
    const childToken = child.body.accessToken as string;

    const invite = await request(app)
      .post('/api/v1/guardian/links')
      .set(auth(guardianToken))
      .send({ childEmail: child.body.user.email });
    const links = await request(app).get('/api/v1/guardian/links').set(auth(childToken));
    const linkId = links.body.asChild[0].id as string;
    await request(app)
      .post(`/api/v1/guardian/links/${linkId}/accept`)
      .set(auth(childToken))
      .send({ code: invite.body.devCode });

    await addVerifiedContact(childToken, {
      name: 'Friend',
      phone: '+919812300003',
      prefs: { sms: true, whatsapp: false },
    });
    const created = await createIncident(childToken, { clientIncidentId: 'guardian-1' });
    const incidentId = created.body.incident.id as string;

    const childList = await request(app)
      .get(`/api/v1/incidents?ownerId=${child.body.user.id}`)
      .set(auth(guardianToken));
    expect(childList.status).toBe(200);
    expect(childList.body.incidents).toHaveLength(1);

    const ack = await request(app)
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set(auth(guardianToken))
      .send({ status: 'ACKNOWLEDGED', note: 'On my way' });
    expect(ack.status).toBe(200);
    expect(ack.body.incident.status).toBe('ACKNOWLEDGED');
    expect(ack.body.incident.acknowledgedBy).toBe(guardian.body.user.id);

    const ownerCannotRespond = await request(app)
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set(auth(childToken))
      .send({ status: 'RESPONDING' });
    expect(ownerCannotRespond.status).toBe(403);

    const guardianCannotCancel = await request(app)
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set(auth(guardianToken))
      .send({ status: 'CANCELLED' });
    expect(guardianCannotCancel.status).toBe(403);

    const resolved = await request(app)
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set(auth(childToken))
      .send({ status: 'RESOLVED', note: 'Safe now' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.incident.status).toBe('RESOLVED');
    expect(resolved.body.incident.resolvedAt).toBeTruthy();

    const afterResolve = await request(app)
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set(auth(childToken))
      .send({ status: 'RESOLVED' });
    expect(afterResolve.status).toBe(409);

    const stranger = await register();
    const blocked = await request(app)
      .get(`/api/v1/incidents?ownerId=${child.body.user.id}`)
      .set(auth(stranger.body.accessToken));
    expect(blocked.status).toBe(403);
  });

  it('escalates alerts nobody acknowledged and re-alerts the primary contact', async () => {
    const user = await register();
    const token = user.body.accessToken as string;
    await addVerifiedContact(token, {
      name: 'Primary',
      phone: '+919812300004',
      relationship: 'SPOUSE',
    });
    const created = await createIncident(token, { clientIncidentId: 'escalation-1' });
    const incidentId = created.body.incident.id as string;
    expect(created.body.incident.status).toBe('NOTIFIED');

    const future = new Date(
      Date.now() + (env.ESCALATION_AFTER_SECONDS + 10) * 1000,
    );
    await escalateStaleIncidents(future);

    const escalated = await Incident.findById(incidentId);
    expect(escalated?.status).toBe('ESCALATED');
    expect(escalated?.escalationLevel).toBe(1);
    expect(
      escalated?.statusHistory.some(
        (h) => h.status === 'ESCALATED' && h.byRole === 'SYSTEM',
      ),
    ).toBe(true);

    const notifications = await Notification.find({ incidentId });
    expect(notifications.length).toBe(4); // 2 initial + 2 escalation re-alerts
    expect(
      notifications.some((n) => n.idempotencyKey.includes('escalation-1')),
    ).toBe(true);

    // The same round cannot escalate twice.
    await escalateStaleIncidents(future);
    const reloaded = await Incident.findById(incidentId);
    expect(reloaded?.escalationLevel).toBe(1);
  });

  it('shows all incidents to admins and denies cross-user access to others', async () => {
    const adminToken = await createAdmin();

    const all = await request(app).get('/api/v1/incidents?limit=100').set(auth(adminToken));
    expect(all.status).toBe(200);
    expect(all.body.pagination.total).toBeGreaterThan(0);

    const other = await register();
    const otherId = other.body.user.id as string;
    const forbidden = await request(app)
      .get(`/api/v1/incidents?ownerId=${otherId}`)
      .set(auth(adminToken));
    // Admin is allowed cross-user.
    expect(forbidden.status).toBe(200);

    const normal = await register();
    const normalDenied = await request(app)
      .get(`/api/v1/incidents?ownerId=${otherId}`)
      .set(auth(normal.body.accessToken));
    expect(normalDenied.status).toBe(403);
  });
});
