/**
 * Emergency message composition — pure, so both channels send identical text
 * and the format is unit-testable.
 */
import type { EmergencyEvent, LocationFix, Profile, TrustedContact } from './types';
import { formatAge, locationFreshness } from './types';

export function mapsLink(fix: LocationFix): string {
  return `https://maps.google.com/?q=${fix.lat},${fix.lng}`;
}

export function formatLocationLine(fix: LocationFix | null | undefined, now = Date.now()): string {
  if (!fix) return 'Location: unavailable at time of alert';
  const { fresh, ageMs } = locationFreshness(fix, now);
  const coords = `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)} (±${Math.round(fix.accuracyM)}m)`;
  const freshness = fresh ? formatAge(ageMs) : `STALE — ${formatAge(ageMs)}`;
  return `Location: ${coords} — captured ${freshness} — ${mapsLink(fix)}`;
}

export function formatTime(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export interface MessageContext {
  event: EmergencyEvent;
  profile?: Profile;
  contact?: TrustedContact;
  now?: number;
}

/**
 * Example (see project overview):
 *   RakshaNet Emergency Alert — SOS ALERT: HELP NEEDED
 *   Emergency type / Time / Location + freshness / Request
 */
export function buildEmergencyMessage({ event, profile, contact, now = Date.now() }: MessageContext): string {
  const who = profile?.name ? ` — I am ${profile.name}` : '';
  const to = contact ? `Hi ${contact.name}, ` : '';
  const note = event.note ? `\nNote: ${event.note}` : '';
  return [
    'RakshaNet Emergency Alert — SOS ALERT: HELP NEEDED',
    '',
    `${to}an emergency alert has been triggered${who}.`,
    `Emergency type: ${event.type.replace(/_/g, ' ').toLowerCase()}`,
    `Time: ${formatTime(event.createdAt)}`,
    formatLocationLine(event.location, now),
    note,
    '',
    'Request: Please contact the user immediately and follow the agreed emergency plan.',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}
