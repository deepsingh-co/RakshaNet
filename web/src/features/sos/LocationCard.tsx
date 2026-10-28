import { formatAge, locationFreshness, type EmergencyEvent } from '../../domain/types';
import { mapsLink } from '../../domain/message';
import { useEvents } from '../../store/eventsStore';
import { requestFreshFix } from '../../services/location';

/** Always shows freshness — stale location is labeled, never hidden. */
export function LocationCard({ event }: { event: EmergencyEvent }) {
  const { events, setNotice } = useEvents();
  const fresh = events.find((e) => e.id === event.id) ?? event;
  const fix = fresh.location;

  const refresh = async () => {
    const next = await requestFreshFix();
    setNotice(next ? 'Location updated.' : 'Could not get a location fix.');
  };

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Location</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs font-semibold text-info hover:underline"
        >
          Refresh fix
        </button>
      </div>
      {fix ? (
        (() => {
          const { fresh: isFresh, ageMs } = locationFreshness(fix);
          return (
            <div className="mt-2 space-y-1">
              <p className="font-mono text-sm font-medium text-ink">
                {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
                <span className="ml-2 font-sans text-ink-faint">±{Math.round(fix.accuracyM)}m</span>
              </p>
              <p className={`text-xs font-medium ${isFresh ? 'text-safe' : 'text-warn'}`}>
                {isFresh ? '● Fresh' : '● Stale'} · captured {formatAge(ageMs)} · {fix.source}
              </p>
              <a
                href={mapsLink(fix)}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-semibold text-info hover:underline"
              >
                Open in maps ↗
              </a>
            </div>
          );
        })()
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          Location unavailable — the alert still goes out without coordinates.
        </p>
      )}
    </section>
  );
}
