import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Command,
  Eye,
  HardDrive,
  Lock,
  LockKeyhole,
  Mail,
  Radio,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore, type Role } from "../store/authStore";

const roleMeta = {
  USER: { label: "User", desc: "Personal safety", icon: Shield },
  GUARDIAN: { label: "Guardian", desc: "Watch over someone", icon: Eye },
  ADMIN: { label: "Admin", desc: "City operations", icon: Command },
} as const;

const demoProfiles = [
  { role: "USER" as Role, label: "User", email: "aanya@aegis.ai", icon: Shield },
  { role: "GUARDIAN" as Role, label: "Guardian", email: "rahul@aegis.ai", icon: Eye },
  { role: "ADMIN" as Role, label: "Admin", email: "admin@aegis.ai", icon: Command },
];

const storyPoints = [
  {
    icon: HardDrive,
    title: "Saved before it sends",
    sub: "An SOS is written to this device first — even with no signal.",
  },
  {
    icon: Radio,
    title: "Every channel, honestly",
    sub: "WhatsApp, SMS, push or a call, with real status per contact.",
  },
  {
    icon: LockKeyhole,
    title: "You decide who sees what",
    sub: "Time-boxed sharing and instant revocation, always.",
  },
];

const truthSteps = [
  { label: "Queued", state: "is-done" },
  { label: "Prepared", state: "is-done" },
  { label: "Sent", state: "is-current" },
  { label: "Acked", state: "" },
];

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const storeError = useAuthStore((s) => s.error);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const destination = (r: Role) =>
    r === "ADMIN" ? "/app/admin" : r === "GUARDIAN" ? "/app/guardian" : "/app/dashboard";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setFormError("Enter your email and password to continue.");
      return;
    }
    setFormError("");
    await login(email.trim(), password, role);
    navigate(destination(role));
  };

  const useDemo = async (profile: (typeof demoProfiles)[number]) => {
    setFormError("");
    setRole(profile.role);
    setEmail(profile.email);
    setPassword("demo");
    await login(profile.email, "demo", profile.role);
    navigate(destination(profile.role));
  };

  const message = formError || storeError;

  return (
    <div className="rn-page rn-auth-page">
      <div className="rn-backdrop" aria-hidden="true">
        <div className="rn-grid" />
      </div>

      <header className="rn-auth-nav">
        <Link to="/" className="rn-brand">
          <span className="rn-logo">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            <span className="rn-logo-dot" aria-hidden="true" />
          </span>
          <span>
            <span className="rn-brand-name block">RakshaNet</span>
            <span className="rn-brand-sub block">Offline-first safety</span>
          </span>
        </Link>

        <div className="rn-auth-actions">
          <div className="hidden sm:block">
            <Link to="/" className="rn-btn rn-btn-quiet rn-btn-sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Home
            </Link>
          </div>
          <Link to="/register" className="rn-btn rn-btn-primary rn-btn-sm">
            Create account
          </Link>
        </div>
      </header>

      <main className="rn-auth-main rn-main">
        {/* ── Story panel ───────────────────────────────────────────── */}
        <section className="auth-story" aria-labelledby="auth-story-title">
          <div>
            <span className="rn-eyebrow">Welcome back</span>
            <h1 id="auth-story-title" className="rn-display">
              Your circle is still <em>watching.</em>
            </h1>
            <p className="auth-story-lede">
              Pick up where you left off — your trusted contacts, live risk context and
              every delivery attempt in one calm place.
            </p>

            <ul className="auth-points">
              {storyPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <li key={point.title} className="auth-point">
                    <span className="auth-point-icon">
                      <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="auth-point-title block">{point.title}</span>
                      <span className="auth-point-sub block">{point.sub}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="auth-status-card" aria-label="Example protection status">
            <div className="auth-status-head">
              <div className="flex items-center gap-2.5">
                <span className="rn-logo" style={{ width: 34, height: 34, borderRadius: 11 }}>
                  <ShieldCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[13px] font-semibold tracking-tight">Protection active</div>
                  <div className="rn-faint text-[10px]">Your circle can see the essentials</div>
                </div>
              </div>
              <span className="auth-live">
                <span className="auth-live-dot" aria-hidden="true" />
                Offline ready
              </span>
            </div>

            <div className="auth-status-grid">
              <div className="auth-mini">
                <div className="auth-mini-title">Last check-in</div>
                <div className="auth-mini-sub">Today · 6:42 pm</div>
              </div>
              <div className="auth-mini">
                <div className="auth-mini-title">Trusted circle</div>
                <div className="auth-mini-sub">5 people · 1 primary</div>
              </div>
            </div>

            <div className="auth-truth">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold">Delivery truth</span>
                <span className="rn-faint text-[10px]">Per contact · per channel</span>
              </div>
              <div className="auth-truth-track">
                <span className="auth-truth-line" aria-hidden="true" />
                {truthSteps.map((step) => (
                  <div key={step.label} className={`auth-truth-step ${step.state}`.trim()}>
                    <span className="auth-truth-dot" aria-hidden="true" />
                    {step.label}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="auth-avatars" aria-label="Trusted contacts: A, M, R and 2 more">
                  {["A", "M", "R", "+2"].map((initials) => (
                    <span key={initials} className="auth-avatar">
                      {initials}
                    </span>
                  ))}
                </div>
                <span className="rn-faint text-[10px]">A WhatsApp hand-off is never “delivered”.</span>
              </div>
            </div>
          </div>

          <p className="auth-legal">
            <strong>Demo build.</strong> All data is simulated client-side for evaluation.
            RakshaNet does not replace emergency services — in immediate danger, call 112.
          </p>
        </section>

        {/* ── Sign-in panel ─────────────────────────────────────────── */}
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-card">
            <div className="auth-tabs">
              <span className="auth-tab is-active" aria-current="page">
                Sign in
              </span>
              <Link to="/register" className="auth-tab">
                Create account
              </Link>
            </div>

            <h1 id="auth-title" className="auth-title">
              Welcome back
            </h1>
            <p className="auth-sub">
              Use your RakshaNet account to open the command deck.
            </p>

            {message && (
              <div className="rn-alert mb-4" role="alert">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={submit} className="rn-form-stack">
              <div className="rn-field">
                <label className="rn-label" htmlFor="login-email">
                  Email address
                </label>
                <div className={`rn-input-wrap ${formError && !email ? "is-error" : ""}`}>
                  <span className="rn-input-icon">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="rn-input"
                    required
                  />
                </div>
              </div>

              <div className="rn-field">
                <div className="rn-label-row">
                  <label className="rn-label" htmlFor="login-password">
                    Password
                  </label>
                  <span className="rn-label-hint">Minimum 8 characters</span>
                </div>
                <div className={`rn-input-wrap ${formError && !password ? "is-error" : ""}`}>
                  <span className="rn-input-icon">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    className="rn-input"
                    required
                  />
                  <button
                    type="button"
                    className="rn-pw-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <fieldset className="rn-field">
                <legend className="rn-label mb-2">Sign in as</legend>
                <div className="rn-role-grid">
                  {(Object.keys(roleMeta) as Array<keyof typeof roleMeta>).map((key) => {
                    const meta = roleMeta[key];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRole(key)}
                        className={`rn-role-option ${role === key ? "is-active" : ""}`}
                        aria-pressed={role === key}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button type="submit" className="rn-btn rn-btn-primary rn-btn-block" disabled={loading}>
                {loading ? "Signing in…" : "Enter command deck"}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </form>

            <div className="rn-divider">or use a demo profile</div>

            <div className="auth-demo-grid">
              {demoProfiles.map((profile) => {
                const Icon = profile.icon;
                return (
                  <button
                    key={profile.role}
                    type="button"
                    className="auth-demo"
                    onClick={() => useDemo(profile)}
                    disabled={loading}
                  >
                    <span className="auth-demo-role">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {profile.label}
                    </span>
                    <span className="auth-demo-mail">{profile.email}</span>
                  </button>
                );
              })}
            </div>

            <div className="auth-card-foot">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rn-primary)]" aria-hidden="true" />
              <span>
                Demo profiles use the password <strong>demo</strong>. With no backend configured,
                any non-empty password is accepted locally.
              </span>
            </div>
          </div>

          <p className="auth-under">
            New to RakshaNet? <Link to="/register">Create your safety circle</Link>
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rn-pill is-emerald">
              <span className="rn-dot" aria-hidden="true" />
              {import.meta.env.VITE_API_BASE_URL ? "API connected" : "Demo mode"}
            </span>
            <span className="rn-faint text-[11px]">
              {import.meta.env.VITE_API_BASE_URL
                ? "Live authentication enabled"
                : "Set VITE_API_BASE_URL to use the live backend"}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
