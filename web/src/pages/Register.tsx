import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, User, Eye, Command, ArrowRight, ArrowLeft, Check, Plus, X,
  Phone, Mail, Lock, Heart, Activity, KeyRound, Building2, BadgeCheck,
  MapPin, MessageSquare, PhoneCall, Sparkles, ChevronRight,
} from "lucide-react";
import { useAuthStore, type Role } from "../store/authStore";

type Step = "role" | "basic" | "roleFields" | "contacts" | "review";

interface FormData {
  // role
  role: Role;
  // basic
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  // USER specific
  bloodGroup: string;
  medicalInfo: string;
  stealthPin: string;
  shareLocationWithGuardians: boolean;
  // GUARDIAN specific
  relationType: string;
  verifyIdentity: boolean;
  notifyVia: { sms: boolean; whatsapp: boolean; call: boolean; push: boolean };
  // ADMIN specific
  organization: string;
  badgeId: string;
  adminSecretCode: string;
  jurisdiction: string;
  // contacts (USER only)
  contacts: { name: string; relation: string; phone: string }[];
}

const init: FormData = {
  role: "USER",
  fullName: "", email: "", phone: "", password: "", confirmPassword: "",
  bloodGroup: "", medicalInfo: "", stealthPin: "", shareLocationWithGuardians: true,
  relationType: "Parent", verifyIdentity: true,
  notifyVia: { sms: true, whatsapp: true, call: true, push: true },
  organization: "", badgeId: "", adminSecretCode: "", jurisdiction: "Delhi NCR",
  contacts: [{ name: "", relation: "Parent", phone: "" }],
};

const ROLES = [
  {
    key: "USER" as Role,
    icon: User, title: "I need protection",
    desc: "Register as a user — get SOS, AI risk prediction, safe routes, and 24/7 AI copilot.",
    color: "pink",
    features: ["6 SOS triggers", "AI threat prediction", "Safe route AI", "Live tracking"],
  },
  {
    key: "GUARDIAN" as Role,
    icon: Eye, title: "I protect someone",
    desc: "Watch over your loved ones in real-time — receive alerts, track journeys, one-tap call.",
    color: "cyan",
    features: ["Real-time ward tracking", "Instant SOS alerts", "Journey timeline", "One-tap call"],
  },
  {
    key: "ADMIN" as Role,
    icon: Command, title: "I run operations",
    desc: "Command center access — city-wide analytics, dispatch, verification, and policy control.",
    color: "amber",
    features: ["Live ops dashboard", "Incident verification", "Dispatch controls", "City analytics"],
  },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELATIONS = ["Parent", "Sibling", "Partner", "Friend", "Relative", "Colleague"];
const JURISDICTIONS = ["Delhi NCR", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pan-India"];

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const [step, setStep] = useState<Step>("role");
  const [data, setData] = useState<FormData>(init);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const stepIndex = ["role", "basic", "roleFields", "contacts", "review"].indexOf(step);
  const totalSteps = data.role === "USER" ? 5 : 4;

  // ── Validation ─────────────────────────────────────────────────────
  const validateBasic = () => {
    const e: Record<string, string> = {};
    if (!data.fullName.trim() || data.fullName.length < 2) e.fullName = "Full name required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "Valid email required";
    if (!/^\+?[0-9]{7,15}$/.test(data.phone.replace(/\s/g, ""))) e.phone = "Valid phone required";
    if (data.password.length < 8) e.password = "Min 8 characters";
    if (data.password !== data.confirmPassword) e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRoleFields = () => {
    const e: Record<string, string> = {};
    if (data.role === "USER") {
      if (data.stealthPin && !/^[0-9]{4,6}$/.test(data.stealthPin))
        e.stealthPin = "PIN must be 4–6 digits";
    }
    if (data.role === "ADMIN") {
      if (!data.organization.trim()) e.organization = "Organization required";
      if (!data.badgeId.trim()) e.badgeId = "Badge ID required";
      if (data.adminSecretCode !== "AEGIS-ADMIN-2026")
        e.adminSecretCode = "Invalid admin code (try AEGIS-ADMIN-2026)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateContacts = () => {
    const e: Record<string, string> = {};
    if (data.role === "USER") {
      const valid = data.contacts.filter((c) => c.name && c.phone);
      if (valid.length === 0) e.contacts = "Add at least one emergency contact";
      data.contacts.forEach((c, i) => {
        if ((c.name || c.phone) && !/^\+?[0-9]{7,15}$/.test(c.phone.replace(/\s/g, "")))
          e[`contact_${i}`] = `Contact ${i + 1}: valid phone required`;
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === "basic" && !validateBasic()) return;
    if (step === "roleFields" && !validateRoleFields()) return;
    if (step === "contacts" && !validateContacts()) return;

    if (step === "role") setStep("basic");
    else if (step === "basic") setStep("roleFields");
    else if (step === "roleFields") setStep(data.role === "USER" ? "contacts" : "review");
    else if (step === "contacts") setStep("review");
  };

  const back = () => {
    if (step === "review" && data.role === "USER") setStep("contacts");
    else if (step === "review") setStep("roleFields");
    else if (step === "contacts") setStep("roleFields");
    else if (step === "roleFields") setStep("basic");
    else if (step === "basic") setStep("role");
  };

  const addContact = () =>
    update("contacts", [...data.contacts, { name: "", relation: "Friend", phone: "" }]);

  const removeContact = (i: number) =>
    update("contacts", data.contacts.filter((_, idx) => idx !== i));

  const updateContact = (i: number, k: "name" | "relation" | "phone", v: string) => {
    const next = [...data.contacts];
    next[i] = { ...next[i], [k]: v };
    update("contacts", next);
  };

  const submit = async () => {
    await register({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      role: data.role,
      extra: {
        bloodGroup: data.bloodGroup,
        medicalInfo: data.medicalInfo,
        stealthPin: data.stealthPin,
        relationType: data.relationType,
        organization: data.organization,
        badgeId: data.badgeId,
        jurisdiction: data.jurisdiction,
        contacts: data.contacts,
      },
    });
    navigate(
      data.role === "ADMIN" ? "/app/admin"
      : data.role === "GUARDIAN" ? "/app/guardian"
      : "/app/dashboard"
    );
  };

  const toneColor = (c: string) =>
    c === "pink" ? { bg: "bg-pink-500/15", text: "text-pink-200", border: "border-pink-400/40", grad: "from-pink-500 to-rose-600" }
    : c === "cyan" ? { bg: "bg-cyan-500/15", text: "text-cyan-200", border: "border-cyan-400/40", grad: "from-cyan-500 to-blue-600" }
    : { bg: "bg-amber-500/15", text: "text-amber-200", border: "border-amber-400/40", grad: "from-amber-500 to-orange-600" };

  const currentTone = toneColor(ROLES.find((r) => r.key === data.role)!.color);

  return (
    <div className="relative min-h-screen">
      <div className="aurora" />
      <div className="grid-overlay" />

      <div className="relative z-10 max-w-4xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center glow-pink">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold">RakshaNet</div>
              <div className="text-[10px] text-slate-400 -mt-0.5">Join the safety network</div>
            </div>
          </Link>
          <Link to="/login" className="text-xs glass-chip px-3 py-1.5 hover:bg-white/10">
            Already have an account? <span className="text-pink-300 font-semibold">Sign in</span>
          </Link>
        </div>

        {/* Progress */}
        <div className="glass-strong p-4 rounded-2xl mb-6">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span>Step {stepIndex + 1} of {totalSteps}</span>
            <span className="font-semibold text-white">{Math.round(((stepIndex + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${currentTone.grad}`}
              animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            {["Role", "Basic", "Details", ...(data.role === "USER" ? ["Contacts"] : []), "Review"].map((label, i) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold ${
                  i <= stepIndex ? `${currentTone.bg} ${currentTone.text} ${currentTone.border} border` : "bg-white/5 text-slate-500"
                }`}>
                  {i < stepIndex ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={i <= stepIndex ? "text-white" : "text-slate-500"}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="glass-strong p-6 lg:p-8 rounded-3xl min-h-[560px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              {/* ═══ STEP 1: ROLE SELECTION ═══ */}
              {step === "role" && (
                <div>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 text-[11px] tracking-widest text-pink-300 uppercase mb-2">
                      <Sparkles className="w-3 h-3" /> Choose Your Role
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black">How will you use RakshaNet?</h1>
                    <p className="text-slate-400 text-sm mt-2">Pick the role that matches your safety needs.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {ROLES.map((r) => {
                      const t = toneColor(r.color);
                      const selected = data.role === r.key;
                      return (
                        <motion.button
                          key={r.key}
                          onClick={() => update("role", r.key)}
                          whileHover={{ y: -4 }}
                          className={`text-left p-5 rounded-2xl border-2 transition-all ${
                            selected
                              ? `${t.border} ${t.bg} glow-${r.color === "pink" ? "pink" : r.color === "cyan" ? "cyan" : "amber"}`
                              : "border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-2xl ${t.bg} ${t.text} grid place-items-center mb-3`}>
                            <r.icon className="w-6 h-6" />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold">{r.title}</div>
                            {selected && <Check className={`w-4 h-4 ${t.text}`} />}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.desc}</p>
                          <div className="mt-3 space-y-1">
                            {r.features.map((f) => (
                              <div key={f} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-emerald-300" /> {f}
                              </div>
                            ))}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: BASIC INFO ═══ */}
              {step === "basic" && (
                <div>
                  <div className="mb-6">
                    <div className="text-[11px] tracking-widest text-slate-400 uppercase mb-1">Step 2</div>
                    <h1 className="text-2xl lg:text-3xl font-black">Tell us about yourself</h1>
                    <p className="text-slate-400 text-sm mt-1">Creating account for <span className={`font-bold ${currentTone.text}`}>{data.role}</span></p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input icon={<User className="w-4 h-4" />} label="Full Name" placeholder="Aanya Kapoor"
                      value={data.fullName} onChange={(v) => update("fullName", v)} error={errors.fullName} />
                    <Input icon={<Mail className="w-4 h-4" />} label="Email" placeholder="aanya@aegis.ai"
                      value={data.email} onChange={(v) => update("email", v)} error={errors.email} />
                    <Input icon={<Phone className="w-4 h-4" />} label="Phone" placeholder="+91 98XXX 12345"
                      value={data.phone} onChange={(v) => update("phone", v)} error={errors.phone} />
                    <Input icon={<Lock className="w-4 h-4" />} label="Password (min 8 chars)" placeholder="••••••••"
                      type="password" value={data.password} onChange={(v) => update("password", v)} error={errors.password} />
                    <div className="md:col-span-2">
                      <Input icon={<Lock className="w-4 h-4" />} label="Confirm Password" placeholder="••••••••"
                        type="password" value={data.confirmPassword} onChange={(v) => update("confirmPassword", v)} error={errors.confirmPassword} />
                    </div>
                  </div>

                  <PasswordStrength password={data.password} />
                </div>
              )}

              {/* ═══ STEP 3: ROLE-SPECIFIC FIELDS ═══ */}
              {step === "roleFields" && (
                <div>
                  {/* ── USER fields ── */}
                  {data.role === "USER" && (
                    <div>
                      <div className="mb-6">
                        <div className="text-[11px] tracking-widest text-pink-300 uppercase mb-1">User Profile</div>
                        <h1 className="text-2xl lg:text-3xl font-black">Safety & Medical Details</h1>
                        <p className="text-slate-400 text-sm mt-1">Help responders help you faster in emergencies.</p>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 mb-2">Blood Group</div>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                          {BLOOD_GROUPS.map((bg) => (
                            <button
                              key={bg}
                              onClick={() => update("bloodGroup", bg)}
                              className={`py-2.5 rounded-xl text-sm font-bold border transition ${
                                data.bloodGroup === bg
                                  ? "bg-pink-500/20 border-pink-400/40 text-pink-200"
                                  : "border-white/10 text-slate-400 hover:text-white"
                              }`}
                            >{bg}</button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5">
                        <label className="text-xs text-slate-400">Medical Information (allergies, conditions)</label>
                        <textarea
                          value={data.medicalInfo}
                          onChange={(e) => update("medicalInfo", e.target.value)}
                          placeholder="e.g. Asthma, allergic to penicillin, type-1 diabetes"
                          className="mt-1 w-full glass px-4 py-3 rounded-xl text-sm outline-none min-h-[90px] focus:border-pink-400/40 border border-transparent"
                        />
                      </div>

                      <div className="mt-5">
                        <Input icon={<KeyRound className="w-4 h-4" />} label="Stealth PIN (4–6 digits, optional)"
                          placeholder="9999" value={data.stealthPin}
                          onChange={(v) => update("stealthPin", v.replace(/\D/g, "").slice(0, 6))}
                          error={errors.stealthPin} />
                        <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Type this PIN on the fake calculator to trigger silent SOS
                        </p>
                      </div>

                      <label className="mt-5 flex items-start gap-3 glass p-3 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.shareLocationWithGuardians}
                          onChange={(e) => update("shareLocationWithGuardians", e.target.checked)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">Share live location with guardians</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">You can revoke this anytime in settings</div>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* ── GUARDIAN fields ── */}
                  {data.role === "GUARDIAN" && (
                    <div>
                      <div className="mb-6">
                        <div className="text-[11px] tracking-widest text-cyan-300 uppercase mb-1">Guardian Profile</div>
                        <h1 className="text-2xl lg:text-3xl font-black">Guardian Setup</h1>
                        <p className="text-slate-400 text-sm mt-1">Configure how you'll watch over your wards.</p>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 mb-2">Primary Relation Type</div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {RELATIONS.map((r) => (
                            <button
                              key={r}
                              onClick={() => update("relationType", r)}
                              className={`py-2.5 rounded-xl text-xs font-semibold border transition ${
                                data.relationType === r
                                  ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-200"
                                  : "border-white/10 text-slate-400 hover:text-white"
                              }`}
                            >{r}</button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="text-xs text-slate-400 mb-2">Notification Channels</div>
                        <div className="grid md:grid-cols-2 gap-3">
                          {([
                            ["sms", "SMS Alerts", MessageSquare, "Instant text to your phone"],
                            ["whatsapp", "WhatsApp Alerts", MessageSquare, "Rich media + live map links"],
                            ["call", "Voice Calls", PhoneCall, "Auto-call on critical SOS"],
                            ["push", "Push Notifications", Activity, "In-app + browser alerts"],
                          ] as const).map(([k, label, Icon, desc]) => (
                            <label key={k} className="flex items-start gap-3 glass p-3 rounded-xl cursor-pointer">
                              <input
                                type="checkbox"
                                checked={data.notifyVia[k]}
                                onChange={(e) => update("notifyVia", { ...data.notifyVia, [k]: e.target.checked })}
                                className="mt-1"
                              />
                              <Icon className="w-4 h-4 text-cyan-300 mt-0.5" />
                              <div>
                                <div className="text-sm font-semibold">{label}</div>
                                <div className="text-[11px] text-slate-400">{desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <label className="mt-5 flex items-start gap-3 glass p-3 rounded-xl cursor-pointer border border-cyan-400/20">
                        <input
                          type="checkbox"
                          checked={data.verifyIdentity}
                          onChange={(e) => update("verifyIdentity", e.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <BadgeCheck className="w-4 h-4 text-cyan-300" /> Verify my identity
                          </div>
                          <div className="text-[11px] text-slate-400">Ward will get a verification code to confirm you</div>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* ── ADMIN fields ── */}
                  {data.role === "ADMIN" && (
                    <div>
                      <div className="mb-6">
                        <div className="text-[11px] tracking-widest text-amber-300 uppercase mb-1">Admin Credentials</div>
                        <h1 className="text-2xl lg:text-3xl font-black">Admin Verification</h1>
                        <p className="text-slate-400 text-sm mt-1">Admin access requires organization verification.</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <Input icon={<Building2 className="w-4 h-4" />} label="Organization" placeholder="Delhi Police / NGO / Ministry"
                          value={data.organization} onChange={(v) => update("organization", v)} error={errors.organization} />
                        <Input icon={<BadgeCheck className="w-4 h-4" />} label="Badge / Employee ID" placeholder="DP-2024-4521"
                          value={data.badgeId} onChange={(v) => update("badgeId", v)} error={errors.badgeId} />
                        <div className="md:col-span-2">
                          <Input icon={<MapPin className="w-4 h-4" />} label="Jurisdiction"
                            value={data.jurisdiction} onChange={(v) => update("jurisdiction", v)} />
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {JURISDICTIONS.map((j) => (
                              <button
                                key={j}
                                onClick={() => update("jurisdiction", j)}
                                className={`text-[11px] px-2.5 py-1 rounded-full border ${
                                  data.jurisdiction === j
                                    ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                                    : "border-white/10 text-slate-400"
                                }`}
                              >{j}</button>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <Input icon={<KeyRound className="w-4 h-4" />} label="Admin Secret Code"
                            placeholder="Provided by RakshaNet operations team"
                            value={data.adminSecretCode} onChange={(v) => update("adminSecretCode", v)} error={errors.adminSecretCode} />
                          <p className="text-[11px] text-slate-500 mt-1.5">
                            💡 Demo code: <code className="text-amber-300">AEGIS-ADMIN-2026</code>
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 glass p-4 rounded-xl border border-amber-400/20">
                        <div className="text-xs text-amber-200 font-semibold mb-1">⚠️ Admin Privileges</div>
                        <ul className="text-[11px] text-slate-400 space-y-1">
                          <li>• Access to city-wide operational analytics</li>
                          <li>• Verify & moderate community incident reports</li>
                          <li>• Dispatch emergency response teams</li>
                          <li>• View all SOS alerts with PII (audit logged)</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ STEP 4: EMERGENCY CONTACTS (USER only) ═══ */}
              {step === "contacts" && data.role === "USER" && (
                <div>
                  <div className="mb-6">
                    <div className="text-[11px] tracking-widest text-pink-300 uppercase mb-1">Trusted Circle</div>
                    <h1 className="text-2xl lg:text-3xl font-black">Emergency Contacts</h1>
                    <p className="text-slate-400 text-sm mt-1">Add people who will be alerted when you trigger SOS.</p>
                  </div>

                  {errors.contacts && <div className="text-xs text-pink-300 mb-3">⚠ {errors.contacts}</div>}

                  <div className="space-y-3">
                    {data.contacts.map((c, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="glass p-4 rounded-2xl relative"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-bold">Contact {i + 1}</div>
                          {data.contacts.length > 1 && (
                            <button onClick={() => removeContact(i)} className="text-xs text-slate-400 hover:text-pink-300">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid md:grid-cols-3 gap-2">
                          <input
                            placeholder="Full name"
                            value={c.name}
                            onChange={(e) => updateContact(i, "name", e.target.value)}
                            className="glass px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-pink-400/40"
                          />
                          <select
                            value={c.relation}
                            onChange={(e) => updateContact(i, "relation", e.target.value)}
                            className="glass px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-pink-400/40 bg-transparent"
                          >
                            {RELATIONS.map((r) => <option key={r} value={r} className="bg-[#0a0d1f]">{r}</option>)}
                          </select>
                          <input
                            placeholder="+91 98XXX XXXXX"
                            value={c.phone}
                            onChange={(e) => updateContact(i, "phone", e.target.value)}
                            className="glass px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-pink-400/40"
                          />
                        </div>
                        {errors[`contact_${i}`] && <div className="text-[11px] text-pink-300 mt-2">⚠ {errors[`contact_${i}`]}</div>}
                      </motion.div>
                    ))}
                  </div>

                  {data.contacts.length < 5 && (
                    <button
                      onClick={addContact}
                      className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-pink-400/40 text-sm text-slate-400 hover:text-pink-200 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add another contact ({data.contacts.length}/5)
                    </button>
                  )}

                  <div className="mt-5 glass p-3 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
                    <Heart className="w-3.5 h-3.5 text-pink-300 mt-0.5 shrink-0" />
                    We recommend adding at least 2 trusted contacts. They'll receive SMS, WhatsApp, and voice calls on SOS.
                  </div>
                </div>
              )}

              {/* ═══ STEP 5: REVIEW ═══ */}
              {step === "review" && (
                <div>
                  <div className="mb-6">
                    <div className="text-[11px] tracking-widest text-emerald-300 uppercase mb-1">Final Step</div>
                    <h1 className="text-2xl lg:text-3xl font-black">Review & Create Account</h1>
                    <p className="text-slate-400 text-sm mt-1">Please verify your details before proceeding.</p>
                  </div>

                  <div className="space-y-3">
                    <ReviewSection title="Account" tone={currentTone}>
                      <ReviewRow label="Role" value={data.role} />
                      <ReviewRow label="Name" value={data.fullName} />
                      <ReviewRow label="Email" value={data.email} />
                      <ReviewRow label="Phone" value={data.phone} />
                    </ReviewSection>

                    {data.role === "USER" && (
                      <ReviewSection title="Medical & Safety" tone={currentTone}>
                        <ReviewRow label="Blood Group" value={data.bloodGroup || "—"} />
                        <ReviewRow label="Medical Info" value={data.medicalInfo || "—"} />
                        <ReviewRow label="Stealth PIN" value={data.stealthPin ? "•".repeat(data.stealthPin.length) : "—"} />
                        <ReviewRow label="Share Location" value={data.shareLocationWithGuardians ? "Yes" : "No"} />
                      </ReviewSection>
                    )}

                    {data.role === "USER" && data.contacts.filter((c) => c.name).length > 0 && (
                      <ReviewSection title={`Emergency Contacts (${data.contacts.filter((c) => c.name).length})`} tone={currentTone}>
                        {data.contacts.filter((c) => c.name).map((c, i) => (
                          <ReviewRow key={i} label={`${c.relation}`} value={`${c.name} • ${c.phone}`} />
                        ))}
                      </ReviewSection>
                    )}

                    {data.role === "GUARDIAN" && (
                      <ReviewSection title="Guardian Settings" tone={currentTone}>
                        <ReviewRow label="Relation" value={data.relationType} />
                        <ReviewRow label="Identity Verify" value={data.verifyIdentity ? "Yes" : "No"} />
                        <ReviewRow label="Notify via" value={
                          Object.entries(data.notifyVia).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(", ")
                        } />
                      </ReviewSection>
                    )}

                    {data.role === "ADMIN" && (
                      <ReviewSection title="Admin Verification" tone={currentTone}>
                        <ReviewRow label="Organization" value={data.organization} />
                        <ReviewRow label="Badge ID" value={data.badgeId} />
                        <ReviewRow label="Jurisdiction" value={data.jurisdiction} />
                        <ReviewRow label="Admin Code" value="••••••" />
                      </ReviewSection>
                    )}
                  </div>

                  <label className="mt-5 flex items-start gap-3 glass p-3 rounded-xl cursor-pointer border border-white/10">
                    <input type="checkbox" defaultChecked className="mt-1" />
                    <div className="text-[11px] text-slate-400">
                      I agree to RakshaNet <span className="text-pink-300">Terms of Service</span> and <span className="text-pink-300">Privacy Policy</span>. I understand my data is encrypted with AES-256.
                    </div>
                  </label>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={back}
              disabled={step === "role"}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step === "review" ? (
              <button
                onClick={submit}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${currentTone.grad} font-semibold text-sm hover:brightness-110 disabled:opacity-60`}
              >
                {loading ? "Creating account…" : `Create ${data.role} Account`}
                <Sparkles className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={next}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${currentTone.grad} font-semibold text-sm hover:brightness-110`}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-5">
          🔒 All data encrypted • AES-256 at rest • GDPR compliant
        </p>
      </div>
    </div>
  );
}

// ── Small components ─────────────────────────────────────────────────
function Input({ icon, label, placeholder, value, onChange, error, type = "text" }: {
  icon?: React.ReactNode; label: string; placeholder?: string;
  value: string; onChange: (v: string) => void; error?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <div className={`mt-1 flex items-center gap-3 glass px-4 py-3 rounded-xl border transition ${
        error ? "border-pink-400/40" : "border-transparent focus-within:border-pink-400/40"
      }`}>
        {icon && <span className="text-slate-400">{icon}</span>}
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500"
        />
      </div>
      {error && <div className="text-[11px] text-pink-300 mt-1">⚠ {error}</div>}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { ok: password.length >= 8, label: "8+ characters" },
    { ok: /[A-Z]/.test(password), label: "Uppercase" },
    { ok: /[0-9]/.test(password), label: "Number" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "Symbol" },
  ];
  const score = checks.filter((c) => c.ok).length;
  const label = score === 0 ? "" : score <= 2 ? "Weak" : score === 3 ? "Good" : "Strong";
  const color = score <= 2 ? "bg-pink-400" : score === 3 ? "bg-amber-400" : "bg-emerald-400";

  if (!password) return null;
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-slate-400">Password strength</span>
        <span className={score <= 2 ? "text-pink-300" : score === 3 ? "text-amber-300" : "text-emerald-300"}>{label}</span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i < score ? color : "bg-white/5"}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {checks.map((c) => (
          <div key={c.label} className={`text-[10px] flex items-center gap-1 ${c.ok ? "text-emerald-300" : "text-slate-500"}`}>
            {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewSection({ title, tone, children }: { title: string; tone: any; children: React.ReactNode }) {
  return (
    <div className="glass p-4 rounded-2xl">
      <div className={`text-xs font-bold ${tone.text} mb-3 flex items-center gap-1.5`}>
        <ChevronRight className="w-3 h-3" /> {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
