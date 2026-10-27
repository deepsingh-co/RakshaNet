import { describe, expect, it } from 'vitest';
import {
  IllegalTransitionError,
  advance,
  canAdvance,
  isTerminal,
} from './deliveryMachine';
import type { DeliveryStatus } from './types';

const ALL: DeliveryStatus[] = [
  'QUEUED',
  'HANDED_OFF',
  'SENT',
  'FAILED',
  'ACKNOWLEDGED',
];

describe('delivery state machine', () => {
  it('allows the honest happy path', () => {
    let s: DeliveryStatus = 'QUEUED';
    s = advance(s, 'HANDED_OFF'); // intent opened — NOT sent
    s = advance(s, 'SENT'); // user confirms they pressed send
    s = advance(s, 'ACKNOWLEDGED'); // recipient explicitly acks
    expect(s).toBe('ACKNOWLEDGED');
    expect(isTerminal(s)).toBe(true);
  });

  it('allows offline queue → hand-off once a channel exists', () => {
    expect(advance('QUEUED', 'HANDED_OFF')).toBe('HANDED_OFF');
  });

  it('allows retry: FAILED → QUEUED', () => {
    expect(advance('FAILED', 'QUEUED')).toBe('QUEUED');
  });

  it('allows abandoning a hand-off: HANDED_OFF → QUEUED', () => {
    expect(advance('HANDED_OFF', 'QUEUED')).toBe('QUEUED');
  });

  it('allows failure from QUEUED and HANDED_OFF', () => {
    expect(advance('QUEUED', 'FAILED')).toBe('FAILED');
    expect(advance('HANDED_OFF', 'FAILED')).toBe('FAILED');
  });

  it('REJECTS skipping HANDED_OFF (never claim sent without hand-off)', () => {
    expect(() => advance('QUEUED', 'SENT')).toThrow(IllegalTransitionError);
  });

  it('REJECTS acknowledging without being sent', () => {
    expect(() => advance('QUEUED', 'ACKNOWLEDGED')).toThrow(IllegalTransitionError);
    expect(() => advance('HANDED_OFF', 'ACKNOWLEDGED')).toThrow(
      IllegalTransitionError,
    );
    expect(() => advance('FAILED', 'ACKNOWLEDGED')).toThrow(IllegalTransitionError);
  });

  it('REJECTS going backwards from SENT', () => {
    expect(() => advance('SENT', 'HANDED_OFF')).toThrow(IllegalTransitionError);
    expect(() => advance('SENT', 'QUEUED')).toThrow(IllegalTransitionError);
    expect(() => advance('SENT', 'FAILED')).toThrow(IllegalTransitionError);
  });

  it('ACKNOWLEDGED is terminal — no transitions out', () => {
    for (const to of ALL) {
      expect(canAdvance('ACKNOWLEDGED', to)).toBe(false);
    }
  });

  it('every transition is symmetric with canAdvance', () => {
    for (const from of ALL) {
      for (const to of ALL) {
        if (canAdvance(from, to)) {
          expect(() => advance(from, to)).not.toThrow();
        } else {
          expect(() => advance(from, to)).toThrow(IllegalTransitionError);
        }
      }
    }
  });
});
