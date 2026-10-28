import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvents } from '../../store/eventsStore';
import { EMERGENCY_TYPES, type EmergencyType } from '../../domain/types';
import { StopAlarmButton, Summary } from './StopAlarmButton';
import { DeliveryList } from './DeliveryList';
import { LocationCard } from './LocationCard';
import { ProtectionStatus } from './ProtectionStatus';

const HOLD_MS = 900;

export function SosScreen() {
  const navigate = useNavigate();
  const { trigger, alarmActive, events, deliveries } = useEvents();

  const [type, setType] = useState<EmergencyType>('PERSONAL_SAFETY');
  const [note, setNote] = useState('');
  const [holding, setHolding] = useState(false);
  const [firing, setFiring] = useState(false);

  const holdStart = useRef(0);
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
    const rows = event ? deliveries.filter((d) => d.eventId === event.id) : [];
    const sentCount = rows.filter((r) => r.status === 'SENT' || r.status === 'ACKNOWLEDGED').length;
    const preparedCount = rows.filter((r) => r.status === 'HANDED_OFF').length;
    const pendingCount = rows.filter((r) => r.status === 'QUEUED' || r.status === 'FAILED').length;

    return (
      <div className="space-y-4">
        {/* Status header — live, unmistakable */}
        <div className="overflow-hidden rounded-2xl border-2 border-brand bg-brand-soft">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
              <span className="relative inline-flex size-3 rounded-full bg-brand" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-brand">SOS active</p>
              <p className="text-xs text-brand/85">Alarm on · help is being requested</p>
            </div>
          </div>

          {/* One-line summary — how many alerts reached out */}
          {rows.length > 0 && (
            <div className="flex divide-x divide-red-200 border-t border-red-200 bg-white/60 text-center">
              <Summary n={sentCount} label="sent" tone="text-safe" />
              <Summary n={preparedCount} label="prepared" tone="text-warn" />
              <Summary n={pendingCount} label="pending" tone="text-ink-soft" />
            </div>
          )}
        </div>

        {/* Primary action first — stop when safe */}
        <StopAlarmButton eventId={event?.id} big />

        {event && (
          <>
            <DeliveryList eventId={event.id} />
            <LocationCard event={event} />
          </>
        )}

        <Link
          to="/contacts"
          className="btn btn-quiet block w-full px-4 py-3 text-center text-sm"
        >
          Manage contacts
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-2">
      <ProtectionStatus />

      {/* 1. Clear instruction first — read, then act */}
      <div className="w-full text-center">
        <p className="text-lg font-bold leading-snug text-ink">In danger?</p>
        <p className="mt-1 text-sm text-ink-soft">
          Press and hold the red button for {HOLD_MS / 1000} seconds.
        </p>
      </div>

      {/* 2. The one action that matters */}
      <div className="relative">
        {holding && <span className="pulse-ring absolute inset-0 rounded-full" aria-hidden />}
        <button
          type="button"
          className={`sos-button relative flex size-56 select-none flex-col items-center justify-center rounded-full border-[7px] border-white shadow-[0_12px_40px_rgb(220_38_38/0.45)] transition-all active:scale-95 ${
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
          <span className="text-6xl font-black tracking-widest text-white">SOS</span>
          <span className="mt-1.5 text-xs font-semibold text-white/90">
            {firing ? 'Starting…' : holding ? 'Keep holding…' : 'Hold to alert'}
          </span>
        </button>
      </div>

      {/* 3. What will happen — in plain words */}
      <ul className="w-full space-y-2 rounded-2xl bg-card p-4 ring-1 ring-line">
        {[
          ['🔔', 'A loud alarm starts'],
          ['💾', 'Your alert is saved — works without internet'],
          ['📤', 'WhatsApp & SMS messages are prepared for you to send'],
        ].map(([emoji, text]) => (
          <li key={text} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-soft">
            <span aria-hidden>{emoji}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      {/* 4. Optional details — secondary, tucked below */}
      <details className="w-full rounded-2xl bg-card ring-1 ring-line open:rounded-b-2xl">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink-soft">
          Add details (optional)
        </summary>
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
          <fieldset>
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

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Note
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. description of threat"
              maxLength={200}
              className="input"
            />
          </label>
        </div>
      </details>
    </div>
  );
}
