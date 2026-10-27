/**
 * Dexie (IndexedDB) schema — the local-first store. Everything the app needs
 * lives here; no network is required for any v1 feature.
 * See docs/ARCHITECTURE.md §7.1.
 */
import Dexie, { type EntityTable } from 'dexie';
import type {
  AuditEntry,
  ChannelDelivery,
  EmergencyEvent,
  Profile,
  TrustedContact,
} from '../domain/types';

export interface SettingRow {
  key: string;
  value: unknown;
}

class RakshaNetDB extends Dexie {
  events!: EntityTable<EmergencyEvent, 'id'>;
  deliveries!: EntityTable<ChannelDelivery, 'id'>;
  contacts!: EntityTable<TrustedContact, 'id'>;
  audit!: EntityTable<AuditEntry, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor() {
    super('rakshanet');
    this.version(1).stores({
      events: 'id, createdAt, status',
      deliveries: 'id, eventId, contactId, status, [eventId+contactId]',
      contacts: 'id, priority, phone',
      audit: 'id, at, eventId',
      settings: 'key',
    });
  }
}

export const db = new RakshaNetDB();

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---- Audit ----

export async function audit(action: string, detail?: string, eventId?: string): Promise<void> {
  await db.audit.add({ id: uuid(), at: Date.now(), action, detail, eventId });
}

// ---- Settings / profile ----

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getProfile(): Promise<Profile> {
  return (await getSetting<Profile>('profile')) ?? {};
}

export async function saveProfile(profile: Profile): Promise<void> {
  await setSetting('profile', profile);
}

/** Wipe everything — used by the privacy "clear all data" control. */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.events.clear(),
    db.deliveries.clear(),
    db.contacts.clear(),
    db.audit.clear(),
    db.settings.clear(),
  ]);
}
