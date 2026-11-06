import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  Command,
  Eye,
  Heart,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useAuthStore, type Role } from "../store/authStore";

type Step = "role" | "basic" | "roleFields" | "contacts" | "review";

interface FormData {
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  bloodGroup: string;
  medicalInfo: string;
  stealthPin: string;
  shareLocationWithGuardians: boolean;
  relationType: string;
  verifyIdentity: boolean;
  notifyVia: { sms: boolean; whatsapp: boolean; call: boolean; push: boolean };
  organization: string;
  badgeId: string;
  adminSecretCode: string;
  jurisdiction: string;
  contacts: { name: string; relation: string; phone: string }[];
}

const init: FormData = {
  role: "USER",
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  bloodGroup: "",
  medicalInfo: "",
  stealthPin: "",
  shareLocationWithGuardians: true,
  relationType: "Parent",
  verifyIdentity: true,
  notifyVia: { sms: true, whatsapp: true, call: true, push: true },
  organization: "",
  badgeId: "",
  adminSecretCode: "",
  jurisdiction: "Delhi NCR",
  contacts: [{ name: "", relation: "Parent", phone: "" }],
};

const ROLES = [
  {
    key: "USER" as Role,
    icon: User,
    title: "I need protection",
    desc: "Get SOS, offline-first alerts, safe journeys and a calm command deck.",
    features: ["Offline SOS", "Trusted contacts", "Live risk context", "Safe journeys"],
  },
  {
    key: "GUARDIAN" as Role,
    icon: Eye,
    title: "I protect someone",
    desc: "Watch over the people you love and receive honest delivery status.",
    features: ["Ward tracking", "Instant SOS alerts", "Journey timeline", "One-tap call"],
  },
  {
    key: "ADMIN" as Role,
    icon: Command,
    title: "I run operations",
    desc: "Command-center access for verification, dispatch and city analytics.",
    features: ["Live operations", "Incident review", "Dispatch controls", "City analytics"],
  },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELATIONS = ["Parent", "Sibling", "Partner", "Friend", "Relative", "Colleague"];
const JURISDICTIONS = ["Delhi NCR", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pan-India"];

const STEP_TEXT: Record<Step, { label: string; sub: string }> = {
  role: { label: "Role", sub: "How you'll use RakshaNet" },
  basic: { label: "Account", sub: "Name, email and password" },
  roleFields: { label: "Details", sub: "Safety preferences" },
  contacts: { label: "Circle", sub: "Trusted contacts" },
  review: { label: "Review", sub: "Confirm and create" },
};

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>("role");
  const [data, setData] = useState<FormData>(init);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData((current) => ({ ...current, [key]: value }));

  const stepOrder: Step[] = [
    "role",
    "basic",
    "roleFields",
    ...(data.role === "USER" ? (["contacts"] as Step[]) : []),
    "review",
  ];
  const stepIndex = Math.max(0, stepOrder.indexOf(step));
  const totalSteps = stepOrder.length;
  const percent = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const validateBasic = () => {
    const nextErrors: Record<string, string> = {};
    if (!data.fullName.trim() || data.fullName.trim().length < 2) nextErrors.fullName = "Enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) nextErrors.email = "Enter a valid email address";
    if (!/^\+?[0-9]{7,15}$/.test(data.phone.replace(/\s/g, ""))) nextErrors.phone = "Enter a valid phone number";
    if (data.password.length < 8) nextErrors.password = "Use at least 8 characters";
    if (data.password !== data.confirmPassword) nextErrors.confirmPassword = "Passwords do not match";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateRoleFields = () => {
    const nextErrors: Record<string, string> = {};
    if (data.role === "USER" && data.stealthPin && !/^[0-9]{4,6}$/.test(data.stealthPin)) {
      nextErrors.stealthPin = "PIN must be 4–6 digits";
    }
    if (data.role === "ADMIN") {
      if (!data.organization.trim()) nextErrors.organization = "Organization is required";
      if (!data.badgeId.trim()) nextErrors.badgeId = "Badge or employee ID is required";
      if (data.adminSecretCode !== "AEGIS-ADMIN-2026") nextErrors.adminSecretCode = "Invalid admin code";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateContacts = () => {
    const nextErrors: Record<string, string> = {};
    if (data.role === "USER") {
      const valid = data.contacts.filter((contact) => contact.name && contact.phone);
      if (valid.length === 0) nextErrors.contacts = "Add at least one emergency contact";
      data.contacts.forEach((contact, index) => {
        if ((contact.name || contact.phone) && !/^\+?[0-9]{7,15}$/.test(contact.phone.replace(/\s/g, ""))) {
          nextErrors[`contact_${index}`] = `Contact ${index + 1}: enter a valid phone number`;
        }
      });
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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

  const removeContact = (index: number) =>
    update("contacts", data.contacts.filter((_, i) => i !== index));

  const updateContact = (index: number, key: "name" | "relation" | "phone", value: string) => {
    const contacts = [...data.contacts];
    contacts[index] = { ...contacts[index], [key]: value };
    update("contacts", contacts);
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
        : "/app/dashboard",
    );
  };

  const stepMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: 18 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -18 },
        transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
      };

  const roleLabel = ROLES.find((role) => role.key === data.role)?.title ?? data.role;

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
          <Link to="/login" className="rn-btn rn-btn-ghost rn-btn-sm">
            Sign in
          </Link>
        </div>
      </header>

      <main className="rn-reg-main rn-main">
        <div className="rn-reg-grid">
          {/* ── Progress rail ─────────────────────────────────────── */}
          <aside className="rn-reg-rail" aria-label="Registration progress">
            <div className="rn-rail-sticky">
              <span className="rn-eyebrow">Create account</span>
              <h1 className="rn-display">
                Set up your <em>safety circle.</em>
              </h1>
              <p>
                A short, honest setup. Decide who hears from you, what they can see,
                and how each alert reaches them.
              </p>

              <ol className="rn-steps">
                {stepOrder.map((item, index) => {
                  const state = index < stepIndex ? "is-done" : index === stepIndex ? "is-current" : "";
                  return (
                    <li
                      key={item}
                      className={`rn-step ${state}`.trim()}
                      aria-current={index === stepIndex ? "step" : undefined}
                    >
                      <span className="rn-step-dot" aria-hidden="true">
                        {index < stepIndex ? <Check className="h-3 w-3" /> : index + 1}
                      </span>
                      <span className="rn-step-label">
                        {STEP_TEXT[item].label}
                        <span className="rn-step-sub">{STEP_TEXT[item].sub}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>

              <div className="rn-assurance">
                <div className="flex items-start gap-2.5">
                  <span className="auth-point-icon" style={{ width: 30, height: 30, borderRadius: 9 }}>
                    <ShieldCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold">Private by default</div>
                    <p className="rn-hint mt-0.5">
                      Nothing is shared without your action. You can revoke guardian
                      access at any time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Wizard card ───────────────────────────────────────── */}
          <section className="rn-reg-card" aria-labelledby="reg-step-title">
            <div className="rn-mobile-progress">
              <div className="rn-progress-meta">
                <span>
                  Step {stepIndex + 1} of {totalSteps} · {STEP_TEXT[step].label}
                </span>
                <span>{percent}%</span>
              </div>
              <div
                className="rn-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label="Registration progress"
              >
                <span style={{ width: `${percent}%` }} />
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} {...stepMotion}>
                {/* ═══ STEP 1 · ROLE ═══ */}
                {step === "role" && (
                  <div>
                    <StepHeader
                      eyebrow="Choose your role"
                      title="How will you use RakshaNet?"
                      sub="Pick the role that matches your safety needs. You can change details later."
                    />

                    <div className="rn-role-cards" role="group" aria-label="Account role">
                      {ROLES.map((role) => {
                        const selected = data.role === role.key;
                        const Icon = role.icon;
                        return (
                          <button
                            key={role.key}
                            type="button"
                            onClick={() => update("role", role.key)}
                            className={`rn-role-card ${selected ? "is-active" : ""}`}
                            aria-pressed={selected}
                          >
                            <span className="rn-role-card-top">
                              <span
                                className={`rn-role-card-icon ${
                                  role.key === "GUARDIAN" ? "is-guardian" : role.key === "ADMIN" ? "is-admin" : ""
                                }`}
                              >
                                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                              </span>
                              {selected && (
                                <span className="rn-pill is-emerald">
                                  <Check className="h-3 w-3" aria-hidden="true" />
                                  Selected
                                </span>
                              )}
                            </span>
                            <span className="rn-role-card-title mt-3 block">{role.title}</span>
                            <span className="rn-role-card-desc block">{role.desc}</span>
                            <span className="rn-role-features">
                              {role.features.map((feature) => (
                                <span key={feature} className="rn-role-feature">
                                  <Check className="h-3 w-3 text-[var(--rn-primary)]" aria-hidden="true" />
                                  {feature}
                                </span>
                              ))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ═══ STEP 2 · BASIC ═══ */}
                {step === "basic" && (
                  <div>
                    <StepHeader
                      eyebrow="Your account"
                      title="Tell us about yourself"
                      sub={`Creating a ${data.role.toLowerCase()} account for ${roleLabel.toLowerCase()}.`}
                    />

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <Input
                        icon={<User className="h-4 w-4" aria-hidden="true" />}
                        label="Full name"
                        placeholder="Aanya Kapoor"
                        autoComplete="name"
                        value={data.fullName}
                        onChange={(value) => update("fullName", value)}
                        error={errors.fullName}
                      />
                      <Input
                        icon={<Mail className="h-4 w-4" aria-hidden="true" />}
                        label="Email address"
                        type="email"
                        placeholder="aanya@example.com"
                        autoComplete="email"
                        value={data.email}
                        onChange={(value) => update("email", value)}
                        error={errors.email}
                      />
                      <Input
                        icon={<Phone className="h-4 w-4" aria-hidden="true" />}
                        label="Phone number"
                        type="tel"
                        placeholder="+91 98XXX 12345"
                        autoComplete="tel"
                        value={data.phone}
                        onChange={(value) => update("phone", value)}
                        error={errors.phone}
                      />
                      <Input
                        icon={<Lock className="h-4 w-4" aria-hidden="true" />}
                        label="Password"
                        type="password"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        value={data.password}
                        onChange={(value) => update("password", value)}
                        error={errors.password}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          icon={<Lock className="h-4 w-4" aria-hidden="true" />}
                          label="Confirm password"
                          type="password"
                          placeholder="Repeat your password"
                          autoComplete="new-password"
                          value={data.confirmPassword}
                          onChange={(value) => update("confirmPassword", value)}
                          error={errors.confirmPassword}
                        />
                      </div>
                    </div>

                    <PasswordStrength password={data.password} />
                  </div>
                )}

                {/* ═══ STEP 3 · ROLE FIELDS ═══ */}
                {step === "roleFields" && (
                  <div>
                    {data.role === "USER" && (
                      <div>
                        <StepHeader
                          eyebrow="User profile"
                          title="Safety & medical details"
                          sub="Optional context that helps responders help you faster."
                        />

                        <div>
                          <div className="rn-label mb-2">Blood group</div>
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                            {BLOOD_GROUPS.map((group) => (
                              <button
                                key={group}
                                type="button"
                                onClick={() => update("bloodGroup", group)}
                                className={`rn-chip justify-center ${data.bloodGroup === group ? "is-active" : ""}`}
                                aria-pressed={data.bloodGroup === group}
                              >
                                {group}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rn-field mt-5">
                          <label className="rn-label" htmlFor="register-medical">
                            Medical information
                          </label>
                          <textarea
                            id="register-medical"
                            value={data.medicalInfo}
                            onChange={(event) => update("medicalInfo", event.target.value)}
                            placeholder="e.g. Asthma, allergic to penicillin, type-1 diabetes"
                            className="rn-textarea"
                          />
                          <p className="rn-hint">Shown only to the contacts and responders you choose.</p>
                        </div>

                        <div className="mt-5">
                          <Input
                            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                            label="Stealth PIN"
                            placeholder="4–6 digits"
                            inputMode="numeric"
                            value={data.stealthPin}
                            onChange={(value) =>
                              update("stealthPin", value.replace(/\D/g, "").slice(0, 6))
                            }
                            error={errors.stealthPin}
                            hint="Type this PIN on the fake calculator to trigger a silent SOS."
                          />
                        </div>

                        <label className="rn-check mt-5">
                          <input
                            type="checkbox"
                            checked={data.shareLocationWithGuardians}
                            onChange={(event) => update("shareLocationWithGuardians", event.target.checked)}
                          />
                          <span>
                            <span className="block text-sm font-semibold">Share live location with guardians</span>
                            <span className="rn-hint block">You can revoke this anytime in settings.</span>
                          </span>
                        </label>
                      </div>
                    )}

                    {data.role === "GUARDIAN" && (
                      <div>
                        <StepHeader
                          eyebrow="Guardian profile"
                          title="Guardian setup"
                          sub="Choose how you'll watch over your wards and how alerts reach you."
                        />

                        <div>
                          <div className="rn-label mb-2">Primary relation type</div>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {RELATIONS.map((relation) => (
                              <button
                                key={relation}
                                type="button"
                                onClick={() => update("relationType", relation)}
                                className={`rn-chip justify-center ${data.relationType === relation ? "is-active" : ""}`}
                                aria-pressed={data.relationType === relation}
                              >
                                {relation}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6">
                          <div className="rn-label mb-2">Notification channels</div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {([
                              ["sms", "SMS alerts", MessageSquare, "Instant text to your phone"],
                              ["whatsapp", "WhatsApp alerts", MessageSquare, "Rich media and live map links"],
                              ["call", "Voice calls", PhoneCall, "Auto-call on a critical SOS"],
                              ["push", "Push notifications", Activity, "In-app and browser alerts"],
                            ] as const).map(([key, label, Icon, description]) => (
                              <label key={key} className="rn-check">
                                <input
                                  type="checkbox"
                                  checked={data.notifyVia[key]}
                                  onChange={(event) =>
                                    update("notifyVia", { ...data.notifyVia, [key]: event.target.checked })
                                  }
                                />
                                <span className="flex items-start gap-2">
                                  <Icon className="mt-0.5 h-4 w-4 text-[var(--rn-primary)]" aria-hidden="true" />
                                  <span>
                                    <span className="block text-sm font-semibold">{label}</span>
                                    <span className="rn-hint block">{description}</span>
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <label className="rn-check mt-5">
                          <input
                            type="checkbox"
                            checked={data.verifyIdentity}
                            onChange={(event) => update("verifyIdentity", event.target.checked)}
                          />
                          <span>
                            <span className="flex items-center gap-1.5 text-sm font-semibold">
                              <BadgeCheck className="h-4 w-4 text-[var(--rn-primary)]" aria-hidden="true" />
                              Verify my identity
                            </span>
                            <span className="rn-hint block">
                              Your ward receives a verification code to confirm you.
                            </span>
                          </span>
                        </label>

                        <div className="rn-inline-note mt-4">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rn-primary)]" aria-hidden="true" />
                          <span>
                            Guardian access is limited to the wards who approve you. Removing
                            a ward stops future alerts and location immediately.
                          </span>
                        </div>
                      </div>
                    )}

                    {data.role === "ADMIN" && (
                      <div>
                        <StepHeader
                          eyebrow="Admin credentials"
                          title="Admin verification"
                          sub="Admin access requires organization verification and an operations code."
                        />

                        <div className="grid gap-3.5 sm:grid-cols-2">
                          <Input
                            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
                            label="Organization"
                            placeholder="Delhi Police / NGO / Ministry"
                            value={data.organization}
                            onChange={(value) => update("organization", value)}
                            error={errors.organization}
                          />
                          <Input
                            icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
                            label="Badge / employee ID"
                            placeholder="DP-2024-4521"
                            value={data.badgeId}
                            onChange={(value) => update("badgeId", value)}
                            error={errors.badgeId}
                          />
                          <div className="sm:col-span-2">
                            <Input
                              icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                              label="Jurisdiction"
                              placeholder="Delhi NCR"
                              value={data.jurisdiction}
                              onChange={(value) => update("jurisdiction", value)}
                            />
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {JURISDICTIONS.map((jurisdiction) => (
                                <button
                                  key={jurisdiction}
                                  type="button"
                                  onClick={() => update("jurisdiction", jurisdiction)}
                                  className={`rn-chip ${data.jurisdiction === jurisdiction ? "is-active" : ""}`}
                                  aria-pressed={data.jurisdiction === jurisdiction}
                                >
                                  {jurisdiction}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                              label="Admin secret code"
                              placeholder="Provided by the RakshaNet operations team"
                              value={data.adminSecretCode}
                              onChange={(value) => update("adminSecretCode", value)}
                              error={errors.adminSecretCode}
                              hint={
                                <>
                                  Demo code: <strong className="text-[var(--rn-amber)]">AEGIS-ADMIN-2026</strong>
                                </>
                              }
                            />
                          </div>
                        </div>

                        <div className="rn-inline-note mt-4">
                          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rn-amber)]" aria-hidden="true" />
                          <span>
                            Admin accounts can view city-wide analytics, verify reports,
                            dispatch response teams and open SOS alerts. Every action is audit logged.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ STEP 4 · CONTACTS ═══ */}
                {step === "contacts" && data.role === "USER" && (
                  <div>
                    <StepHeader
                      eyebrow="Trusted circle"
                      title="Emergency contacts"
                      sub="Add the people who will be alerted when you trigger SOS. You can change this later."
                    />

                    {errors.contacts && (
                      <div className="rn-alert mb-4" role="alert">
                        <Heart className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{errors.contacts}</span>
                      </div>
                    )}

                    <div className="grid gap-2.5">
                      {data.contacts.map((contact, index) => (
                        <motion.div
                          key={index}
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                          className="rounded-2xl border border-[var(--rn-border)] bg-[var(--rn-bg-soft)] p-3.5"
                        >
                          <div className="mb-2.5 flex items-center justify-between gap-2">
                            <div className="text-[13px] font-semibold">Contact {index + 1}</div>
                            {data.contacts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeContact(index)}
                                className="rn-icon-btn"
                                style={{ width: 32, height: 32 }}
                                aria-label={`Remove contact ${index + 1}`}
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rn-input-wrap">
                              <input
                                aria-label={`Contact ${index + 1} full name`}
                                placeholder="Full name"
                                value={contact.name}
                                onChange={(event) => updateContact(index, "name", event.target.value)}
                                className="rn-input"
                              />
                            </div>
                            <select
                              aria-label={`Contact ${index + 1} relation`}
                              value={contact.relation}
                              onChange={(event) => updateContact(index, "relation", event.target.value)}
                              className="rn-select"
                            >
                              {RELATIONS.map((relation) => (
                                <option key={relation} value={relation}>
                                  {relation}
                                </option>
                              ))}
                            </select>
                            <div className="rn-input-wrap">
                              <input
                                aria-label={`Contact ${index + 1} phone number`}
                                placeholder="+91 98XXX XXXXX"
                                inputMode="tel"
                                value={contact.phone}
                                onChange={(event) => updateContact(index, "phone", event.target.value)}
                                className="rn-input"
                              />
                            </div>
                          </div>
                          {errors[`contact_${index}`] && (
                            <p className="rn-error mt-2">⚠ {errors[`contact_${index}`]}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {data.contacts.length < 5 && (
                      <button
                        type="button"
                        onClick={addContact}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--rn-border-strong)] py-3 text-[13px] font-semibold text-[var(--rn-ink-soft)] transition hover:border-[var(--rn-primary)] hover:text-[var(--rn-primary-strong)]"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add another contact ({data.contacts.length}/5)
                      </button>
                    )}

                    <div className="rn-inline-note mt-4">
                      <Heart className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rn-accent)]" aria-hidden="true" />
                      <span>
                        We recommend at least two trusted contacts. They receive only the
                        alert content you approve, for as long as you grant access.
                      </span>
                    </div>
                  </div>
                )}

                {/* ═══ STEP 5 · REVIEW ═══ */}
                {step === "review" && (
                  <div>
                    <StepHeader
                      eyebrow="Final step"
                      title="Review and create account"
                      sub="Check the details below. You can go back and change anything."
                    />

                    <div className="grid gap-2.5">
                      <ReviewSection title="Account">
                        <ReviewRow label="Role" value={data.role} />
                        <ReviewRow label="Name" value={data.fullName} />
                        <ReviewRow label="Email" value={data.email} />
                        <ReviewRow label="Phone" value={data.phone} />
                      </ReviewSection>

                      {data.role === "USER" && (
                        <ReviewSection title="Safety profile">
                          <ReviewRow label="Blood group" value={data.bloodGroup || "—"} />
                          <ReviewRow label="Medical info" value={data.medicalInfo || "—"} />
                          <ReviewRow
                            label="Stealth PIN"
                            value={data.stealthPin ? "•".repeat(data.stealthPin.length) : "—"}
                          />
                          <ReviewRow
                            label="Share location"
                            value={data.shareLocationWithGuardians ? "Yes" : "No"}
                          />
                        </ReviewSection>
                      )}

                      {data.role === "USER" && data.contacts.filter((contact) => contact.name).length > 0 && (
                        <ReviewSection
                          title={`Emergency contacts (${data.contacts.filter((contact) => contact.name).length})`}
                        >
                          {data.contacts
                            .filter((contact) => contact.name)
                            .map((contact, index) => (
                              <ReviewRow
                                key={index}
                                label={contact.relation}
                                value={`${contact.name} · ${contact.phone}`}
                              />
                            ))}
                        </ReviewSection>
                      )}

                      {data.role === "GUARDIAN" && (
                        <ReviewSection title="Guardian settings">
                          <ReviewRow label="Relation" value={data.relationType} />
                          <ReviewRow label="Identity verify" value={data.verifyIdentity ? "Yes" : "No"} />
                          <ReviewRow
                            label="Notify via"
                            value={
                              Object.entries(data.notifyVia)
                                .filter(([, enabled]) => enabled)
                                .map(([channel]) => channel.toUpperCase())
                                .join(", ") || "None"
                            }
                          />
                        </ReviewSection>
                      )}

                      {data.role === "ADMIN" && (
                        <ReviewSection title="Admin verification">
                          <ReviewRow label="Organization" value={data.organization} />
                          <ReviewRow label="Badge ID" value={data.badgeId} />
                          <ReviewRow label="Jurisdiction" value={data.jurisdiction} />
                          <ReviewRow label="Admin code" value="••••••" />
                        </ReviewSection>
                      )}
                    </div>

                    <label className="rn-check mt-4">
                      <input type="checkbox" defaultChecked />
                      <span className="rn-hint">
                        I agree to the RakshaNet Terms of Service and Privacy Policy. I understand
                        that I can revoke shared access at any time.
                      </span>
                    </label>

                    <div className="rn-inline-note mt-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rn-primary)]" aria-hidden="true" />
                      <span>
                        After creating your account you can add contacts, test an alert and
                        review every delivery attempt.
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="rn-reg-actions">
              <button type="button" onClick={back} disabled={step === "role"} className="rn-back">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>

              {step === "review" ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className="rn-btn rn-btn-primary"
                >
                  {loading ? "Creating account…" : `Create ${data.role.toLowerCase()} account`}
                  {!loading && <Sparkles className="h-4 w-4" aria-hidden="true" />}
                </button>
              ) : (
                <button type="button" onClick={next} className="rn-btn rn-btn-primary">
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </section>
        </div>

        <p className="rn-faint mx-auto mt-6 max-w-2xl text-center text-[11px] leading-relaxed">
          RakshaNet does not replace emergency services. In immediate danger, call{" "}
          <a href="tel:112" className="font-semibold text-[var(--rn-primary-strong)]">
            112
          </a>
          . Demo builds store account details locally in your browser.
        </p>
      </main>
    </div>
  );
}

/* ── Step helpers ─────────────────────────────────────────────────── */
function StepHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="mb-6">
      <div className="rn-eyebrow">{eyebrow}</div>
      <h1 id="reg-step-title" className="rn-reg-title mt-3">
        {title}
      </h1>
      <p className="rn-reg-sub">{sub}</p>
    </div>
  );
}

function Input({
  icon,
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
  type = "text",
  autoComplete,
  inputMode,
}: {
  icon?: React.ReactNode;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: React.ReactNode;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
}) {
  const id = useId();
  return (
    <div className="rn-field">
      <label className="rn-label" htmlFor={id}>
        {label}
      </label>
      <div className={`rn-input-wrap ${error ? "is-error" : ""}`}>
        {icon && <span className="rn-input-icon">{icon}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="rn-input"
        />
      </div>
      {hint && <p className="rn-hint">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="rn-error">
          ⚠ {error}
        </p>
      )}
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
  const score = checks.filter((check) => check.ok).length;
  const label = score === 0 ? "" : score <= 2 ? "Weak" : score === 3 ? "Good" : "Strong";
  const tone = score <= 2 ? "is-weak" : score === 3 ? "is-good" : "is-strong";

  if (!password) return null;

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="rn-faint">Password strength</span>
        <span
          className="font-semibold"
          style={{
            color:
              score <= 2
                ? "var(--rn-accent-strong)"
                : score === 3
                  ? "var(--rn-amber)"
                  : "var(--rn-primary-strong)",
          }}
        >
          {label}
        </span>
      </div>
      <div className="rn-strength-track" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={`rn-strength-seg ${index < score ? tone : ""}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`flex items-center gap-1 text-[10px] ${
              check.ok ? "text-[var(--rn-primary-strong)]" : "text-[var(--rn-ink-faint)]"
            }`}
          >
            {check.ok ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3" aria-hidden="true" />
            )}
            {check.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rn-review">
      <div className="rn-review-title">
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        {title}
      </div>
      <dl>{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rn-review-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
