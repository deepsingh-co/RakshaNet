import { useEffect, useState } from 'react';

/**
 * Honest connectivity indicator.
 *  Online (green)  — WhatsApp alerts can be handed off
 *  Offline (amber) — alerts queue locally; SMS still works with cellular
 */
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
        online ? 'bg-safe-soft text-safe' : 'bg-warn-soft text-warn'
      }`}
      title={
        online
          ? 'Online — WhatsApp alerts can be prepared'
          : 'Offline — alerts are saved and queued. SMS still works with cellular service.'
      }
    >
      <span
        className={`size-2 rounded-full ${online ? 'bg-safe' : 'bg-warn'}`}
        aria-hidden
      />
      {online ? 'Online' : 'Offline · SMS works'}
    </span>
  );
}
