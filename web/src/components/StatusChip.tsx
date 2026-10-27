import type { DeliveryStatus } from '../domain/types';
import { STATUS_DESCRIPTIONS, STATUS_LABELS } from '../domain/deliveryMachine';

const STYLES: Record<DeliveryStatus, string> = {
  QUEUED: 'bg-slate-800 text-slate-300',
  HANDED_OFF: 'bg-amber-950 text-amber-300 ring-1 ring-amber-700',
  SENT: 'bg-emerald-950 text-emerald-300',
  FAILED: 'bg-red-950 text-red-300',
  ACKNOWLEDGED: 'bg-sky-950 text-sky-300',
};

/**
 * Status chip with an honest tooltip — HANDED_OFF never reads as "sent".
 */
export function StatusChip({ status, detailed = false }: { status: DeliveryStatus; detailed?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
      title={STATUS_DESCRIPTIONS[status]}
    >
      {STATUS_LABELS[status]}
      {detailed && status === 'HANDED_OFF' ? ' — press send in the app' : ''}
    </span>
  );
}
