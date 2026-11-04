import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as createClient, type Socket } from 'socket.io-client';
import type { Server as IOServer } from 'socket.io';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { connectDb, disconnectDb } from '../db/connect.js';
import { User } from '../models/User.js';
import { Incident } from '../models/Incident.js';
import { Location } from '../models/Location.js';
import { Notification } from '../models/Notification.js';
import { TrustedContact } from '../models/TrustedContact.js';
import { GuardianLink } from '../models/GuardianLink.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../services/password.js';
import { signAccessToken } from '../services/tokens.js';
import { env } from '../config/env.js';
import { initSocketServer } from './socketServer.js';

const app = createApp();
let httpServer: HttpServer;
let ioServer: IOServer;
let baseUrl = '';
const clients: Socket[] = [];

async function createUser(
  role: 'USER' | 'GUARDIAN' | 'ADMIN' = 'USER',
  accountType: 'INDIVIDUAL' | 'GUARDIAN' | 'CHILD' = 'INDIVIDUAL',
) {
  const suffix = Math.random().toString(36).slice(2, 9);
  const user = await User.create({
    fullName: `Socket ${suffix}`,
    email: `socket_${suffix}@example.com`,
    phone: `+9195${Math.floor(10000000 + Math.random() * 89999999)}`,
    passwordHash: await hashPassword('SocketPass1'),
    role,
    accountType,
    status: 'ACTIVE',
  });
  const token = signAccessToken({
    sub: user._id.toString(),
    role,
    accountType,
  });
  return { user, token };
}

async function createIncidentFor(userId: string) {
  return Incident.create({
    userId,
    clientIncidentId: `socket_inc_${Math.random().toString(36).slice(2, 10)}`,
    type: 'SOS',
    severity: 'CRITICAL',
    status: 'ALERTING',
    startedAt: new Date(),
    clientCreatedAt: new Date(),
    receivedAt: new Date(),
  });
}

async function connectReady(token: string): Promise<{ socket: Socket; session: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const socket = createClient(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      timeout: 5000,
    });
    clients.push(socket);

    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('socket connect timeout'));
    }, 5000);

    socket.once('session:ready', (session: Record<string, unknown>) => {
      clearTimeout(timer);
      resolve({ socket, session });
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function nextEvent<T = unknown>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (data: T) => {
      clearTimeout(timer);
      resolve(data);
    };
    const timer = setTimeout(() => {
      socket.off(event, handler as never);
      reject(new Error(`timeout waiting for ${event}`));
    }, timeoutMs);
    socket.once(event, handler);
  });
}

beforeAll(async () => {
  await connectDb('mongodb://127.0.0.1:27017/suraksha_ai_test');
  await Promise.all([
    User.deleteMany({}),
    Incident.deleteMany({}),
    Location.deleteMany({}),
    Notification.deleteMany({}),
    TrustedContact.deleteMany({}),
    GuardianLink.deleteMany({}),
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  httpServer = createServer(app);
  ioServer = initSocketServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  for (const client of clients) client.close();
  await new Promise<void>((resolve) => ioServer.close(() => resolve()));
  await Promise.all([
    User.deleteMany({}),
    Incident.deleteMany({}),
    Location.deleteMany({}),
    Notification.deleteMany({}),
    TrustedContact.deleteMany({}),
    GuardianLink.deleteMany({}),
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  await disconnectDb();
});

describe('authenticated Socket.IO', () => {
  it('rejects connections without a valid access token', async () => {
    const socket = createClient(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      timeout: 5000,
    });
    clients.push(socket);

    const error = await new Promise<Error>((resolve) => {
      socket.once('connect_error', (err) => resolve(err));
    });
    expect(error.message).toContain('UNAUTHENTICATED');
  });

  it('joins user/admin rooms and verifies incident subscriptions', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const admin = await createUser('ADMIN');
    const incident = await createIncidentFor(owner.user._id.toString());

    const ownerClient = await connectReady(owner.token);
    expect(ownerClient.session.role).toBe('USER');
    expect(ownerClient.session.rooms).toContain(`user:${owner.user._id.toString()}`);

    const own = await ownerClient.socket
      .timeout(5000)
      .emitWithAck('incident:subscribe', { incidentId: incident._id.toString() });
    expect(own.ok).toBe(true);
    expect(own.room).toBe(`incident:${incident._id.toString()}`);

    const strangerClient = await connectReady(stranger.token);
    const denied = await strangerClient.socket
      .timeout(5000)
      .emitWithAck('incident:subscribe', { incidentId: incident._id.toString() });
    expect(denied.ok).toBe(false);
    expect(denied.error).toBe('FORBIDDEN');

    const adminClient = await connectReady(admin.token);
    expect(adminClient.session.rooms).toContain('admins');
    const allowed = await adminClient.socket
      .timeout(5000)
      .emitWithAck('incident:subscribe', incident._id.toString());
    expect(allowed.ok).toBe(true);

    const invalid = await ownerClient.socket
      .timeout(5000)
      .emitWithAck('incident:subscribe', { incidentId: 'nope' });
    expect(invalid.error).toBe('INVALID_INCIDENT_ID');

    const ping = await ownerClient.socket.timeout(5000).emitWithAck('ping:client');
    expect(ping.ok).toBe(true);
  });

  it('delivers incident:created and location updates to the owner room', async () => {
    const owner = await createUser();
    const { socket } = await connectReady(owner.token);

    const createdPromise = nextEvent<{ id: string; status: string }>(socket, 'incident:created');
    const created = await request(app)
      .post('/api/v1/incidents')
      .set({ Authorization: `Bearer ${owner.token}` })
      .send({
        clientIncidentId: `socket_http_${Math.random().toString(36).slice(2, 10)}`,
        type: 'SOS',
        startedAt: new Date().toISOString(),
        location: {
          lat: 28.6139,
          lng: 77.209,
          capturedAt: new Date().toISOString(),
          source: 'GPS',
        },
      });

    expect(created.status).toBe(201);
    const createdEvent = await createdPromise;
    expect(createdEvent.id).toBe(created.body.incident.id);
    expect(createdEvent.status).toBe('DELIVERY_FAILED');

    const locationPromise = nextEvent<{
      incidentId: string;
      location: { lat: number };
    }>(socket, 'incident:location_updated');
    const location = await request(app)
      .post(`/api/v1/incidents/${created.body.incident.id}/locations`)
      .set({ Authorization: `Bearer ${owner.token}` })
      .send({
        clientLocationId: 'socket-loc-1',
        lat: 28.62,
        lng: 77.21,
        capturedAt: new Date().toISOString(),
        source: 'GPS',
      });

    expect(location.status).toBe(201);
    const locationEvent = await locationPromise;
    expect(locationEvent.incidentId).toBe(created.body.incident.id);
    expect(locationEvent.location.lat).toBeCloseTo(28.62);
  });

  it('lets a verified guardian subscribe and receive acknowledgement events', async () => {
    const guardian = await createUser('GUARDIAN', 'GUARDIAN');
    const child = await createUser('USER', 'CHILD');
    await GuardianLink.create({
      guardianId: guardian.user._id,
      childId: child.user._id,
      status: 'VERIFIED',
      initiatedBy: 'GUARDIAN',
      verifiedAt: new Date(),
    });
    const incident = await createIncidentFor(child.user._id.toString());

    const { socket } = await connectReady(guardian.token);
    const subscribed = await socket
      .timeout(5000)
      .emitWithAck('incident:subscribe', { incidentId: incident._id.toString() });
    expect(subscribed.ok).toBe(true);

    const ackPromise = nextEvent<{ status: string; acknowledgedAt: string }>(
      socket,
      'incident:acknowledged',
    );
    const ack = await request(app)
      .patch(`/api/v1/incidents/${incident._id.toString()}/status`)
      .set({ Authorization: `Bearer ${guardian.token}` })
      .send({ status: 'ACKNOWLEDGED', note: 'Guardian responding' });

    expect(ack.status).toBe(200);
    const event = await ackPromise;
    expect(event.status).toBe('ACKNOWLEDGED');
    expect(event.acknowledgedAt).toBeTruthy();
  });

  it('disconnects a socket when its access token expires', async () => {
    const user = await createUser();
    const shortToken = jwt.sign(
      {
        sub: user.user._id.toString(),
        role: 'USER',
        accountType: 'INDIVIDUAL',
        type: 'access',
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1s' },
    );

    const { socket } = await connectReady(shortToken);
    expect(socket.connected).toBe(true);

    await new Promise<void>((resolve) => socket.once('disconnect', () => resolve()));
    expect(socket.connected).toBe(false);
  });

  it('delivers every new incident to the admin room', async () => {
    const admin = await createUser('ADMIN');
    const owner = await createUser();
    const { socket } = await connectReady(admin.token);

    const eventPromise = nextEvent<{ id: string; userId: string }>(socket, 'incident:created');
    const created = await request(app)
      .post('/api/v1/incidents')
      .set({ Authorization: `Bearer ${owner.token}` })
      .send({
        clientIncidentId: `socket_admin_${Math.random().toString(36).slice(2, 10)}`,
        type: 'MANUAL',
        startedAt: new Date().toISOString(),
      });

    expect(created.status).toBe(201);
    const event = await eventPromise;
    expect(event.id).toBe(created.body.incident.id);
    expect(event.userId).toBe(owner.user._id.toString());
  });
});
