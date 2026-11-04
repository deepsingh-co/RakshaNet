import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { formatTime, initials } from '../lib/format';
import { Icon, type IconName } from './Icons';
import { RoleBadge } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: 'Monitor',
    items: [
      { to: '/', label: 'Overview', icon: 'overview', end: true },
      { to: '/incidents', label: 'Live Incidents', icon: 'siren' },
      { to: '/map', label: 'Live Map', icon: 'map' },
      { to: '/history', label: 'Incident History', icon: 'history' },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/users', label: 'Users & Roles', icon: 'users', adminOnly: true },
      { to: '/guardians', label: 'Guardians & Children', icon: 'family' },
      { to: '/contacts', label: 'Trusted Contacts', icon: 'contacts' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/notifications', label: 'Notifications', icon: 'bell' },
      { to: '/analytics', label: 'Analytics & Reports', icon: 'chart' },
      { to: '/audit', label: 'Audit Logs', icon: 'audit', adminOnly: true },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/settings', label: 'Settings', icon: 'settings' }],
  },
];

function currentTitle(pathname: string): string {
  const match = [...NAV.flatMap((section) => section.items)]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  return match?.label ?? 'Overview';
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { connected, socketId } = useRealtime();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const isAdmin = user?.role === 'ADMIN';
  const title = currentTitle(location.pathname);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {navOpen ? (
        <button
          type="button"
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${navOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="shield" size={22} />
          </span>
          <div>
            <strong>SURAKSHA AI</strong>
            <span>Command Center</span>
          </div>
          <button
            type="button"
            className="icon-btn sidebar-close"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="nav">
          {NAV.map((section) => (
            <div className="nav-section" key={section.title}>
              <p className="nav-section-title">{section.title}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                  {item.adminOnly && !isAdmin ? (
                    <span className="nav-lock" title="Administrator access required">
                      <Icon name="lock" size={13} />
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`connection-pill ${connected ? 'is-online' : 'is-offline'}`}>
            <span className="connection-dot" aria-hidden="true" />
            <span>{connected ? 'Live connection' : 'Reconnecting'}</span>
          </div>
          <p className="sidebar-meta">
            {connected && socketId
              ? `Socket ${socketId.slice(0, 6)}…`
              : 'Trying to restore realtime link'}
          </p>
          <p className="sidebar-meta">SURAKSHA AI · v0.1</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-btn menu-btn"
              aria-label="Open navigation"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <Icon name="menu" size={20} />
            </button>
            <div>
              <p className="topbar-title">{title}</p>
              <p className="topbar-date">
                {now.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                <span className="topbar-time"> · {formatTime(now)}</span>
              </p>
            </div>
          </div>

          <div className="topbar-right">
            <span
              className={`live-chip ${connected ? 'is-online' : 'is-offline'}`}
              title={connected ? 'Socket.IO connected for live updates' : 'No realtime connection'}
            >
              <Icon name={connected ? 'wifi' : 'wifi-off'} size={15} />
              <span>{connected ? 'Live' : 'Offline'}</span>
            </span>
            {user ? (
              <div className="user-chip">
                <span className="avatar avatar-small">{initials(user.fullName)}</span>
                <div className="user-chip-text">
                  <strong>{user.fullName}</strong>
                  <RoleBadge role={user.role} />
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Sign out"
                  title="Sign out"
                  disabled={loggingOut}
                  onClick={() => void handleLogout()}
                >
                  <Icon name="logout" size={17} />
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main id="main-content" className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
