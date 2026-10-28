import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useEvents } from '../../store/eventsStore';
import { formatTime } from '../../domain/message';
import type { EventStatus } from '../../domain/types';

const EVENT_BADGE: Record<EventStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-brand-soft text-brand' },
  RESOLVED: { label: 'Resolved', cls: 'bg-safe-soft text-safe' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-ink-soft' },
};

export function HistoryScreen() {
  const { events, deliveries, load, loading } = useEvents();

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && events.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-faint">Loading…</p>;
  }

  if (events.length === 0) {
    return (
      <div className="card border-dashed p-10 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100">
          <svg className="size-6 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-ink">No events yet</p>
        <p className="mt-1 text-sm text-ink-soft">Your SOS alerts will appear here.</p>
        <Link to="/" className="btn btn-primary mt-4 inline-block px-4 py-2 text-sm">
          Go to SOS screen
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-ink">History</h1>
      <ul className="space-y-3">
        {events.map((e) => {
          const rows = deliveries.filter((d) => d.eventId === e.id);
          const sent = rows.filter((d) => d.status === 'SENT' || d.status === 'ACKNOWLEDGED').length;
          const badge = EVENT_BADGE[e.status];
          return (
            <li key={e.id}>
              <Link
                to={`/history/${e.id}`}
                className="card block p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize text-ink">
                    {e.type.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{formatTime(e.createdAt)}</p>
                <p className="mt-1.5 text-xs text-ink-faint">
                  {rows.length === 0
                    ? 'No delivery attempts'
                    : `${sent}/${rows.length} sent · ${rows.filter((d) => d.status === 'HANDED_OFF').length} awaiting send`}
                  {e.location ? ' · location ✓' : ' · no location'}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
