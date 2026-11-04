import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDb, disconnectDb } from '../db/connect.js';
import { User } from '../models/User.js';
import { TrustedContact } from '../models/TrustedContact.js';
import { GuardianLink } from '../models/GuardianLink.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../services/password.js';

const app = createApp();

const DB = 'mongodb://127.0.0.1:27017/suraksha_ai_test';

async function register(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      fullName: 'Module Two',
      email: `user${Math.random().toString(36).slice(2, 9)}@example.com`,
      phone: `+9199${Math.floor(10000000 + Math.random() * 89999999)}`,
      password: 'Str0ngPass1',
      preferredLanguage: 'en',
      accountType: 'INDIVIDUAL',
      ...overrides,
    });
  return res;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await connectDb(DB);
  await Promise.all([
    User.deleteMany({}),
    TrustedContact.deleteMany({}),
    GuardianLink.deleteMany({}),
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({}),
    TrustedContact.deleteMany({}),
    GuardianLink.deleteMany({}),
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  await disconnectDb();
});

describe('trusted contacts', () => {
  let token = '';
  let contactId = '';

  it('creates the first contact and makes it primary', async () => {
    const reg = await register();
    token = reg.body.accessToken;

    const res = await request(app)
      .post('/api/v1/contacts')
      .set(auth(token))
      .send({ name: 'Maa', phone: '+919812345678', relationship: 'MOTHER' });

    expect(res.status).toBe(201);
    expect(res.body.contact.isPrimary).toBe(true);
    expect(res.body.contact.verificationStatus).toBe('UNVERIFIED');
    expect(res.body.contact.phoneMasked).toContain('****');
    contactId = res.body.contact.id;
  });

  it('rejects duplicate phone numbers for the same owner', async () => {
    const res = await request(app)
      .post('/api/v1/contacts')
      .set(auth(token))
      .send({ name: 'Maa again', phone: '+919812345678' });
    expect(res.status).toBe(409);
  });

  it('lists contacts', async () => {
    const res = await request(app).get('/api/v1/contacts').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.contacts).toHaveLength(1);
  });

  it('cannot verify with a wrong code', async () => {
    const requestCode = await request(app)
      .post(`/api/v1/contacts/${contactId}/request-verification`)
      .set(auth(token));
    expect(requestCode.status).toBe(200);
    expect(requestCode.body.devCode).toMatch(/^\d{6}$/);

    const wrong = await request(app)
      .post(`/api/v1/contacts/${contactId}/confirm-verification`)
      .set(auth(token))
      .send({ code: '000000' });
    expect(wrong.status).toBe(400);
  });

  it('verifies a contact with the correct code', async () => {
    // request a fresh code (previous one still valid, but re-request is explicit)
    const reqCode = await request(app)
      .post(`/api/v1/contacts/${contactId}/request-verification`)
      .set(auth(token));
    const code = reqCode.body.devCode as string;

    const res = await request(app)
      .post(`/api/v1/contacts/${contactId}/confirm-verification`)
      .set(auth(token))
      .send({ code });
    expect(res.status).toBe(200);
    expect(res.body.contact.verificationStatus).toBe('VERIFIED');
    expect(res.body.contact.verifiedAt).toBeTruthy();
  });

  it('does not let another user read this contact', async () => {
    const other = await register();
    const res = await request(app)
      .get(`/api/v1/contacts/${contactId}`)
      .set(auth(other.body.accessToken));
    expect(res.status).toBe(404);
  });

  it('promotes a verified contact when the primary is deleted', async () => {
    // second contact, verified
    const created = await request(app)
      .post('/api/v1/contacts')
      .set(auth(token))
      .send({ name: 'Papa', phone: '+919812345679', relationship: 'FATHER' });
    const id2 = created.body.contact.id as string;

    const reqCode = await request(app)
      .post(`/api/v1/contacts/${id2}/request-verification`)
      .set(auth(token));
    await request(app)
      .post(`/api/v1/contacts/${id2}/confirm-verification`)
      .set(auth(token))
      .send({ code: reqCode.body.devCode });

    // set as primary
    const primary = await request(app).post(`/api/v1/contacts/${id2}/primary`).set(auth(token));
    expect(primary.status).toBe(200);

    // delete it -> the other verified contact should become primary
    const del = await request(app).delete(`/api/v1/contacts/${id2}`).set(auth(token));
    expect(del.status).toBe(200);

    const list = await request(app).get('/api/v1/contacts').set(auth(token));
    expect(list.body.contacts[0].isPrimary).toBe(true);
  });
});

describe('users', () => {
  let userToken = '';
  let userId = '';

  it('updates own profile', async () => {
    const reg = await register({ fullName: 'Old Name' });
    userToken = reg.body.accessToken;
    userId = reg.body.user.id;

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(auth(userToken))
      .send({ fullName: 'New Name', preferredLanguage: 'hi' });

    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe('New Name');
    expect(res.body.user.preferredLanguage).toBe('hi');
  });

  it('blocks non-admins from listing users', async () => {
    const res = await request(app).get('/api/v1/users').set(auth(userToken));
    expect(res.status).toBe(403);
  });

  it('allows admins to list and suspend users', async () => {
    const adminEmail = 'admin.module2@example.com';
    await User.create({
      fullName: 'Admin',
      email: adminEmail,
      phone: '+919700000001',
      passwordHash: await hashPassword('AdminPass1'),
      role: 'ADMIN',
      accountType: 'INDIVIDUAL',
      status: 'ACTIVE',
    });

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminEmail, password: 'AdminPass1' });
    expect(login.status).toBe(200);
    const adminToken = login.body.accessToken as string;

    const list = await request(app).get('/api/v1/users?q=New').set(auth(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.pagination.total).toBeGreaterThan(0);

    const suspend = await request(app)
      .patch(`/api/v1/users/${userId}/status`)
      .set(auth(adminToken))
      .send({ status: 'SUSPENDED' });
    expect(suspend.status).toBe(200);
    expect(suspend.body.user.status).toBe('SUSPENDED');

    const relogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'nobody@example.com', password: 'x' });
    expect(relogin.status).toBe(401);
  });

  it('prevents an admin from changing their own status', async () => {
    const admin = await User.findOne({ email: 'admin.module2@example.com' });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin.module2@example.com', password: 'AdminPass1' });
    const res = await request(app)
      .patch(`/api/v1/users/${admin!._id.toString()}/status`)
      .set(auth(login.body.accessToken))
      .send({ status: 'SUSPENDED' });
    expect(res.status).toBe(400);
  });
});

describe('guardian and child', () => {
  it('links a child only after the child accepts with the consent code', async () => {
    const guardian = await register({
      accountType: 'GUARDIAN',
      email: 'guardian.m2@example.com',
      phone: '+919700000010',
    });
    const child = await register({
      email: 'child.m2@example.com',
      phone: '+919700000011',
    });

    expect(guardian.body.user.role).toBe('GUARDIAN');

    const invite = await request(app)
      .post('/api/v1/guardian/links')
      .set(auth(guardian.body.accessToken))
      .send({ childEmail: 'child.m2@example.com' });

    expect(invite.status).toBe(201);
    const code = invite.body.devCode as string;
    expect(code).toMatch(/^\d{6}$/);

    const links = await request(app)
      .get('/api/v1/guardian/links')
      .set(auth(child.body.accessToken));
    const linkId = links.body.asChild[0].id as string;
    expect(links.body.asChild[0].status).toBe('PENDING');

    const accept = await request(app)
      .post(`/api/v1/guardian/links/${linkId}/accept`)
      .set(auth(child.body.accessToken))
      .send({ code });
    expect(accept.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/guardian/links')
      .set(auth(guardian.body.accessToken));
    expect(after.body.asGuardian[0].status).toBe('VERIFIED');

    const childDoc = await User.findOne({ email: 'child.m2@example.com' });
    expect(childDoc?.accountType).toBe('CHILD');
    expect(childDoc?.guardianId?.toString()).toBe(guardian.body.user.id);
  });

  it('blocks non-guardians from inviting a child', async () => {
    const user = await register();
    const res = await request(app)
      .post('/api/v1/guardian/links')
      .set(auth(user.body.accessToken))
      .send({ childEmail: 'someone@example.com' });
    expect(res.status).toBe(403);
  });

  it('lets a guardian create a verified child account', async () => {
    const guardian = await register({
      accountType: 'GUARDIAN',
      email: 'guardian2.m2@example.com',
      phone: '+919700000012',
    });

    const res = await request(app)
      .post('/api/v1/guardian/children')
      .set(auth(guardian.body.accessToken))
      .send({
        fullName: 'Child Two',
        email: 'child2.m2@example.com',
        phone: '+919700000013',
        password: 'ChildPass1',
      });

    expect(res.status).toBe(201);
    expect(res.body.linkStatus).toBe('VERIFIED');
    expect(res.body.child.phoneMasked).toContain('****');
  });

  it('lets either party revoke a link', async () => {
    const guardian = await register({
      accountType: 'GUARDIAN',
      email: 'guardian3.m2@example.com',
      phone: '+919700000014',
    });
    const child = await register({ email: 'child3.m2@example.com', phone: '+919700000015' });

    const invite = await request(app)
      .post('/api/v1/guardian/links')
      .set(auth(guardian.body.accessToken))
      .send({ childEmail: 'child3.m2@example.com' });
    const links = await request(app)
      .get('/api/v1/guardian/links')
      .set(auth(child.body.accessToken));
    const linkId = links.body.asChild[0].id as string;
    await request(app)
      .post(`/api/v1/guardian/links/${linkId}/accept`)
      .set(auth(child.body.accessToken))
      .send({ code: invite.body.devCode });

    const revoke = await request(app)
      .delete(`/api/v1/guardian/links/${linkId}`)
      .set(auth(child.body.accessToken));
    expect(revoke.status).toBe(200);

    const childDoc = await User.findOne({ email: 'child3.m2@example.com' });
    expect(childDoc?.guardianId).toBeNull();
  });

  it('blocks non-admins from the guardian overview', async () => {
    const user = await register();
    const res = await request(app)
      .get('/api/v1/guardian/links/all')
      .set(auth(user.body.accessToken));
    expect(res.status).toBe(403);
  });
});
