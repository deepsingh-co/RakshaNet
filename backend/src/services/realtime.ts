/**
 * Thin realtime abstraction. Module 4 wires a Socket.IO server in via
 * `setRealtimeIO`; until then every emit is a safe no-op so routes never
 * have to care whether realtime is available.
 */
export interface RoomEmitter {
  to(room: string): { emit(event: string, payload: unknown): unknown };
}

let io: RoomEmitter | null = null;

export function setRealtimeIO(server: RoomEmitter | null): void {
  io = server;
}

export const rooms = {
  user: (userId: string) => `user:${userId}`,
  incident: (incidentId: string) => `incident:${incidentId}`,
  admins: () => 'admins',
};

function emit(room: string, event: string, payload: unknown): void {
  try {
    io?.to(room).emit(event, payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[realtime] emit failed:', (err as Error).message);
  }
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  emit(rooms.user(userId), event, payload);
}

export function emitToIncident(incidentId: string, event: string, payload: unknown): void {
  emit(rooms.incident(incidentId), event, payload);
}

export function emitToAdmins(event: string, payload: unknown): void {
  emit(rooms.admins(), event, payload);
}
