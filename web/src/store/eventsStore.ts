/**
 * Events store — orchestrates the SOS flow described in ARCHITECTURE §5.3:
 *
 *  trigger() → persist event (write-ahead) → start alarm → capture location
 *            → create QUEUED deliveries for each consented contact × channel
 *            → attempt hand-off synchronously (inside the user gesture)
 *            → status advances only via the domain state machine
 *
 * Anything not handed off stays QUEUED and is retried on app open / 'online'.
 */
import { create } from 'zustand';
import { CHANNELS } from '../channels/channels';
import { IllegalTransitionError } from '../domain/deliveryMachine';
import {
  advanceDelivery,
  createDeliveries,
  createEvent,
  getDelivery,
  listDeliveries,
  listEvents,
  markAttempt,
  queuedDeliveries,
  setEventStatus,
  updateEventLocation,
} from '../data/eventsRepo';
import { sendableContacts } from '../data/contactsRepo';
import { buildEmergencyMessage } from '../domain/message';
import type {
  Channel,
  ChannelDelivery,
  EmergencyEvent,
  EmergencyType,
} from '../domain/types';
import { startAlarm, stopAlarm } from '../services/alarm';
import { getCachedFix, requestFreshFix } from '../services/location';
import { useContacts } from './contactsStore';
import { useSettings } from './settingsStore';

interface EventsState {
  events: EmergencyEvent[];
  deliveries: ChannelDelivery[];
  alarmActive: boolean;
  loading: boolean;
  /** last error surfaced to the UI (e.g. blocked popups) */
  notice: string | null;

  load: () => Promise<void>;
  trigger: (input: { type: EmergencyType; note?: string }) => Promise<string>;
  /** Attempt a hand-off for one delivery (user gesture required for popups). */
  attempt: (deliveryId: string) => Promise<void>;
  /** User confirms they pressed send in the messaging app. */
  confirmSent: (deliveryId: string) => Promise<void>;
  markFailed: (deliveryId: string) => Promise<void>;
  /** Manual retry: FAILED/QUEUED → re-attempt hand-off. */
  retry: (deliveryId: string) => Promise<void>;
  /** Explicit recipient acknowledgment (guardian tap / user marking reply). */
  acknowledge: (deliveryId: string) => Promise<void>;
  resolveEvent: (eventId: string) => Promise<void>;
  cancelEvent: (eventId: string) => Promise<void>;
  /** Retry everything still QUEUED — called on load and on 'online'. */
  drainQueue: () => Promise<void>;
  setNotice: (notice: string | null) => void;
}

function deliveriesFor(
  contacts: Awaited<ReturnType<typeof sendableContacts>>,
): { contactId: string; channel: Channel }[] {
  const targets: { contactId: string; channel: Channel }[] = [];
  for (const contact of contacts) {
    for (const channel of contact.channels) {
      if (channel === 'SHARE') continue; // share is always manual (needs a sheet)
      targets.push({ contactId: contact.id, channel });
    }
  }
  return targets;
}

export const useEvents = create<EventsState>((set, get) => ({
  events: [],
  deliveries: [],
  alarmActive: false,
  loading: false,
  notice: null,

  load: async () => {
    set({ loading: true });
    const [events, deliveries] = await Promise.all([listEvents(), listDeliveries()]);
    set({ events, deliveries, loading: false });
    // Resume the offline queue as soon as the app opens
    void get().drainQueue();
  },

  trigger: async ({ type, note }) => {
    const location = await getCachedFix();
    const event = await createEvent({ type, note, location });

    // Kick off a fresh fix in the background; the alert is already recorded.
    void requestFreshFix().then((fix) => {
      if (fix) {
        void updateEventLocation(event.id, fix);
        set({ events: (get().events ?? []).map((e) => (e.id === event.id ? { ...e, location: fix } : e)) });
      }
    });

    const contacts = await sendableContacts();
    const targets = deliveriesFor(contacts);
    const rows = await createDeliveries(event.id, targets);

    await startAlarm();
    set((s) => ({
      events: [event, ...s.events],
      deliveries: [...s.deliveries, ...rows],
      alarmActive: true,
      notice:
        contacts.length === 0
          ? 'No consented trusted contacts yet — add one from the Contacts tab. The event is saved.'
          : null,
    }));

    // Attempt hand-offs synchronously — we are still inside the user gesture,
    // which matters for popups (wa.me).
    for (const row of rows) {
      await get().attempt(row.id);
    }
    return event.id;
  },

  attempt: async (deliveryId) => {
    // Concurrency guard: drainQueue can fire from multiple sources at once
    // (app load, 'online', StrictMode double-mount). One attempt per delivery.
    if (inFlight.has(deliveryId)) return;
    inFlight.add(deliveryId);
    try {
      // DB is the source of truth — in-memory state may be stale mid-race.
      const fresh = await getDelivery(deliveryId);
      if (!fresh || fresh.status !== 'QUEUED') return;

      const contact = useContacts.getState().contacts.find((c) => c.id === fresh.contactId);
      const event = get().events.find((e) => e.id === fresh.eventId);
      if (!contact || !event) return;

      const adapter = CHANNELS[fresh.channel];
      const message = buildEmergencyMessage({
        event,
        contact,
        profile: useSettings.getState().profile,
      });

      await markAttempt(deliveryId);
      const result = adapter.dispatch(contact.phone, message);

      if (result.outcome === 'HANDED_OFF') {
        const next = await advanceDelivery(deliveryId, 'HANDED_OFF');
        set({ deliveries: replace(get().deliveries, next) });
      } else if (result.outcome === 'FAILED') {
        const next = await advanceDelivery(deliveryId, 'FAILED', { error: result.error });
        set({ deliveries: replace(get().deliveries, next), notice: result.error ?? null });
      } else {
        // BLOCKED — stays QUEUED, user can retry manually from the UI
        set({ notice: result.error ?? 'Hand-off blocked — tap Send to retry' });
      }
    } catch (err) {
      // A concurrent writer already advanced this row — benign, nothing to do.
      if (!(err instanceof IllegalTransitionError)) throw err;
    } finally {
      inFlight.delete(deliveryId);
    }
  },

  confirmSent: async (deliveryId) => {
    // User-attested send: HANDED_OFF → SENT (honest — they pressed send)
    const next = await advanceDelivery(deliveryId, 'SENT');
    set({ deliveries: replace(get().deliveries, next) });
  },

  markFailed: async (deliveryId) => {
    const current = get().deliveries.find((d) => d.id === deliveryId);
    if (!current || current.status === 'QUEUED') return;
    const next = await advanceDelivery(deliveryId, 'FAILED', { error: 'Marked failed by user' });
    set({ deliveries: replace(get().deliveries, next) });
  },

  retry: async (deliveryId) => {
    const current = get().deliveries.find((d) => d.id === deliveryId);
    if (!current) return;
    if (current.status === 'FAILED') {
      const requeued = await advanceDelivery(deliveryId, 'QUEUED');
      set({ deliveries: replace(get().deliveries, requeued) });
    }
    await get().attempt(deliveryId);
  },

  acknowledge: async (deliveryId) => {
    const next = await advanceDelivery(deliveryId, 'ACKNOWLEDGED');
    set({ deliveries: replace(get().deliveries, next) });
  },

  resolveEvent: async (eventId) => {
    await setEventStatus(eventId, 'RESOLVED');
    stopAlarm();
    set({
      events: get().events.map((e) => (e.id === eventId ? { ...e, status: 'RESOLVED', resolvedAt: Date.now() } : e)),
      alarmActive: false,
    });
  },

  cancelEvent: async (eventId) => {
    await setEventStatus(eventId, 'CANCELLED');
    stopAlarm();
    set({
      events: get().events.map((e) => (e.id === eventId ? { ...e, status: 'CANCELLED', resolvedAt: Date.now() } : e)),
      alarmActive: false,
    });
  },

  drainQueue: async () => {
    const queued = await queuedDeliveries();
    for (const row of queued) {
      // Only auto-retry when a channel can plausibly work right now
      if (row.channel === 'WHATSAPP' && !navigator.onLine) continue;
      await get().attempt(row.id);
    }
  },

  setNotice: (notice) => set({ notice }),
}));

/** Deliveries currently being attempted — prevents concurrent hand-offs. */
const inFlight = new Set<string>();

function replace(list: ChannelDelivery[], next: ChannelDelivery): ChannelDelivery[] {
  return list.map((d) => (d.id === next.id ? next : d));
}

// Re-drain the queue whenever connectivity returns.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void useEvents.getState().drainQueue();
  });
}
