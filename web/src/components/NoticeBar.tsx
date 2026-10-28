import { useEvents } from '../store/eventsStore';

/** Attention notice — amber, calm, dismissible. */
export function NoticeBar() {
  const notice = useEvents((s) => s.notice);
  const setNotice = useEvents((s) => s.setNotice);
  if (!notice) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-amber-200 bg-warn-soft px-4 py-2.5 text-sm text-warn"
    >
      <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" />
      </svg>
      <span className="flex-1">{notice}</span>
      <button
        onClick={() => setNotice(null)}
        className="rounded px-2 py-0.5 text-warn/70 hover:bg-amber-100"
        aria-label="Dismiss notice"
      >
        ✕
      </button>
    </div>
  );
}
