import { useEffect } from 'react';
import { useEvents } from '../../store/eventsStore';
import { useContacts } from '../../store/contactsStore';
import { StatusChip } from '../../components/StatusChip';
import type { ChannelDelivery } from '../../domain/types';

/**
 * Per-contact, per-channel delivery matrix — the honest status surface.
 * Every row shows exactly what happened; HANDED_OFF always explains that
 * the user must still press send.
 */
export function DeliveryList({ eventId }: { eventId: string }) {
  const { deliveries, attempt, confirmSent, markFailed, retry, acknowledge, load } = useEvents();
  const contacts = useContacts((s) => s.contacts);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const rows = deliveries.filter((d) => d.eventId === eventId);
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        No delivery targets — add a consented contact with at least one channel.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900">
      <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-300">
        Alert delivery
      </h2>
      <ul className="divide-y divide-slate-800">
        {rows.map((row) => (
          <DeliveryRow
            key={row.id}
            row={row}
            contactName={contacts.find((c) => c.id === row.contactId)?.name ?? 'Unknown'}
            onSend={() => void attempt(row.id)}
            onConfirm={() => void confirmSent(row.id)}
            onFail={() => void markFailed(row.id)}
            onRetry={() => void retry(row.id)}
            onAck={() => void acknowledge(row.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function DeliveryRow({
  row,
  contactName,
  onSend,
  onConfirm,
  onFail,
  onRetry,
  onAck,
}: {
  row: ChannelDelivery;
  contactName: string;
  onSend: () => void;
  onConfirm: () => void;
  onFail: () => void;
  onRetry: () => void;
  onAck: () => void;
}) {
  const channelLabel = { WHATSAPP: 'WhatsApp', SMS: 'SMS', CALL: 'Call', SHARE: 'Share' }[row.channel];

  return (
    <li className="flex flex-wrap items-center gap-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">
          {contactName} <span className="text-slate-500">· {channelLabel}</span>
        </p>
        {row.error && row.status === 'FAILED' && (
          <p className="text-xs text-red-400">{row.error}</p>
        )}
        {row.status === 'HANDED_OFF' && (
          <p className="text-xs text-amber-400">Message prepared — press send in the app.</p>
        )}
      </div>

      <StatusChip status={row.status} />

      <div className="flex w-full gap-2 sm:w-auto">
        {row.status === 'QUEUED' && (
          <Action onClick={onSend}>Send</Action>
        )}
        {row.status === 'HANDED_OFF' && (
          <>
            <Action onClick={onConfirm} tone="success">
              I sent it
            </Action>
            <Action onClick={onFail} tone="muted">
              Failed
            </Action>
          </>
        )}
        {row.status === 'FAILED' && <Action onClick={onRetry}>Retry</Action>}
        {row.status === 'SENT' && <Action onClick={onAck} tone="info">Mark acknowledged</Action>}
      </div>
    </li>
  );
}

function Action({
  children,
  onClick,
  tone = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'primary' | 'success' | 'muted' | 'info';
}) {
  const tones = {
    primary: 'bg-red-700 text-white hover:bg-red-600',
    success: 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700',
    muted: 'bg-slate-800 text-slate-300 hover:bg-slate-700',
    info: 'bg-sky-800 text-sky-100 hover:bg-sky-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
