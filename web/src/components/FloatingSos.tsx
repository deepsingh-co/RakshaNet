import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEvents } from '../store/eventsStore';

const HOLD_MS = 900;

/**
 * Floating SOS — visible on every screen except home, so help is never
 * more than one hold away. Same hold-to-confirm as the main button:
 * no accidental triggers in a pocket or bag.
 */
export function FloatingSos() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { trigger, alarmActive, events } = useEvents();

  const [holding, setHolding] = useState(false);
  const [firing, setFiring] = useState(false);
  const holdStart = useRef(0);

  const activeEvent = events.find((e) => e.status === 'ACTIVE');
  const hide = pathname === '/' || alarmActive || !!activeEvent || firing;

  const fire = async () => {
    setFiring(true);
    try {
      const id = await trigger({ type: 'PERSONAL_SAFETY' });
      navigate(`/history/${id}`);
    } finally {
      setFiring(false);
    }
  };

  const start = () => {
    if (firing) return;
    holdStart.current = Date.now();
    setHolding(true);
  };

  const stop = () => setHolding(false);

  useEffect(() => {
    if (!holding) return;
    const t = setInterval(() => {
      if (Date.now() - holdStart.current >= HOLD_MS) {
        setHolding(false);
        void fire();
      }
    }, 80);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);

  if (hide) return null;

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      disabled={firing}
      aria-label={`Hold for ${HOLD_MS / 1000} seconds to trigger SOS from anywhere`}
      title={`Hold ${HOLD_MS / 1000}s for SOS`}
      className={`sos-button fixed right-4 bottom-20 z-40 flex size-16 select-none items-center justify-center rounded-full border-[4px] border-white text-sm font-black tracking-wider text-white shadow-[0_6px_24px_rgb(220_38_38/0.5)] transition-all active:scale-95 ${
        holding ? 'bg-brand-deep ring-4 ring-red-200' : 'bg-brand'
      }`}
    >
      {holding ? '…' : 'SOS'}
    </button>
  );
}
