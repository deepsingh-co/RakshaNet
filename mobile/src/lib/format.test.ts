import { describe, expect, it } from 'vitest';
import {
  formatDelay,
  isActiveStatus,
  relationshipLabel,
  severityLabel,
  statusLabel,
  statusTone,
  syncStateLabel,
  typeLabel,
} from './format';

describe('format helpers', () => {
  it('explains offline delay in plain language', () => {
    expect(formatDelay(0)).toContain('online');
    expect(formatDelay(30)).toBe('30s late');
    expect(formatDelay(90)).toBe('2m late');
    expect(formatDelay(3 * 3600 + 15 * 60)).toBe('3h 15m late');
  });

  it('labels incident states', () => {
    expect(statusLabel('PENDING_SYNC')).toBe('Pending sync');
    expect(statusLabel('DELIVERY_FAILED')).toBe('Delivery failed');
    expect(severityLabel('CRITICAL')).toBe('Critical');
    expect(typeLabel('SOS')).toBe('SOS button');
    expect(relationshipLabel('MOTHER')).toBe('Mother');
    expect(syncStateLabel('SYNC_FAILED')).toBe('Sync failed');
  });

  it('uses red only for dangerous states', () => {
    expect(statusTone('DELIVERY_FAILED')).toBe('red');
    expect(statusTone('ESCALATED')).toBe('orange');
    expect(statusTone('RESOLVED')).toBe('green');
    expect(statusTone('CANCELLED')).toBe('slate');
  });

  it('knows which statuses still need attention', () => {
    expect(isActiveStatus('NOTIFIED')).toBe(true);
    expect(isActiveStatus('PENDING_SYNC')).toBe(true);
    expect(isActiveStatus('RESOLVED')).toBe(false);
    expect(isActiveStatus('CANCELLED')).toBe(false);
  });
});
