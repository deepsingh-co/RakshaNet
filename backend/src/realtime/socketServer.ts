import type http from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken, type AccessPayload } from '../services/tokens.js';
import { rooms, setRealtimeIO, type RoomEmitter } from '../services/realtime.js';
import { Incident } from '../models/Incident.js';
import { GuardianLink } from '../models/GuardianLink.js';

const HEX_ID = /^[a-f0-9]{24}$/i;
const MAX_INCIDENT_SUBSCRIPTIONS = 20;

interface SocketState {
  user: AccessPayload;
  incidentIds: Set<string>;
}

function incidentIdFrom(payload: unknown): string {
  if (typeof payload === 'string') return payload.trim();
  if (payload && typeof payload === 'object' && 'incidentId' in payload) {
    const value = (payload as { incidentId?: unknown }).incidentId;
    return typeof value === 'string' ? value.trim() : '';
  }
  return '';
}

async function canViewIncident(user: AccessPayload, incidentId: string): Promise<boolean> {
  const incident = await Incident.findById(incidentId).select('userId');
  if (!incident) return false;
  if (incident.userId.toString() === user.sub) return true;
  if (user.role === 'ADMIN') return true;

  const link = await GuardianLink.findOne({
    guardianId: user.sub,
    childId: incident.userId,
    status: 'VERIFIED',
  });
  return Boolean(link);
}

/**
 * Socket.IO server with JWT handshake authentication.
 *
 * Every socket joins `user:<id>`; admins also join `admins`. Incident rooms
 * are joined only on explicit, verified `incident:subscribe` calls — a
 * guardian must have a VERIFIED link to the child, and strangers are
 * rejected without leaking whether the incident exists.
 */
export function initSocketServer(
  httpServer: http.Server,
  corsOrigins: string[] = env.corsOrigins,
): Server {
  const io = new Server(httpServer, {
    path: '/socket.io',
    serveClient: false,
    maxHttpBufferSize: 100_000,
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use((socket, next) => {
    const authToken =
      typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
    const header = socket.handshake.headers.authorization ?? '';
    const headerToken = header.startsWith('Bearer ') ? header.slice(7) : '';
    const token = authToken || headerToken;

    if (!token) {
      next(new Error('UNAUTHENTICATED'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      const state: SocketState = { user: payload, incidentIds: new Set<string>() };
      socket.data.state = state;
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  io.on('connection', (socket) => {
    const state = socket.data.state as SocketState;
    const user = state.user;

    void socket.join(rooms.user(user.sub));
    if (user.role === 'ADMIN') {
      void socket.join(rooms.admins());
    }

    socket.emit('session:ready', {
      userId: user.sub,
      role: user.role,
      rooms: [rooms.user(user.sub), ...(user.role === 'ADMIN' ? [rooms.admins()] : [])],
    });

    socket.on(
      'incident:subscribe',
      (payload: unknown, ack?: (response: unknown) => void) => {
        void (async () => {
          const incidentId = incidentIdFrom(payload);
          if (!HEX_ID.test(incidentId)) {
            ack?.({ ok: false, error: 'INVALID_INCIDENT_ID' });
            return;
          }
          if (
            state.incidentIds.size >= MAX_INCIDENT_SUBSCRIPTIONS &&
            !state.incidentIds.has(incidentId)
          ) {
            ack?.({ ok: false, error: 'SUBSCRIPTION_LIMIT_REACHED' });
            return;
          }

          try {
            if (!(await canViewIncident(user, incidentId))) {
              ack?.({ ok: false, error: 'FORBIDDEN' });
              return;
            }
            await socket.join(rooms.incident(incidentId));
            state.incidentIds.add(incidentId);
            ack?.({ ok: true, incidentId, room: rooms.incident(incidentId) });
          } catch {
            ack?.({ ok: false, error: 'INVALID_REQUEST' });
          }
        })();
      },
    );

    socket.on(
      'incident:unsubscribe',
      (payload: unknown, ack?: (response: unknown) => void) => {
        void (async () => {
          const incidentId = incidentIdFrom(payload);
          if (!HEX_ID.test(incidentId)) {
            ack?.({ ok: false, error: 'INVALID_INCIDENT_ID' });
            return;
          }
          await socket.leave(rooms.incident(incidentId));
          state.incidentIds.delete(incidentId);
          ack?.({ ok: true, incidentId });
        })();
      },
    );

    socket.on('ping:client', (ack?: (response: unknown) => void) => {
      ack?.({ ok: true, at: new Date().toISOString() });
    });
  });

  setRealtimeIO(io as unknown as RoomEmitter);
  return io;
}
