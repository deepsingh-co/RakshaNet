import { ShieldAlert, PhoneCall } from 'lucide-react';

interface PortalFooterProps {
  onNavigate: (module: string) => void;
  onOpenSos: () => void;
}

export function PortalFooter({ onNavigate, onOpenSos }: PortalFooterProps) {
  return (
    <footer className="border-t border-rose-100 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Mission */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white shadow">
                <ShieldAlert className="size-5" />
              </div>
              <span className="text-xl font-black text-white">
                Raksha<span className="text-rose-500">Net</span> EmpowerHer
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              A holistic ecosystem empowering women through education, dignified employment opportunities,
              pro-bono legal support, confidential mental wellness, financial independence tools, and proactive
              offline-first safety networks.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={onOpenSos}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-red-700"
              >
                <ShieldAlert className="size-4" /> Trigger Emergency SOS
              </button>
              <a
                href="#/offline-sos"
                className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Offline SOS PWA
              </a>
            </div>
          </div>

          {/* Core Modules 1 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Education &amp; Career</h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('education')} className="hover:text-rose-400">
                  Course Catalog &amp; Quizzes
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('jobs')} className="hover:text-rose-400">
                  Curated Job Board
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('jobs')} className="hover:text-rose-400">
                  AI Skill Matching
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('community')} className="hover:text-rose-400">
                  1-on-1 Mentorship Matching
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('finance')} className="hover:text-rose-400">
                  Women Schemes &amp; Loans
                </button>
              </li>
            </ul>
          </div>

          {/* Core Modules 2 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Health &amp; Rights</h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('legal')} className="hover:text-rose-400">
                  Know Your Rights &amp; Acts
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('legal')} className="hover:text-rose-400">
                  Pro-Bono Legal Aid Directory
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('mental-health')} className="hover:text-rose-400">
                  Free Confidential Counseling
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('health')} className="hover:text-rose-400">
                  Verified Doctor Directory
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('safety')} className="hover:text-rose-400">
                  Anonymous Incident Report
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Emergency Numbers */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">24x7 Helplines (Toll-Free)</h4>
            <div className="mt-3 space-y-2 text-xs">
              <a href="tel:112" className="flex items-center gap-1.5 text-slate-300 hover:text-white">
                <PhoneCall className="size-3 text-red-400" />
                <span>National Emergency: <strong>112</strong></span>
              </a>
              <a href="tel:1091" className="flex items-center gap-1.5 text-slate-300 hover:text-white">
                <PhoneCall className="size-3 text-rose-400" />
                <span>Women in Distress: <strong>1091</strong></span>
              </a>
              <a href="tel:181" className="flex items-center gap-1.5 text-slate-300 hover:text-white">
                <PhoneCall className="size-3 text-purple-400" />
                <span>Domestic Violence: <strong>181</strong></span>
              </a>
              <a href="tel:1098" className="flex items-center gap-1.5 text-slate-300 hover:text-white">
                <PhoneCall className="size-3 text-amber-400" />
                <span>Childline Support: <strong>1098</strong></span>
              </a>
              <a href="tel:1930" className="flex items-center gap-1.5 text-slate-300 hover:text-white">
                <PhoneCall className="size-3 text-blue-400" />
                <span>Cyber Financial Fraud: <strong>1930</strong></span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between border-t border-slate-800 pt-6 text-[11px] text-slate-500 sm:flex-row">
          <p>© 2026 RakshaNet · Designed for Women Safety, Growth &amp; Dignity.</p>
          <div className="mt-3 flex items-center gap-4 sm:mt-0">
            <span>Built with React, TypeScript &amp; Tailwind CSS</span>
            <span>•</span>
            <a href="#/features" className="text-rose-400 hover:underline">
              Advanced Safety Lab
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
