import { Link } from 'react-router-dom';

/**
 * The source project's wearables page links to a Google Fit vitals dashboard.
 * That module needs Google OAuth, recharts and a Google Fit sync service that
 * are not part of RakshaNet. Rather than fake vitals, say so plainly.
 */
export default function VitalsUnavailable() {
  return (
    <div className="glass-strong mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
        <svg
          className="size-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">Vitals dashboard not included</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        The wearable hub is available, but its Google Fit vitals view depends on a
        Google OAuth client and a sync service that RakshaNet does not have. No
        vitals are being read or invented.
      </p>
      <Link
        to="/features/wearables"
        className="mt-5 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
      >
        Back to wearables
      </Link>
    </div>
  );
}
