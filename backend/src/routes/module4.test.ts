import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDb, disconnectDb } from '../db/connect.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { TrustedContact } from '../models/TrustedContact.js';
import { GuardianLink } from '../models/GuardianLink.js';
import { Incident } from '../models/Incident.js';
import { Location } from '../models/Location.js';
import { Notification } from '../models/Notification.js';
import { hashPassword } from '../services/password.js';
import { signAccessToken } from '../services/tokens.js';

const app = createApp();

async function register() {
  return request(app)
    .post('/api/v1/auth/register')
    .send({
      fullName: 'Audit User',
      email: `audit_${Math.random().toString(36).slice(2, 9)}@example.com`,
      phone: `+9194${Math.floor(10000000 + Math.random() * 89999999)}`,
      password: 'Str0ngPass1',
      preferredLanguage: 'en',
      accountType: 'INDIVIDUAL',
    });
}

async function createAdmin() {
  const user = await User.create({
    fullName: 'Audit Admin',
    email: `audit_admin_${Math.random().toString(36).slice(2, 8)}@example.com`,
    phone: `+9193${Math.floor(10000000 + Math.random() * 89999999)}`,
    passwordHash: await hashPassword('AdminPass1'),
    role: 'ADMIN',
    accountType: 'INDIVIDUAL',
    status: 'ACTIVE',
  });
  return signAccessToken({
    sub: user._id.toString(),
    role: 'ADMIN',
    accountType: 'INDIVIDUAL',
  });
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await connectDb('mongodb://127.0.0.1:27017/suraksha_ai_test');
  await Promise.all([
    User.deleteMany({}),
    AuditLog.deleteMany({}),
    RefreshToken.deleteMany({}),
    TrustedContact.deleteMany({}),
    GuardianLink.deleteMany({}),
    Incident.deleteMany({}),
    Location.deleteMany({}),
    Notification.deleteMany({}),
  ]);
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({}),
    AuditLog.deleteMany({}),
    RefreshToken.deleteMany({}),
    TrustedContact.deleteMany({}),
    GuardianLink.deleteMany({}),
    Incident.deleteMany({}),
    Location.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  await disconnectDb();
});

describe('audit log API', () => {
  it('is admin-only and read-only', async () => {
    const user = await register();

    expect((await request(app).get('/api/v1/audit')).status).toBe(401);
    expect((await request(app).get('/api/v1/audit').set(auth(user.body.accessToken))).status).toBe(
      403,
    );

    const adminToken = await createAdmin();
    expect(
      (await request(app).post('/api/v1/audit').set(auth(adminToken)).send({})).status,
    ).toBe(404);
  });

  it('lists filtered audit entries with pagination', async () => {
    await register();
    const adminToken = await createAdmin();

    const list = await request(app)
      .get('/api/v1/audit?action=AUTH_REGISTER&limit=5')
      .set(auth(adminToken));

    expect(list.status).toBe(200);
    expect(list.body.pagination.total).toBeGreaterThan(0);
    expect(list.body.pagination.limit).toBe(5);
    expect(list.body.logs.length).toBeGreaterThan(0);
    for (const log of list.body.logs) {
      expect(log.action).toBe('AUTH_REGISTER');
      expect(log.outcome).toBe('SUCCESS');
      expect(log.actorId).toBeTruthy();
      expect(log.detail).toBeDefined();
    }

    const paged = await request(app)
      .get('/api/v1/audit?limit=1&page=2')
      .set(auth(adminToken));
    expect(paged.status).toBe(200);
    expect(paged.body.logs).toHaveLength(1);

    const actions = await request(app)
      .get('/api/v1/audit/actions')
      .set(auth(adminToken));
    expect(actions.status).toBe(200);
    expect(actions.body.actions).toContain('INCIDENT_CREATED');
    expect(actions.body.actions).toContain('NOTIFICATION_DELIVERED');
  });

  it('reads a single audit entry and audits the access', async () => {
    const adminToken = await createAdmin();
    const log = await AuditLog.findOne({ action: 'AUTH_REGISTER' }).sort({ createdAt: -1 });
    expect(log).toBeTruthy();

    const detail = await request(app)
      .get(`/api/v1/audit/${log!._id.toString()}`)
      .set(auth(adminToken));
    expect(detail.status).toBe(200);
    expect(detail.body.log.id).toBe(log!._id.toString());
    expect(detail.body.log.action).toBe('AUTH_REGISTER');

    const accessLog = await AuditLog.findOne({
      action: 'ADMIN_ACTION',
      resourceType: 'audit_log',
      resourceId: log!._id.toString(),
    });
    expect(accessLog).toBeTruthy();

    const missing = await request(app)
      .get('/api/v1/audit/not-a-valid-id')
      .set(auth(adminToken));
    expect(missing.status).toBe(404);
  });
});
