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
  const [firing, setFiring] = useState(false);

  const holdStart = useRef(0);
  const consented = contacts.filter((c) => c.consent === 'CONSENTED');
  const activeEvent = events.find((e) => e.status === 'ACTIVE');

  const stopHold = () => {
    setHolding(false);
  };

  const checkHold = () => {
    if (Date.now() - holdStart.current >= HOLD_MS) {
      stopHold();
      void fire();
    }
  };

  const startHold = () => {
    if (firing || activeEvent) return;
    holdStart.current = Date.now();
    setHolding(true);
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

  // Poll while held (simpler + more reliable than rAF progress math).
  useEffect(() => {
    if (!holding) return;
    const t = setInterval(checkHold, 80);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);

  // Keyboard accessibility: hold Space/Enter on the focused button.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      startHold();
      setTimeout(checkHold, HOLD_MS);
    }
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') stopHold();
  };

  if (activeEvent || alarmActive) {
    const event = activeEvent ?? events[0];
    return (
      <div className="space-y-4">
        <div className="card border-red-200 bg-brand-soft p-4">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
            </span>
            SOS active
          </p>
          <p className="mt-1.5 text-sm text-brand/90">
            Alarm is on and your alert is being prepared for each trusted contact.
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
          <Link to="/contacts" className="btn btn-quiet flex-1 px-4 py-3 text-center text-sm">
            Manage contacts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 pt-2">
      {consented.length === 0 && (
        <div className="card w-full border-amber-200 bg-warn-soft p-3.5 text-sm text-warn">
          <p className="font-semibold">No trusted contacts yet</p>
          <p className="mt-0.5 text-warn/85">
            SOS still records the event and sounds the alarm —{' '}
            <Link to="/contacts" className="font-semibold underline">
              add a contact
            </Link>{' '}
            so alerts can be sent.
          </p>
        </div>
      )}

      {/* Emergency type */}
      <fieldset className="w-full">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
          What kind of help?
        </legend>
        <div className="flex flex-wrap gap-2">
          {EMERGENCY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={`btn rounded-full px-3.5 py-1.5 text-sm ${
                type === t.value
                  ? 'bg-brand text-white'
                  : 'border border-line-strong bg-white text-ink-soft hover:bg-page'
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
        className="input"
      />

      {/* Hold-to-trigger */}
      <div className="relative mt-2">
        {holding && <span className="pulse-ring absolute inset-0 rounded-full" aria-hidden />}
        <button
          type="button"
          className={`sos-button relative flex size-52 select-none flex-col items-center justify-center rounded-full border-[6px] border-white shadow-[0_10px_35px_rgb(220_38_38/0.4)] transition-all active:scale-95 ${
            holding ? 'bg-brand-deep' : 'bg-brand'
          }`}
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
          <span className="mt-1 text-xs font-semibold text-white/90">
            {firing ? 'Starting…' : `Hold ${HOLD_MS / 1000}s to alert`}
          </span>
        </button>
      </div>

      <p className="max-w-xs text-center text-xs leading-relaxed text-ink-faint">
        Works offline. Triggering saves the alert locally, sounds an alarm, then prepares
        WhatsApp/SMS messages for you to send.
      </p>
    </div>
  );
}
