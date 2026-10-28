import { useEffect } from 'react';
import { useEvents } from '../../store/eventsStore';
import { useContacts } from '../../store/contactsStore';
import { StatusChip } from '../../components/StatusChip';
import type { ChannelDelivery } from '../../domain/types';

/**
 * Per-contact, per-channel delivery matrix — the honest status surface.
 * Every row shows exactly what happened; "Prepared" always explains that
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
      <section className="card p-4 text-sm text-ink-soft">
        No delivery targets — add a consented contact with at least one channel.
      </section>
    );
  }

  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
        Alert delivery
      </h2>
      <ul className="divide-y divide-line">
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
        <p className="truncate text-sm font-semibold text-ink">
          {contactName} <span className="font-normal text-ink-faint">· {channelLabel}</span>
        </p>
        {row.error && row.status === 'FAILED' && (
          <p className="text-xs text-brand">{row.error}</p>
        )}
        {row.status === 'HANDED_OFF' && row.channel === 'CALL' && (
          <p className="text-xs text-warn">Call screen opened — place the call to connect.</p>
        )}
        {row.status === 'HANDED_OFF' && row.channel !== 'CALL' && (
          <p className="text-xs text-warn">Message prepared — press send in the app.</p>
        )}
      </div>

      <StatusChip status={row.status} />

      <div className="flex w-full gap-2 sm:w-auto">
        {row.status === 'QUEUED' && <Action onClick={onSend}>{row.channel === 'CALL' ? 'Call' : 'Send'}</Action>}
        {row.status === 'HANDED_OFF' && (
          <>
            <Action onClick={onConfirm} tone="success">
              {row.channel === 'CALL' ? 'Call connected' : 'I sent it'}
            </Action>
            <Action onClick={onFail} tone="muted">
              Failed
            </Action>
          </>
        )}
        {row.status === 'FAILED' && <Action onClick={onRetry}>Retry</Action>}
        {row.status === 'SENT' && (
          <Action onClick={onAck} tone="info">
            Mark acknowledged
          </Action>
        )}
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
    primary: 'btn btn-primary',
    success: 'btn bg-safe text-white hover:bg-emerald-700',
    muted: 'btn btn-quiet',
    info: 'btn bg-info text-white hover:bg-sky-700',
  };
  return (
    <button type="button" onClick={onClick} className={`${tones[tone]} px-3 py-1.5 text-xs`}>
      {children}
    </button>
  );
}
