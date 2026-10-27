/** Event + delivery repository — persistence and status advancement live here. */
import { advance } from '../domain/deliveryMachine';
import type {
  ChannelDelivery,
  DeliveryStatus,
  EmergencyEvent,
} from '../domain/types';
import { audit, db, uuid } from './db';

export async function createEvent(
  input: Pick<EmergencyEvent, 'type' | 'note' | 'location'>,
): Promise<EmergencyEvent> {
  const event: EmergencyEvent = {
    id: uuid(),
    type: input.type,
    note: input.note,
    location: input.location ?? null,
    createdAt: Date.now(),
    status: 'ACTIVE',
  };
  // Write-ahead: persist before any channel attempt (ARCHITECTURE §4.4)
  await db.events.add(event);
  await audit('SOS_TRIGGERED', event.type, event.id);
  return event;
}

export async function getEvent(id: string): Promise<EmergencyEvent | undefined> {
  return db.events.get(id);
}

export async function listEvents(): Promise<EmergencyEvent[]> {
  const all = await db.events.toArray();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateEventLocation(
  id: string,
  location: EmergencyEvent['location'],
): Promise<void> {
  await db.events.update(id, { location });
}

export async function setEventStatus(
  id: string,
  status: EmergencyEvent['status'],
): Promise<void> {
  await db.events.update(id, { status, resolvedAt: Date.now() });
  await audit(status === 'RESOLVED' ? 'SOS_RESOLVED' : 'SOS_CANCELLED', undefined, id);
}

// ---- Deliveries ----

export async function createDeliveries(
  eventId: string,
  targets: { contactId: string; channel: ChannelDelivery['channel'] }[],
): Promise<ChannelDelivery[]> {
  const now = Date.now();
  const rows: ChannelDelivery[] = targets.map((t) => ({
    id: uuid(),
    eventId,
    contactId: t.contactId,
    channel: t.channel,
    status: 'QUEUED',
    attempts: 0,
    createdAt: now,
  }));
  await db.deliveries.bulkAdd(rows);
  return rows;
}

export async function listDeliveries(eventId?: string): Promise<ChannelDelivery[]> {
  const all = eventId
    ? await db.deliveries.where('eventId').equals(eventId).toArray()
    : await db.deliveries.toArray();
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getDelivery(id: string): Promise<ChannelDelivery | undefined> {
  return db.deliveries.get(id);
}

/**
 * The ONLY way a delivery status changes. Validates against the state machine,
 * persists, and writes an audit entry. Throws IllegalTransitionError otherwise.
 */
export async function advanceDelivery(
  id: string,
  to: DeliveryStatus,
  patch: Partial<ChannelDelivery> = {},
): Promise<ChannelDelivery> {
  const row = await db.deliveries.get(id);
  if (!row) throw new Error(`Delivery not found: ${id}`);
  const status = advance(row.status, to);
  const updated: Partial<ChannelDelivery> = { status, ...patch };
  if (to === 'HANDED_OFF') updated.handedOffAt = Date.now();
  if (to === 'SENT') updated.sentAt = Date.now();
  if (to === 'ACKNOWLEDGED') updated.acknowledgedAt = Date.now();
  if (to === 'FAILED' || to === 'QUEUED') updated.resolvedAt = undefined;
  await db.deliveries.update(id, updated);
  const next = (await db.deliveries.get(id))!;
  await audit(
    `DELIVERY_${to}`,
    `${next.channel} → contact ${next.contactId} (attempt ${next.attempts})`,
    next.eventId,
  );
  return next;
}

/** Increment attempt counter without changing status (used when hand-off is blocked). */
export async function markAttempt(id: string, error?: string): Promise<void> {
  const row = await db.deliveries.get(id);
  if (!row) return;
  await db.deliveries.update(id, {
    attempts: row.attempts + 1,
    lastAttemptAt: Date.now(),
    error,
  });
}

/** All deliveries still waiting for a channel — the offline retry queue. */
export async function queuedDeliveries(): Promise<ChannelDelivery[]> {
  return db.deliveries.where('status').equals('QUEUED').toArray();
}
