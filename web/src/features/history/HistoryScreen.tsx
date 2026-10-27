import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useEvents } from '../../store/eventsStore';
import { formatTime } from '../../domain/message';
import type { EventStatus } from '../../domain/types';

const EVENT_BADGE: Record<EventStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-red-950 text-red-300' },
  RESOLVED: { label: 'Resolved', cls: 'bg-emerald-950 text-emerald-300' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-800 text-slate-400' },
};

export function HistoryScreen() {
  const { events, deliveries, load, loading } = useEvents();

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && events.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
        <p className="text-sm text-slate-400">No events yet.</p>
        <Link to="/" className="mt-2 inline-block text-sm font-semibold text-red-400 hover:text-red-300">
          Go to SOS screen
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">History</h1>
      <ul className="space-y-3">
        {events.map((e) => {
          const rows = deliveries.filter((d) => d.eventId === e.id);
          const sent = rows.filter((d) => d.status === 'SENT' || d.status === 'ACKNOWLEDGED').length;
          const badge = EVENT_BADGE[e.status];
          return (
            <li key={e.id}>
              <Link
                to={`/history/${e.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">
                    {e.type.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{formatTime(e.createdAt)}</p>
                <p className="mt-1.5 text-xs text-slate-500">
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
