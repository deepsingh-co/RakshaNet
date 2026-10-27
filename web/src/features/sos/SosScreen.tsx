import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvents } from '../../store/eventsStore';
import { useContacts } from '../../store/contactsStore';
import { EMERGENCY_TYPES, type EmergencyType } from '../../domain/types';
import { StopAlarmButton } from './StopAlarmButton';
import { DeliveryList } from './DeliveryList';
import { LocationCard } from './LocationCard';

const HOLD_MS = 900;

export function SosScreen() {
  const navigate = useNavigate();
  const { trigger, alarmActive, events } = useEvents();
  const contacts = useContacts((s) => s.contacts);

  const [type, setType] = useState<EmergencyType>('PERSONAL_SAFETY');
  const [note, setNote] = useState('');
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [firing, setFiring] = useState(false);

  const holdStart = useRef(0);
  const raf = useRef(0);
  const consented = contacts.filter((c) => c.consent === 'CONSENTED');
  const activeEvent = events.find((e) => e.status === 'ACTIVE');

  const stopHold = () => {
    setHolding(false);
    setProgress(0);
    cancelAnimationFrame(raf.current);
  };

  const tick = () => {
    const elapsed = Date.now() - holdStart.current;
    const pct = Math.min(1, elapsed / HOLD_MS);
    setProgress(pct);
    if (pct >= 1) {
      stopHold();
      void fire();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const startHold = () => {
    if (firing || activeEvent) return;
    holdStart.current = Date.now();
    setHolding(true);
    raf.current = requestAnimationFrame(tick);
  };

  const fire = async () => {
    setFiring(true);
    try {
      const id = await trigger({ type, note: note.trim() || undefined });
      setNote('');
      navigate(`/history/${id}`);
    } finally {
      setFiring(false);
    }
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Keyboard accessibility: hold Space/Enter on the focused button.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      startHold();
    }
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') stopHold();
  };

  if (activeEvent || alarmActive) {
    const event = activeEvent ?? events[0];
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-800 bg-red-950/50 p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-300">SOS active</p>
          <p className="mt-1 text-sm text-red-200">
            The alarm is sounding and your alert is being prepared for each trusted contact.
          </p>
        </div>

        {event && (
          <>
            <LocationCard event={event} />
            <DeliveryList eventId={event.id} />
          </>
        )}

        <div className="flex gap-3">
          <StopAlarmButton eventId={event?.id} />
          <Link
            to="/contacts"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Manage contacts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 pt-4">
      {consented.length === 0 && (
        <div className="w-full rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
          No trusted contacts yet. SOS still records the event and sounds the alarm —{' '}
          <Link to="/contacts" className="font-semibold underline">
            add a contact
          </Link>{' '}
          so alerts can be sent.
        </div>
      )}

      {/* Emergency type */}
      <fieldset className="w-full">
        <legend className="mb-2 text-sm font-medium text-slate-400">Emergency type</legend>
        <div className="flex flex-wrap gap-2">
          {EMERGENCY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={`rounded-full px-3 py-1.5 text-sm ${
                type === t.value
                  ? 'bg-red-700 font-semibold text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (e.g. description of threat)"
        maxLength={200}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-red-700 focus:outline-none"
      />

      {/* Hold-to-trigger */}
      <div className="relative mt-2">
        {holding && <span className="pulse-ring absolute inset-0 rounded-full" aria-hidden />}
        <button
          type="button"
          className={`sos-button relative flex size-52 select-none flex-col items-center justify-center rounded-full border-4 ${
            holding ? 'border-red-400 bg-red-700' : 'border-red-800 bg-red-600'
          } shadow-2xl transition-transform active:scale-95`}
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          disabled={firing}
          aria-label={`Hold for ${HOLD_MS / 1000} seconds to trigger SOS`}
        >
          <span className="text-5xl font-black tracking-widest text-white">SOS</span>
          <span className="mt-1 text-xs font-medium text-red-100">
            {firing ? 'Triggering…' : `Hold ${HOLD_MS / 1000}s to alert`}
          </span>
          {holding && (
            <span
              className="absolute inset-0 rounded-full border-4 border-white/70"
              style={{
                clipPath: `polygon(50% 50%, 50% 0, ${50 + 50 * Math.sin((progress * 2 * Math.PI) ) }% ${50 - 50 * Math.cos(progress * 2 * Math.PI)}%, 50% 50%)`,
                opacity: 0.6,
              }}
              aria-hidden
            />
          )}
        </button>
      </div>

      <p className="max-w-xs text-center text-xs text-slate-500">
        Works offline. Triggering saves the alert locally, sounds an alarm, then hands messages to
        WhatsApp/SMS for you to send.
      </p>
    </div>
  );
}
