import { Link, Outlet } from 'react-router-dom';
import './theme.css';

/**
 * Full-width shell for the imported advanced feature pages.
 *
 * Deliberately separate from the mobile SOS shell: these pages are dense and
 * desktop-oriented, and several are demo previews. The notice below is always
 * visible so no one mistakes demo data for a live service.
 */
export function AdvancedLayout() {
  return (
    <div className="vasudra">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05060f]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="glass-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <svg
                className="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              RakshaNet
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">Advanced safety lab</p>
              <p className="truncate text-[11px] text-slate-400">
                Imported feature modules
              </p>
            </div>
          </div>
          <span className="glass-chip shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
            Preview
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div
          role="note"
          className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-100"
        >
          <strong className="font-bold">Demo data, not a live service.</strong> These
          modules are UI integrations. The pods, mesh, blockchain, safe-ride,
          voice-code and AI-service backends are not part of RakshaNet, so those
          modules fall back to local demo data. Only your RakshaNet session name is
          real here. Nothing on this page creates an incident or alerts a contact.
        </div>

        <Outlet />
      </div>
    </div>
  );
}
