import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Mail, Lock, User, ArrowRight, Sparkles, Phone, Heart, KeyRound, BadgeCheck, ShieldCheck } from "lucide-react";
import { useAuthStore, type Role } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("aanya@aegis.ai");
  const [password, setPassword] = useState("••••••••");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("USER");

  // Role-specific fields
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [stealthPin, setStealthPin] = useState("");
  const [relationType, setRelationType] = useState("Parent");
  const [organization, setOrganization] = useState("");
  const [badgeId, setBadgeId] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminCodeError, setAdminCodeError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      if (role === "ADMIN" && adminCode !== "AEGIS-ADMIN-2026") {
        setAdminCodeError("Invalid admin code (try AEGIS-ADMIN-2026)");
        return;
      }
      setAdminCodeError("");
      await register({
        fullName: name || "New User", email, password, phone, role,
        extra: {
          bloodGroup: role === "USER" ? bloodGroup : undefined,
          stealthPin: role === "USER" ? stealthPin : undefined,
          relationType: role === "GUARDIAN" ? relationType : undefined,
          organization: role === "ADMIN" ? organization : undefined,
          badgeId: role === "ADMIN" ? badgeId : undefined,
        },
      });
    } else {
      await login(email, password, role);
    }
    navigate(role === "ADMIN" ? "/app/admin" : role === "GUARDIAN" ? "/app/guardian" : "/app/dashboard");
  };

  const quick = async (r: Role, em: string) => {
    setRole(r); setEmail(em);
    await login(em, "demo", r);
    navigate(r === "ADMIN" ? "/app/admin" : r === "GUARDIAN" ? "/app/guardian" : "/app/dashboard");
  };

  return (
    <div className="login-page relative min-h-screen grid lg:grid-cols-2">
      <div className="aurora" />
      <div className="grid-overlay" />

      {/* Left visual */}
      <div className="relative z-10 hidden lg:flex flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center glow-pink">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-wide">RakshaNet</div>
            <div className="text-[11px] text-slate-400 -mt-0.5">AI Women &amp; Child Safety Intelligence</div>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-black leading-tight">
            Intelligence that <span className="text-gradient-pink">anticipates</span> danger.
          </h1>
          <p className="mt-4 text-slate-300 max-w-md">
            Sign in to access the live Command Deck — real-time SOS, AI risk scoring, heatmaps, and guardian tracking.
          </p>
          <div className="mt-8 space-y-3">
            {[
              ["48 live AI signals", "per user, updated every 800ms"],
              ["< 3s escalation", "Guardian → Police, fully automated"],
              ["Zero-knowledge vault", "your evidence, only you control"],
            ].map(([t, d]) => (
              <div key={t} className="flex gap-3 items-start">
                <Sparkles className="w-4 h-4 text-cyan-300 mt-1" />
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="text-sm text-slate-400">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Demo build • All data is simulated client-side for evaluation
        </div>
      </div>

      {/* Right form */}
      <div className="relative z-10 flex items-center justify-center p-6 lg:p-12">
        <div className={`w-full ${mode === "signup" ? "max-w-lg" : "max-w-md"}`}>
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center glow-pink">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">RakshaNet</div>
              <div className="text-[11px] text-slate-400">AI Women &amp; Child Safety Intelligence</div>
            </div>
          </div>

          <div className="glass-strong p-7 rounded-3xl glow-cyan max-h-[88vh] overflow-y-auto no-scrollbar">
            <div className="flex gap-2 p-1 glass-chip mb-6">
              <button
                onClick={() => setMode("signin")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${mode === "signin" ? "bg-white/10 text-white" : "text-slate-400"}`}
              >Sign in</button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${mode === "signup" ? "bg-white/10 text-white" : "text-slate-400"}`}
              >Create account</button>
            </div>

            {mode === "signin" ? (
              <>
                <h2 className="text-2xl font-bold">Welcome back</h2>
                <p className="text-sm text-slate-400 mt-1 mb-6">Access your safety command deck</p>

                <form onSubmit={submit} className="space-y-3">
                  <Field icon={<Mail className="w-4 h-4" />} placeholder="Email" value={email} onChange={setEmail} />
                  <Field icon={<Lock className="w-4 h-4" />} placeholder="Password" value={password} onChange={setPassword} type="password" />

                  <div>
                    <div className="text-xs text-slate-400 mb-1.5">Sign in as</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["USER", "GUARDIAN", "ADMIN"] as Role[]).map((r) => (
                        <button
                          type="button" key={r}
                          onClick={() => setRole(r)}
                          className={`py-2 rounded-xl text-xs font-semibold border transition ${
                            role === r
                              ? "bg-gradient-to-r from-pink-500/20 to-cyan-500/10 border-pink-400/40 text-white"
                              : "border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >{r}</button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit" disabled={loading}
                    className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-semibold glow-pink hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? "Authenticating…" : "Enter Command Deck"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3 text-[11px] text-slate-500">
                  <div className="flex-1 h-px bg-white/10" /> DEMO SHORTCUTS <div className="flex-1 h-px bg-white/10" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => quick("USER", "aanya@aegis.ai")} className="py-2 text-xs glass-chip hover:bg-white/10">User</button>
                  <button onClick={() => quick("GUARDIAN", "rahul@aegis.ai")} className="py-2 text-xs glass-chip hover:bg-white/10">Guardian</button>
                  <button onClick={() => quick("ADMIN", "admin@aegis.ai")} className="py-2 text-xs glass-chip hover:bg-white/10">Admin</button>
                </div>
              </>
            ) : (
              <SignUpForm
                role={role} setRole={setRole}
                name={name} setName={setName}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                phone={phone} setPhone={setPhone}
                bloodGroup={bloodGroup} setBloodGroup={setBloodGroup}
                stealthPin={stealthPin} setStealthPin={setStealthPin}
                relationType={relationType} setRelationType={setRelationType}
                organization={organization} setOrganization={setOrganization}
                badgeId={badgeId} setBadgeId={setBadgeId}
                adminCode={adminCode} setAdminCode={setAdminCode}
                adminCodeError={adminCodeError}
                onSubmit={submit} loading={loading}
              />
            )}
          </div>

          <div className="mt-5 text-center">
            <Link to="/register" className="inline-flex items-center gap-2 text-sm text-pink-300 hover:text-pink-200 font-semibold">
              New to RakshaNet? Create your account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-center text-[11px] text-slate-500 mt-4">
            Protected by Spring Security + JWT • AES-256 evidence vault
            <br />
            <span className="text-emerald-400/80">
              Backend: {import.meta.env.VITE_API_BASE_URL ? "Connected" : "Demo mode (set VITE_API_BASE_URL to connect)"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, placeholder, value, onChange, type = "text" }: {
  icon: React.ReactNode; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="flex items-center gap-3 glass px-4 py-3 rounded-xl border-white/10 focus-within:border-pink-400/40 transition">
      <span className="text-slate-400">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500"
      />
    </label>
  );
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELATIONS = ["Parent", "Sibling", "Partner", "Friend", "Relative"];

function SignUpForm(props: {
  role: Role; setRole: (r: Role) => void;
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  bloodGroup: string; setBloodGroup: (v: string) => void;
  stealthPin: string; setStealthPin: (v: string) => void;
  relationType: string; setRelationType: (v: string) => void;
  organization: string; setOrganization: (v: string) => void;
  badgeId: string; setBadgeId: (v: string) => void;
  adminCode: string; setAdminCode: (v: string) => void;
  adminCodeError: string;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  const {
    role, setRole, name, setName, email, setEmail, password, setPassword, phone, setPhone,
    bloodGroup, setBloodGroup, stealthPin, setStealthPin,
    relationType, setRelationType,
    organization, setOrganization, badgeId, setBadgeId, adminCode, setAdminCode, adminCodeError,
    onSubmit, loading,
  } = props;

  const roleMeta = ({
    USER: { color: "pink", grad: "from-pink-500 to-rose-600", icon: User, label: "User Protection", desc: "SOS, AI tracking, safe routes" },
    GUARDIAN: { color: "cyan", grad: "from-cyan-500 to-blue-600", icon: ShieldCheck, label: "Guardian Watch", desc: "Track & protect your loved ones" },
    ADMIN: { color: "amber", grad: "from-amber-500 to-orange-600", icon: BadgeCheck, label: "Admin Command", desc: "City-wide ops & verification" },
    POLICE: { color: "amber", grad: "from-amber-500 to-orange-600", icon: BadgeCheck, label: "Admin Command", desc: "City-wide ops & verification" },
  } as Record<Role, any>)[role];
  const Icon = roleMeta.icon;

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleMeta.grad} grid place-items-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{roleMeta.label}</h2>
          <p className="text-[11px] text-slate-400">{roleMeta.desc}</p>
        </div>
      </div>

      {/* Role selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(["USER", "GUARDIAN", "ADMIN"] as Role[]).map((r) => {
          const m = ({
            USER: { c: "pink", i: User, t: "User" },
            GUARDIAN: { c: "cyan", i: ShieldCheck, t: "Guardian" },
            ADMIN: { c: "amber", i: BadgeCheck, t: "Admin" },
            POLICE: { c: "amber", i: BadgeCheck, t: "Admin" },
          } as Record<Role, any>)[r];
          const I = m.i;
          return (
            <button
              type="button" key={r} onClick={() => setRole(r)}
              className={`p-2.5 rounded-xl text-xs font-semibold border transition flex flex-col items-center gap-1 ${
                role === r
                  ? `bg-${m.c}-500/15 border-${m.c}-400/40 text-${m.c}-200`
                  : "border-white/10 text-slate-400 hover:text-white"
              }`}
              style={role === r ? {
                background: m.c === "pink" ? "rgba(236,72,153,0.15)" : m.c === "cyan" ? "rgba(34,211,238,0.15)" : "rgba(251,191,36,0.15)",
                borderColor: m.c === "pink" ? "rgba(244,114,182,0.4)" : m.c === "cyan" ? "rgba(103,232,249,0.4)" : "rgba(252,211,77,0.4)",
                color: m.c === "pink" ? "#fbcfe8" : m.c === "cyan" ? "#a5f3fc" : "#fde68a",
              } : {}}
            >
              <I className="w-4 h-4" />
              {m.t}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field icon={<User className="w-4 h-4" />} placeholder="Full name" value={name} onChange={setName} />
          <Field icon={<Phone className="w-4 h-4" />} placeholder="Phone" value={phone} onChange={setPhone} />
        </div>
        <Field icon={<Mail className="w-4 h-4" />} placeholder="Email" value={email} onChange={setEmail} />
        <Field icon={<Lock className="w-4 h-4" />} placeholder="Password (min 8)" value={password} onChange={setPassword} type="password" />

        {/* ── USER-specific ── */}
        {role === "USER" && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="text-[11px] tracking-widest text-pink-300 uppercase flex items-center gap-1.5">
              <Heart className="w-3 h-3" /> User Safety Profile
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1.5">Blood Group</div>
              <div className="grid grid-cols-8 gap-1">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    type="button" key={bg} onClick={() => setBloodGroup(bg)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      bloodGroup === bg
                        ? "bg-pink-500/20 border-pink-400/40 text-pink-200"
                        : "border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >{bg}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Stealth PIN (4–6 digits, optional)
              </div>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={stealthPin}
                onChange={(e) => setStealthPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="9999"
                className="w-full glass px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-pink-400/40 tracking-widest"
              />
              <p className="text-[10px] text-slate-500 mt-1">Type this on the fake calculator for silent SOS</p>
            </div>
          </div>
        )}

        {/* ── GUARDIAN-specific ── */}
        {role === "GUARDIAN" && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="text-[11px] tracking-widest text-cyan-300 uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" /> Guardian Setup
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1.5">Relation to ward</div>
              <div className="grid grid-cols-5 gap-1">
                {RELATIONS.map((r) => (
                  <button
                    type="button" key={r} onClick={() => setRelationType(r)}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold border transition ${
                      relationType === r
                        ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-200"
                        : "border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div className="glass p-2.5 rounded-xl text-[11px] text-slate-400 border border-cyan-400/20">
              <ShieldCheck className="w-3 h-3 text-cyan-300 inline mr-1" />
              You'll receive SMS, WhatsApp & voice alerts when your ward triggers SOS
            </div>
          </div>
        )}

        {/* ── ADMIN-specific ── */}
        {role === "ADMIN" && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="text-[11px] tracking-widest text-amber-300 uppercase flex items-center gap-1.5">
              <BadgeCheck className="w-3 h-3" /> Admin Verification
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1.5">Organization</div>
              <input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Delhi Police / NGO / Ministry"
                className="w-full glass px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-amber-400/40"
              />
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1.5">Badge / Employee ID</div>
              <input
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="DP-2024-4521"
                className="w-full glass px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-amber-400/40"
              />
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Admin Secret Code
              </div>
              <input
                value={adminCode}
                onChange={(e) => { setAdminCode(e.target.value); if (adminCodeError) props.adminCodeError; }}
                placeholder="Provided by RakshaNet ops team"
                className={`w-full glass px-4 py-2.5 rounded-xl text-sm outline-none border ${
                  adminCodeError ? "border-pink-400/60" : "border-transparent focus:border-amber-400/40"
                }`}
              />
              {adminCodeError && <p className="text-[10px] text-pink-300 mt-1">⚠ {adminCodeError}</p>}
              <p className="text-[10px] text-slate-500 mt-1">💡 Demo: <code className="text-amber-300">AEGIS-ADMIN-2026</code></p>
            </div>
          </div>
        )}

        <button
          type="submit" disabled={loading}
          className={`w-full mt-2 py-3 rounded-xl bg-gradient-to-r ${roleMeta.grad} font-semibold hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-60 text-sm`}
          style={{ boxShadow: role === "USER" ? "0 0 30px -5px rgba(236,72,153,0.5)" : role === "GUARDIAN" ? "0 0 30px -5px rgba(34,211,238,0.5)" : "0 0 30px -5px rgba(251,191,36,0.5)" }}
        >
          {loading ? "Creating…" : `Create ${role} Account`}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </>
  );
}
