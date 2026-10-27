/**
 * Delivery state machine — the single source of truth for honest status.
 * Pure: no I/O, fully unit-tested. See docs/ARCHITECTURE.md §5.2.
 *
 * Invariants:
 *  - Only dispatch/confirm/retry flows may call `advance()`; UI cannot set status directly.
 *  - A channel hand-off (opening WhatsApp/SMS/share) yields HANDED_OFF, never SENT.
 *  - ACKNOWLEDGED requires an explicit recipient action — never inferred from time.
 *  - Illegal transitions throw IllegalTransitionError.
 */
import type { DeliveryStatus } from './types';

const TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  QUEUED: ['HANDED_OFF', 'FAILED'],
  HANDED_OFF: ['SENT', 'FAILED', 'QUEUED'],
  SENT: ['ACKNOWLEDGED'],
  FAILED: ['QUEUED'], // manual retry re-queues
  ACKNOWLEDGED: [],
};

export class IllegalTransitionError extends Error {
  constructor(
    readonly from: DeliveryStatus,
    readonly to: DeliveryStatus,
  ) {
    super(`Illegal delivery transition: ${from} → ${to}`);
    this.name = 'IllegalTransitionError';
  }
}

export function canAdvance(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Returns `to` or throws IllegalTransitionError. */
export function advance(from: DeliveryStatus, to: DeliveryStatus): DeliveryStatus {
  if (!canAdvance(from, to)) throw new IllegalTransitionError(from, to);
  return to;
}

export function isTerminal(status: DeliveryStatus): boolean {
  return status === 'ACKNOWLEDGED';
}

/** Human-readable, honest labels for the UI. */
export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  QUEUED: 'Queued',
  HANDED_OFF: 'Prepared — complete send',
  SENT: 'Sent',
  FAILED: 'Failed',
  ACKNOWLEDGED: 'Acknowledged',
};

export const STATUS_DESCRIPTIONS: Record<DeliveryStatus, string> = {
  QUEUED: 'Stored on this device. Not yet handed to any channel.',
  HANDED_OFF: 'Opened in the messaging app — the message is NOT sent until you press send.',
  SENT: 'Send confirmed.',
  FAILED: 'Could not be handed off. You can retry.',
  ACKNOWLEDGED: 'The recipient explicitly confirmed receipt.',
};
