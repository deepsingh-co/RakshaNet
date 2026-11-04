import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDb, disconnectDb } from '../db/connect.js';
import { User } from '../models/User.js';
import { Incident } from '../models/Incident.js';
import { Notification } from '../models/Notification.js';
import { GuardianLink } from '../models/GuardianLink.js';
import { TrustedContact } from '../models/TrustedContact.js';
import { Location } from '../models/Location.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../services/password.js';
import { signAccessToken } from '../services/tokens.js';

const app = createApp();
const DB = 'mongodb://127.0.0.1:27017/suraksha_ai_test';

async function createUser(
  role: 'USER' | 'GUARDIAN' | 'ADMIN' = 'USER',
  accountType: 'INDIVIDUAL' | 'GUARDIAN' | 'CHILD' = 'INDIVIDUAL',
) {
  const suffix = Math.random().toString(36).slice(2, 9);
  const user = await User.create({
    fullName: `Dashboard ${suffix}`,
    email: `dash_${suffix}@example.com`,
    phone: `+9191${Math.floor(10000000 + Math.random() * 89999999)}`,
    passwordHash: await hashPassword('Dashboard1'),
    role,
    accountType,
    status: 'ACTIVE',
  });
  const token = signAccessToken({ sub: user._id.toString(), role, accountType });
  return { user, token };
}

async function createIncident(
  userId: string,
  overrides: Record<string, unknown> = {},
) {
  return Incident.create({
    userId,
    clientIncidentId: `dash_${Math.random().toString(36).slice(2, 10)}`,
    type: 'SOS',
    severity: 'CRITICAL',
    status: 'ALERTING',
    startedAt: new Date(),
    clientCreatedAt: new Date(),
    receivedAt: new Date(),
    location: { lat: 12.97, lng: 77.59, accuracyMeters: 10, capturedAt: new Date(), source: 'GPS' },
    ...overrides,
  });
}

async function createNotification(
  incidentId: string,
  userId: string,
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'QUEUED',
  simulated = false,
) {
  return Notification.create({
    incidentId,
    userId,
    channel: 'SMS',
    destinationMasked: '+9198****1234',
    status,
    provider: simulated ? 'console' : 'test-provider',
    providerMessageId: `msg_${Math.random().toString(36).slice(2, 10)}`,
    simulated,
    idempotencyKey: `dash:${incidentId}:${Math.random().toString(36).slice(2, 10)}`,
    queuedAt: new Date(),
    sentAt: status === 'SENT' || status === 'DELIVERED' ? new Date() : null,
    deliveredAt: status === 'DELIVERED' ? new Date() : null,
    failedAt: status === 'FAILED' ? new Date() : null,
  });
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await connectDb(DB);
  await Promise.all([
    User.deleteMany({}),
    Incident.deleteMany({}),
    Notification.deleteMany({}),
    GuardianLink.deleteMany({}),
    TrustedContact.deleteMany({}),
    Location.deleteMany({}),
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({}),
    Incident.deleteMany({}),
    Notification.deleteMany({}),
    GuardianLink.deleteMany({}),
    TrustedContact.deleteMany({}),
    Location.deleteMany({}),
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  await disconnectDb();
});

describe('dashboard analytics and notification APIs', () => {
  it('scopes analytics to the viewer and shows admin-wide totals', async () => {
    const userA = await createUser();
    const userB = await createUser();
    const admin = await createUser('ADMIN');

    await createIncident(userA.user._id.toString(), {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    });
    await createIncident(userB.user._id.toString(), { status: 'ALERTING' });

    const a = await request(app).get('/api/v1/analytics/summary').set(auth(userA.token));
    expect(a.status).toBe(200);
    expect(a.body.incidents.total).toBe(1);
    expect(a.body.incidents.byStatus.RESOLVED).toBe(1);
    expect(a.body.users).toBeUndefined();

    const b = await request(app).get('/api/v1/analytics/summary').set(auth(userB.token));
    expect(b.body.incidents.total).toBe(1);
    expect(b.body.incidents.active).toBe(1);
    expect(b.body.incidents.byStatus.ALERTING).toBe(1);

    const all = await request(app).get('/api/v1/analytics/summary').set(auth(admin.token));
    expect(all.body.incidents.total).toBeGreaterThanOrEqual(2);
    expect(all.body.users.total).toBeGreaterThanOrEqual(3);
    expect(all.body.viewerRole).toBe('ADMIN');
  });

  it('includes linked children in a guardian summary', async () => {
    const guardian = await createUser('GUARDIAN', 'GUARDIAN');
    const child = await createUser('USER', 'CHILD');
    const stranger = await createUser();
    await GuardianLink.create({
      guardianId: guardian.user._id,
      childId: child.user._id,
      status: 'VERIFIED',
      initiatedBy: 'GUARDIAN',
      verifiedAt: new Date(),
    });
    await createIncident(child.user._id.toString(), { status: 'NOTIFIED' });

    const summary = await request(app)
      .get('/api/v1/analytics/summary')
      .set(auth(guardian.token));
    expect(summary.status).toBe(200);
    expect(summary.body.linkedChildren).toBe(1);
    expect(summary.body.incidents.total).toBeGreaterThanOrEqual(1);

    const strangerSummary = await request(app)
      .get('/api/v1/analytics/summary')
      .set(auth(stranger.token));
    expect(strangerSummary.body.incidents.total).toBe(0);
  });

  it('lists notifications with role scoping and honest summary counts', async () => {
    const userA = await createUser();
    const userB = await createUser();
    const admin = await createUser('ADMIN');

    const incidentA = await createIncident(userA.user._id.toString());
    const incidentB = await createIncident(userB.user._id.toString());
    await createNotification(incidentA._id.toString(), userA.user._id.toString(), 'SENT', true);
    await createNotification(
      incidentA._id.toString(),
      userA.user._id.toString(),
      'DELIVERED',
    );
    await createNotification(incidentB._id.toString(), userB.user._id.toString(), 'FAILED');

    const own = await request(app).get('/api/v1/notifications').set(auth(userA.token));
    expect(own.status).toBe(200);
    expect(own.body.notifications).toHaveLength(2);
    expect(own.body.summary.sent).toBe(1);
    expect(own.body.summary.delivered).toBe(1);
    expect(own.body.summary.simulated).toBe(1);

    const all = await request(app).get('/api/v1/notifications').set(auth(admin.token));
    expect(all.body.pagination.total).toBeGreaterThanOrEqual(3);
    expect(all.body.notifications).toHaveLength(3);

    const failed = await request(app)
      .get('/api/v1/notifications?status=FAILED')
      .set(auth(admin.token));
    expect(failed.body.notifications).toHaveLength(1);
    expect(failed.body.notifications[0].incidentId).toBe(incidentB._id.toString());
    expect(failed.body.summary.failed).toBe(1);

    const byIncident = await request(app)
      .get(`/api/v1/notifications?incidentId=${incidentA._id.toString()}`)
      .set(auth(userA.token));
    expect(byIncident.body.notifications).toHaveLength(2);
  });

  it('exports role-scoped CSV and audits the export', async () => {
    const userA = await createUser();
    const userB = await createUser();
    const admin = await createUser('ADMIN');
    const incidentA = await createIncident(userA.user._id.toString(), {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      clientIncidentId: 'csv-visible-a',
    });
    await createIncident(userB.user._id.toString(), {
      clientIncidentId: 'csv-hidden-b',
      status: 'ALERTING',
    });

    const own = await request(app)
      .get('/api/v1/analytics/incidents.csv')
      .set(auth(userA.token));
    expect(own.status).toBe(200);
    expect(own.headers['content-type']).toContain('text/csv');
    expect(own.text).toContain('csv-visible-a');
    expect(own.text).not.toContain('csv-hidden-b');
    expect(own.text).toContain('incident_id,client_incident_id');

    // Browser clients must be able to read the export metadata headers,
    // otherwise the dashboard would report every export as zero rows.
    const exposed = await request(app)
      .get('/api/v1/analytics/incidents.csv')
      .set(auth(userA.token))
      .set('Origin', 'http://localhost:5174');
    expect(exposed.headers['access-control-expose-headers']).toContain('X-Export-Rows');
    expect(exposed.headers['x-export-rows']).toBe('1');

    const all = await request(app)
      .get('/api/v1/analytics/incidents.csv')
      .set(auth(admin.token));
    expect(all.text).toContain('csv-visible-a');
    expect(all.text).toContain('csv-hidden-b');

    const crossUser = await request(app)
      .get(`/api/v1/analytics/incidents.csv?ownerId=${userB.user._id.toString()}`)
      .set(auth(userA.token));
    expect(crossUser.status).toBe(403);

    const exportAudit = await AuditLog.findOne({
      action: 'ANALYTICS_EXPORTED',
      resourceId: { $exists: true },
      actorId: userA.user._id,
    }).sort({ createdAt: -1 });
    expect(exportAudit).toBeTruthy();
    expect(exportAudit?.detail).toContain('exported');

    // The incident is real and visible in the scoped timeline.
    expect(incidentA.status).toBe('RESOLVED');
  });

  it('exposes active incidents and owner summaries to the dashboard', async () => {
    const user = await createUser();
    const admin = await createUser('ADMIN');
    const incident = await createIncident(user.user._id.toString(), { status: 'ALERTING' });

    const active = await request(app)
      .get('/api/v1/incidents?active=true&limit=100')
      .set(auth(admin.token));
    expect(active.status).toBe(200);
    expect(active.body.incidents.length).toBeGreaterThan(0);
    const match = active.body.incidents.find(
      (i: { id: string }) => i.id === incident._id.toString(),
    );
    expect(match.owner.fullName).toBe(user.user.fullName);
    expect(match.owner.phoneMasked).toContain('****');

    const detail = await request(app)
      .get(`/api/v1/incidents/${incident._id.toString()}`)
      .set(auth(user.token));
    expect(detail.status).toBe(200);
    expect(detail.body.incident.owner.id).toBe(user.user._id.toString());
  });
});
