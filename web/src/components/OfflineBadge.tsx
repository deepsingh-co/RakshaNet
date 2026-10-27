import { useEffect, useState } from 'react';

/** Honest connectivity indicator — WhatsApp needs it, SMS does not. */
export function OfflineBadge() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        online ? 'bg-slate-800 text-slate-300' : 'bg-amber-950 text-amber-300'
      }`}
      title={
        online
          ? 'Online — WhatsApp hand-off available'
          : 'Offline — alerts will queue; SMS still works with cellular service'
      }
    >
      <span
        className={`size-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`}
        aria-hidden
      />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
