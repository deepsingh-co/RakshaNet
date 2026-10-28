import type { DeliveryStatus } from '../domain/types';
import { STATUS_DESCRIPTIONS, STATUS_LABELS } from '../domain/deliveryMachine';

/*
  Chip colors follow the design language:
    safe (green) = sent/acknowledged · warn (amber) = prepared, waiting for you
    danger (red) = failed · neutral = queued
*/
const STYLES: Record<DeliveryStatus, string> = {
  QUEUED: 'bg-slate-100 text-ink-soft',
  HANDED_OFF: 'bg-warn-soft text-warn ring-1 ring-amber-300',
  SENT: 'bg-safe-soft text-safe',
  FAILED: 'bg-brand-soft text-brand ring-1 ring-red-300',
  ACKNOWLEDGED: 'bg-info-soft text-info',
};

/**
 * Status chip with an honest tooltip — "Prepared" never reads as "Sent".
 */
export function StatusChip({ status, detailed = false }: { status: DeliveryStatus; detailed?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STYLES[status]}`}
      title={STATUS_DESCRIPTIONS[status]}
    >
      {STATUS_LABELS[status]}
      {detailed && status === 'HANDED_OFF' ? ' — press send' : ''}
    </span>
  );
}

/*
  Note: "Prepared" (HANDED_OFF) deliberately never says "Sent" —
  the messaging app was opened, but the user must still press send.
*/
