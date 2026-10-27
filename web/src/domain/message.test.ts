import { describe, expect, it } from 'vitest';
import { buildEmergencyMessage, formatLocationLine, mapsLink } from './message';
import type { EmergencyEvent, LocationFix } from './types';

const fix = (over: Partial<LocationFix> = {}): LocationFix => ({
  lat: 12.9716,
  lng: 77.5946,
  accuracyM: 12,
  capturedAt: Date.now() - 30_000,
  source: 'GPS',
  ...over,
});

const event = (over: Partial<EmergencyEvent> = {}): EmergencyEvent => ({
  id: 'e1',
  type: 'PERSONAL_SAFETY',
  createdAt: Date.now(),
  status: 'ACTIVE',
  ...over,
});

describe('emergency message', () => {
  it('includes type, time, location and freshness', () => {
    const msg = buildEmergencyMessage({ event: event({ location: fix() }) });
    expect(msg).toContain('SOS ALERT: HELP NEEDED');
    expect(msg).toContain('Emergency type: personal safety');
    expect(msg).toContain('Location: 12.97160, 77.59460');
    expect(msg).toContain('captured 30s ago');
    expect(msg).toContain(mapsLink(fix()));
    expect(msg).toContain('Please contact the user');
  });

  it('is honest when location is missing', () => {
    const msg = buildEmergencyMessage({ event: event({ location: null }) });
    expect(msg).toContain('Location: unavailable at time of alert');
  });

  it('marks stale fixes explicitly', () => {
    const line = formatLocationLine(fix({ capturedAt: Date.now() - 40 * 60_000 }));
    expect(line).toContain('STALE');
  });

  it('includes the note when present', () => {
    const msg = buildEmergencyMessage({ event: event({ note: 'Following a stalker' }) });
    expect(msg).toContain('Note: Following a stalker');
  });

  it('greets the contact by name when provided', () => {
    const msg = buildEmergencyMessage({
      event: event(),
      contact: { id: 'c1', name: 'Mom', phone: '+911234567890', consent: 'CONSENTED', priority: 0, channels: [], createdAt: 0 },
    });
    expect(msg).toContain('Hi Mom,');
  });
});
