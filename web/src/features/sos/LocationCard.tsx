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
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">Location</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs font-medium text-sky-400 hover:text-sky-300"
        >
          Refresh fix
        </button>
      </div>
      {fix ? (
        (() => {
          const { fresh: isFresh, ageMs } = locationFreshness(fix);
          return (
            <div className="mt-2 space-y-1">
              <p className="font-mono text-sm text-slate-100">
                {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
                <span className="ml-2 text-slate-400">±{Math.round(fix.accuracyM)}m</span>
              </p>
              <p className={`text-xs ${isFresh ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isFresh ? 'Fresh' : 'Stale'} · captured {formatAge(ageMs)} · {fix.source}
              </p>
              <a
                href={mapsLink(fix)}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-medium text-sky-400 hover:text-sky-300"
              >
                Open in maps ↗
              </a>
            </div>
          );
        })()
      ) : (
        <p className="mt-2 text-sm text-slate-400">
          Location unavailable — the alert is still sent without coordinates.
        </p>
      )}
    </section>
  );
}
