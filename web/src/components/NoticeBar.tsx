import { useEvents } from '../store/eventsStore';

export function NoticeBar() {
  const notice = useEvents((s) => s.notice);
  const setNotice = useEvents((s) => s.setNotice);
  if (!notice) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-amber-900/60 bg-amber-950/60 px-4 py-2 text-sm text-amber-200"
    >
      <span className="flex-1">{notice}</span>
      <button
        onClick={() => setNotice(null)}
        className="rounded px-2 py-0.5 text-amber-300 hover:bg-amber-900/60"
        aria-label="Dismiss notice"
      >
        ✕
      </button>
    </div>
  );
}
