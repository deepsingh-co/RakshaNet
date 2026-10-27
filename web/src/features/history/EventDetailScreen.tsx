import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEvents } from '../../store/eventsStore';
import { formatTime } from '../../domain/message';
import { LocationCard } from '../sos/LocationCard';
import { DeliveryList } from '../sos/DeliveryList';

export function EventDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { events, load } = useEvents();

  useEffect(() => {
    void load();
  }, [load]);

  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-slate-400">Event not found.</p>
        <Link to="/history" className="text-sm font-semibold text-red-400">
          Back to history
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/history" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← History
      </Link>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold capitalize text-slate-100">
            {event.type.replace(/_/g, ' ').toLowerCase()}
          </h1>
          <span className="text-xs text-slate-400">{event.status}</span>
        </div>
        <p className="mt-1 text-sm text-slate-400">{formatTime(event.createdAt)}</p>
        {event.note && <p className="mt-2 text-sm text-slate-300">Note: {event.note}</p>}
      </div>

      <LocationCard event={event} />
      <DeliveryList eventId={event.id} />
    </div>
  );
}
