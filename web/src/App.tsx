import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { SosScreen } from './features/sos/SosScreen';
import { ContactsScreen } from './features/contacts/ContactsScreen';
import { HistoryScreen } from './features/history/HistoryScreen';
import { EventDetailScreen } from './features/history/EventDetailScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { NoticeBar } from './components/NoticeBar';
import { OfflineBadge } from './components/OfflineBadge';
import { FloatingSos } from './components/FloatingSos';

const TABS = [
  { to: '/', label: 'SOS', icon: SosIcon, end: true },
  { to: '/contacts', label: 'Contacts', icon: ContactsIcon },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  return (
    <HashRouter>
      <div className="mx-auto flex h-full max-w-lg flex-col">
        <header className="flex items-center justify-between border-b border-line bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-brand" aria-hidden>
              <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
              </svg>
            </span>
            <div>
              <h1 className="text-base font-bold leading-tight text-ink">RakshaNet</h1>
              <p className="text-[11px] leading-tight text-ink-faint">Safety, even offline</p>
            </div>
          </div>
          <OfflineBadge />
        </header>

        <NoticeBar />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24">
          <Routes>
            <Route path="/" element={<SosScreen />} />
            <Route path="/contacts" element={<ContactsScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="/history/:id" element={<EventDetailScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </main>

        <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-lg border-t border-line bg-card/95 backdrop-blur">
          <ul className="grid grid-cols-4">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                      isActive ? 'font-semibold text-brand' : 'text-ink-soft'
                    }`
                  }
                >
                  <Icon className="size-5" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <FloatingSos />
      </div>
    </HashRouter>
  );
}

type IconProps = { className?: string };

function SosIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
      <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

function ContactsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .9 3 2.6 3 5.5" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}
