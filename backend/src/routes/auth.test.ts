import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDb, disconnectDb } from '../db/connect.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';

const app = createApp();

const validUser = {
  fullName: 'Anurudh Singh',
  email: 'anurudh.test@example.com',
  phone: '+919876543210',
  password: 'Str0ngPass1',
  preferredLanguage: 'en',
  accountType: 'INDIVIDUAL',
};

beforeAll(async () => {
  await connectDb('mongodb://127.0.0.1:27017/suraksha_ai_test');
  await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({}), AuditLog.deleteMany({})]);
});

afterAll(async () => {
  await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({}), AuditLog.deleteMany({})]);
  await disconnectDb();
});

describe('health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('auth', () => {
  let accessToken = '';
  let refreshToken = '';

  it('registers a user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.role).toBe('USER');
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    // Never leak secrets
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: 'weak@example.com', phone: '+919876543211', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns the current user for a valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe(validUser.fullName);
  });

  it('rejects missing token on /me', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('logs in with email and password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: validUser.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('rotates refresh tokens and revokes the old one', async () => {
    const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).toBeTruthy();
    expect(first.body.refreshToken).not.toBe(refreshToken);

    // Reuse of the rotated token must fail (and revoke the family)
    const reuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
  });

  it('records audit entries', async () => {
    const count = await AuditLog.countDocuments({ action: 'AUTH_LOGIN' });
    expect(count).toBeGreaterThan(0);
  });

  it('does not grant admin to a guardian account', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      ...validUser,
      email: 'guardian.test@example.com',
      phone: '+919876543212',
      accountType: 'GUARDIAN',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('GUARDIAN');
    expect(res.body.user.role).not.toBe('ADMIN');
  });
});
