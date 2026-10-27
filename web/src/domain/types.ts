/**
 * Domain entities — the shared contract described in docs/ARCHITECTURE.md §5.
 * Pure data, no I/O. Kept identical in meaning to the Android/Kotlin model.
 */

export type EmergencyType =
  | 'PERSONAL_SAFETY'
  | 'MEDICAL'
  | 'CHILD'
  | 'HARASSMENT'
  | 'OTHER';

export const EMERGENCY_TYPES: { value: EmergencyType; label: string }[] = [
  { value: 'PERSONAL_SAFETY', label: 'Personal safety' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'CHILD', label: 'Child in danger' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'OTHER', label: 'Other' },
];

export type EventStatus = 'ACTIVE' | 'CANCELLED' | 'RESOLVED';

export type Channel = 'WHATSAPP' | 'SMS' | 'CALL' | 'SHARE';

/**
 * The single source of truth for delivery truthfulness.
 * HANDED_OFF means "prepared and handed to the OS/app — user must complete the send".
 * SENT is only reachable via explicit user confirmation or a future backend ACK.
 */
export type DeliveryStatus =
  | 'QUEUED'
  | 'HANDED_OFF'
  | 'SENT'
  | 'FAILED'
  | 'ACKNOWLEDGED';

export type ConsentState = 'INVITED' | 'CONSENTED' | 'REVOKED';

export type LocationSource = 'GPS' | 'NETWORK' | 'CACHE';

export interface LocationFix {
  lat: number;
  lng: number;
  accuracyM: number;
  /** epoch ms when the fix was captured — freshness is mandatory */
  capturedAt: number;
  source: LocationSource;
}

export interface EmergencyEvent {
  id: string;
  type: EmergencyType;
  /** epoch ms */
  createdAt: number;
  note?: string;
  /** null when location was unavailable — never blocks the SOS */
  location?: LocationFix | null;
  status: EventStatus;
  resolvedAt?: number;
}

export interface ChannelDelivery {
  id: string;
  eventId: string;
  contactId: string;
  channel: Channel;
  status: DeliveryStatus;
  attempts: number;
  createdAt: number;
  lastAttemptAt?: number;
  handedOffAt?: number;
  sentAt?: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  error?: string;
}

export interface TrustedContact {
  id: string;
  name: string;
  /** E.164-ish, as entered by the user */
  phone: string;
  relation?: string;
  consent: ConsentState;
  /** lower = higher priority */
  priority: number;
  /** channels attempted automatically on SOS */
  channels: Channel[];
  createdAt: number;
}

export interface AuditEntry {
  id: string;
  at: number;
  eventId?: string;
  action: string;
  detail?: string;
}

export interface Profile {
  name?: string;
  phone?: string;
}

/** How long a location fix is considered "fresh" for display purposes. */
export const FRESH_FIX_MS = 5 * 60 * 1000;

export function locationFreshness(fix: LocationFix, now = Date.now()): {
  fresh: boolean;
  ageMs: number;
} {
  const ageMs = now - fix.capturedAt;
  return { fresh: ageMs <= FRESH_FIX_MS, ageMs };
}

export function formatAge(ageMs: number): string {
  const s = Math.max(0, Math.round(ageMs / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
