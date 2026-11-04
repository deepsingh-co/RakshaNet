import type { Incident, IncidentDoc } from '../models/Incident.js';
import type { Location } from '../models/Location.js';
import type { Notification } from '../models/Notification.js';
import { maskPhone } from '../models/TrustedContact.js';

/** Public incident shape. No internal fields, no raw device identifiers. */
export function toIncident(i: InstanceType<typeof Incident>) {
  const clientCreatedAt = i.clientCreatedAt ?? i.startedAt;
  const offlineDelaySeconds = i.offlineCreated
    ? Math.max(0, Math.round((i.receivedAt.getTime() - clientCreatedAt.getTime()) / 1000))
    : 0;

  return {
    id: i._id.toString(),
    userId: i.userId.toString(),
    clientIncidentId: i.clientIncidentId,
    type: i.type,
    severity: i.severity,
    status: i.status,
    description: i.description,
    startedAt: i.startedAt,
    clientCreatedAt,
    receivedAt: i.receivedAt,
    offlineCreated: i.offlineCreated,
    syncedFromOffline: i.syncedFromOffline,
    offlineDelaySeconds,
    location: i.location ?? null,
    statusHistory: i.statusHistory,
    notes: i.notes,
    acknowledgedBy: i.acknowledgedBy ? i.acknowledgedBy.toString() : null,
    acknowledgedAt: i.acknowledgedAt,
    resolvedBy: i.resolvedBy ? i.resolvedBy.toString() : null,
    resolvedAt: i.resolvedAt,
    cancelledAt: i.cancelledAt,
    escalationLevel: i.escalationLevel,
    lastEscalatedAt: i.lastEscalatedAt,
    device: i.device ?? null,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export function toLocation(l: InstanceType<typeof Location>) {
  return {
    id: l._id.toString(),
    incidentId: l.incidentId.toString(),
    clientLocationId: l.clientLocationId,
    lat: l.lat,
    lng: l.lng,
    accuracyMeters: l.accuracyMeters ?? null,
    speedMps: l.speedMps ?? null,
    headingDeg: l.headingDeg ?? null,
    batteryLevel: l.batteryLevel ?? null,
    source: l.source,
    capturedAt: l.capturedAt,
    receivedAt: l.receivedAt,
    ageSeconds: Math.max(0, Math.round((l.receivedAt.getTime() - l.capturedAt.getTime()) / 1000)),
    isStale: l.isStale,
    offlineCaptured: l.offlineCaptured,
  };
}

export function toNotification(n: InstanceType<typeof Notification>) {
  return {
    id: n._id.toString(),
    incidentId: n.incidentId.toString(),
    contactId: n.contactId ? n.contactId.toString() : null,
    channel: n.channel,
    destinationMasked: n.destinationMasked,
    status: n.status,
    provider: n.provider,
    providerMessageId: n.providerMessageId,
    simulated: n.simulated,
    attempts: n.attempts,
    lastError: n.lastError,
    queuedAt: n.queuedAt,
    sentAt: n.sentAt,
    deliveredAt: n.deliveredAt,
    failedAt: n.failedAt,
  };
}

/** Mask helper shared with contact routes. */
export { maskPhone };

export type PublicIncident = ReturnType<typeof toIncident>;
export type PublicNotification = ReturnType<typeof toNotification>;

/** Structural type used by services that only read incident fields. */
export type IncidentLike = IncidentDoc & {
  _id: { toString(): string };
};
