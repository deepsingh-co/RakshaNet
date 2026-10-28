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
      <div className="card space-y-3 p-8 text-center">
        <p className="text-sm text-ink-soft">Event not found.</p>
        <Link to="/history" className="text-sm font-semibold text-brand hover:underline">
          Back to history
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/history" className="inline-block text-sm font-medium text-ink-soft hover:text-ink">
        ← History
      </Link>

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold capitalize text-ink">{event.type.replace(/_/g, ' ').toLowerCase()}</h1>
          <span className="text-xs font-medium text-ink-faint">{event.status}</span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{formatTime(event.createdAt)}</p>
        {event.note && <p className="mt-2 text-sm text-ink">Note: {event.note}</p>}
      </div>

      <LocationCard event={event} />
      <DeliveryList eventId={event.id} />
    </div>
  );
}
