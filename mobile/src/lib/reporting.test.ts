import { describe, expect, it } from 'vitest';
import { buildIncidentPayload, defaultDescription, HINGLISH_TEMPLATES } from './reporting';

const startedAt = '2026-01-01T10:00:00.000Z';

describe('Hinglish reporting copy', () => {
  it('ships ready-to-send Hinglish templates', () => {
    expect(HINGLISH_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    for (const template of HINGLISH_TEMPLATES) {
      expect(template.text.length).toBeGreaterThan(20);
      expect(template.label.length).toBeGreaterThan(3);
    }
  });

  it('has a Hinglish default for every incident type', () => {
    expect(defaultDescription('SOS')).toContain('madad');
    expect(defaultDescription('MANUAL')).toContain('madad');
    expect(defaultDescription('FALL_DETECTED')).toContain('Fall');
    expect(defaultDescription('VOICE_TRIGGER')).toContain('trigger');
  });

  it('builds an online payload without inventing a location', () => {
    const payload = buildIncidentPayload({
      clientIncidentId: 'client-1',
      type: 'SOS',
      severity: 'CRITICAL',
      startedAt,
      offlineCreated: false,
    });
    expect(payload.description).toBe(defaultDescription('SOS'));
    expect(payload.clientCreatedAt).toBe(startedAt);
    expect(payload.offlineCreated).toBe(false);
    expect(payload.location).toBeUndefined();
  });

  it('marks offline payloads and their captured location honestly', () => {
    const payload = buildIncidentPayload({
      clientIncidentId: 'client-2',
      type: 'MANUAL',
      severity: 'HIGH',
      description: '  Koi peeche aa raha hai  ',
      startedAt,
      offlineCreated: true,
      location: {
        lat: 19.07,
        lng: 72.87,
        source: 'CACHED',
        capturedAt: '2026-01-01T09:59:00.000Z',
      },
    });
    expect(payload.description).toBe('Koi peeche aa raha hai');
    expect(payload.offlineCreated).toBe(true);
    expect(payload.location?.offlineCaptured).toBe(true);
  });

  it('caps an oversized description instead of failing the whole alert', () => {
    const payload = buildIncidentPayload({
      clientIncidentId: 'client-3',
      type: 'SOS',
      severity: 'CRITICAL',
      description: 'x'.repeat(1000),
      startedAt,
      offlineCreated: false,
    });
    expect(payload.description).toHaveLength(500);
  });
});
