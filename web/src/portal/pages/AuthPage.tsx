import { useState } from 'react';
import {
  ShieldAlert,
  GraduationCap,
  Users,
  Settings,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { UserRole } from '../types';

interface AuthPageProps {
  onSuccess: () => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const loginAsRole = usePortalStore((s) => s.loginAsRole);
  const loginWithEmail = usePortalStore((s) => s.loginWithEmail);
  const signupUser = usePortalStore((s) => s.signupUser);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Beneficiary');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');

  const handleQuickRoleLogin = (role: UserRole) => {
    loginAsRole(role);
    onSuccess();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!email.trim()) {
        setError('Please enter your email.');
        return;
      }
      loginWithEmail(email, selectedRole);
      onSuccess();
    } else {
      if (!name.trim() || !email.trim()) {
        setError('Please provide your name and email.');
        return;
      }
      signupUser({ name, email, phone: phone || '+91 98000 00000', role: selectedRole, bio });
      onSuccess();
    }
  };

  const ROLES: { role: UserRole; title: string; desc: string; icon: any; color: string }[] = [
    {
      role: 'Beneficiary',
      title: 'Beneficiary / Learner',
      desc: 'Access free courses, apply for inclusive jobs, book doctors, claim certificates & trigger SOS.',
      icon: GraduationCap,
      color: 'border-rose-200 bg-rose-50/70 text-rose-700',
    },
    {
      role: 'Mentor',
      title: 'Mentor & Industry Expert',
      desc: 'Offer 1-on-1 guidance to emerging female leaders, review resumes, and host tech workshops.',
      icon: Users,
      color: 'border-purple-200 bg-purple-50/70 text-purple-700',
    },
    {
      role: 'Admin',
      title: 'Platform Administrator',
      desc: 'Oversee user privileges, audit logs, emergency dispatch pipelines, and content moderation.',
      icon: Settings,
      color: 'border-indigo-200 bg-indigo-50/70 text-indigo-700',
    },
    {
      role: 'Volunteer',
      title: 'Community Volunteer',
      desc: 'Assist in local distress response, verify pink safe zones, and guide survivors to safe aid.',
      icon: ShieldAlert,
      color: 'border-amber-200 bg-amber-50/70 text-amber-700',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-rose-50/70 via-slate-50 to-purple-50/60 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Left Hero Sidebar */}
          <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 p-8 text-white md:col-span-2">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow">
                  <ShieldAlert className="size-6 text-white" />
                </div>
                <h2 className="mt-6 text-2xl font-black tracking-tight sm:text-3xl">
                  RakshaNet EmpowerHer
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-rose-100">
                  India's unified women safety, education, job opportunities, and legal aid platform.
                </p>
              </div>

              <div className="my-8 space-y-3 text-xs text-rose-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 shrink-0 text-amber-300" />
                  <span>100% Free Verified Learning Bootcamps</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 shrink-0 text-amber-300" />
                  <span>AI Skill Matching with Equal-Pay Roles</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 shrink-0 text-amber-300" />
                  <span>24x7 Emergency SOS with WhatsApp Link</span>
                </div>
              </div>

              <p className="text-[11px] text-rose-200">
                Encrypted &amp; Offline-Ready · Powered by React &amp; Tailwind
              </p>
            </div>
          </div>

          {/* Right Main Form Area */}
          <div className="p-6 sm:p-10 md:col-span-3">
            {/* 1-Click Quick Demo Switcher */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                Fast Evaluation · 1-Click Role Login
              </span>
              <p className="text-xs text-slate-500">
                Click any role to immediately test its customized dashboard and tools:
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => handleQuickRoleLogin(r.role)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left transition hover:border-rose-400 hover:bg-rose-50/50 dark:border-slate-800 dark:bg-slate-800"
                    >
                      <Icon className="size-4 text-rose-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{r.role}</div>
                        <div className="text-[10px] text-slate-500">Demo Login →</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <span className="relative bg-white px-3 text-xs font-semibold text-slate-400 dark:bg-slate-900">
                Or Sign In With Credentials
              </span>
            </div>

            {/* Toggle Login vs Signup */}
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                  mode === 'login'
                    ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Existing User Login
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                  mode === 'signup'
                    ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-center text-xs font-bold text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Full Name
                    </label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-2.5 size-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Ananya Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Short Bio / Goals
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Learning tech, career growth, or volunteer aid"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Select Your Account Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Beneficiary">Beneficiary (Women Learner / Professional)</option>
                  <option value="Mentor">Mentor (Tech Leader / Career Guide)</option>
                  <option value="Admin">Administrator (Operations &amp; Governance)</option>
                  <option value="Volunteer">Volunteer (Community &amp; Safe Zone Responder)</option>
                </select>
              </div>

              <button
                type="submit"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 py-3 text-xs font-bold text-white shadow-lg transition hover:from-rose-600 hover:to-purple-700"
              >
                <span>{mode === 'login' ? 'Secure Login to Portal' : 'Register & Join Network'}</span>
                <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
