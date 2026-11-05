import { useState } from 'react';
import {
  ShieldAlert,
  GraduationCap,
  Briefcase,
  Scale,
  HeartPulse,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Bell,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { UserRole } from '../types';

interface PortalNavbarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  onOpenSos: () => void;
  onOpenProfile: () => void;
}

export function PortalNavbar({
  activeModule,
  setActiveModule,
  onOpenSos,
  onOpenProfile,
}: PortalNavbarProps) {
  const currentUser = usePortalStore((s) => s.currentUser);
  const switchRole = usePortalStore((s) => s.switchRole);
  const notifications = usePortalStore((s) => s.notifications);
  const markNotificationsAsRead = usePortalStore((s) => s.markNotificationsAsRead);
  const logout = usePortalStore((s) => s.logout);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'education', label: 'Education & Learning', icon: GraduationCap },
    { id: 'jobs', label: 'Job Portal', icon: Briefcase },
    { id: 'legal', label: 'Legal Support', icon: Scale },
    { id: 'mental-health', label: 'Wellness & Mind', icon: Activity },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'health', label: 'Health & Medical', icon: HeartPulse },
    { id: 'finance', label: 'Financial Literacy', icon: DollarSign },
    { id: 'safety', label: 'Safety & SOS', icon: ShieldAlert },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ...(currentUser.role === 'Admin'
      ? [{ id: 'admin', label: 'Admin Panel', icon: Settings, isSpecial: true }]
      : []),
  ];

  const ROLES: UserRole[] = ['Beneficiary', 'Mentor', 'Admin', 'Volunteer'];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rose-100 bg-white/95 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      {/* Top Helpline Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 px-4 py-1 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[11px] sm:text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex size-2 rounded-full bg-white animate-ping" />
            <span className="font-semibold">24x7 Safety Helplines:</span>
            <a href="tel:112" className="underline hover:text-rose-100">112 (National SOS)</a>
            <span className="opacity-60">|</span>
            <a href="tel:1091" className="underline hover:text-rose-100">1091 (Women Help)</a>
            <span className="hidden opacity-60 sm:inline">|</span>
            <a href="tel:181" className="hidden underline hover:text-rose-100 sm:inline">181 (Domestic Abuse)</a>
            <span className="hidden opacity-60 md:inline">|</span>
            <a href="tel:1930" className="hidden underline hover:text-rose-100 md:inline">1930 (Cyber Fraud)</a>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-medium text-rose-100 lg:inline">
              Empowering Women Across India · Offline-Ready &amp; Encrypted
            </span>
            <button
              onClick={onOpenSos}
              className="flex items-center gap-1 rounded bg-white px-2 py-0.5 font-bold text-red-600 shadow transition hover:bg-red-50"
            >
              <ShieldAlert className="size-3" />
              <span>SOS TRIGGER</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            className="flex cursor-pointer items-center gap-3"
            onClick={() => setActiveModule('dashboard')}
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 text-white shadow-md shadow-rose-500/20">
              <ShieldAlert className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Raksha<span className="text-rose-600">Net</span>
                </span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  EmpowerHer
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500">Women Safety &amp; Growth Ecosystem</p>
            </div>
          </div>

          {/* Desktop Right Controls */}
          <div className="flex items-center gap-3">
            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                title="Click to preview platform as a different role"
              >
                <span className="size-2 rounded-full bg-rose-500" />
                <span>Role: <strong className="font-bold">{currentUser.role}</strong></span>
                <ChevronDown className="size-3.5 text-rose-500" />
              </button>

              {isRoleMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    Switch Active Role
                  </div>
                  <div className="p-1">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          switchRole(r);
                          setIsRoleMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          currentUser.role === r
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{r}</span>
                        {currentUser.role === r && <CheckCircle className="size-3.5 text-rose-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Notifications"
              >
                <Bell className="size-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:w-96">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Live Notifications</span>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={markNotificationsAsRead}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 transition ${
                            n.read ? 'bg-white opacity-80 dark:bg-slate-900' : 'bg-rose-50/40 dark:bg-rose-950/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</p>
                            <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-slate-200 p-1 transition hover:border-slate-300 dark:border-slate-700"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="size-8 rounded-full object-cover"
                />
                <span className="hidden text-xs font-bold text-slate-800 dark:text-slate-200 sm:inline">
                  {currentUser.name.split(' ')[0]}
                </span>
                <ChevronDown className="hidden size-3 text-slate-400 sm:inline" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                    <p className="text-xs text-slate-500">{currentUser.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        onOpenProfile();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <User className="size-4" /> Edit Profile &amp; Skills
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <LogOut className="size-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-xl p-2 text-slate-600 lg:hidden dark:text-slate-300"
            >
              {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden overflow-x-auto pb-2 scrollbar-none lg:flex lg:items-center lg:gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                    : item.isSpecial
                    ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300'
                    : 'text-slate-600 hover:bg-rose-50/60 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white p-4 shadow-xl lg:hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold ${
                    isActive
                      ? 'bg-rose-600 text-white'
                      : 'border border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              onClick={() => {
                onOpenSos();
                setIsMobileMenuOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-bold text-white shadow"
            >
              <ShieldAlert className="size-5" /> TRIGGER INSTANT SOS
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
