import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  HardDrive,
  HeartHandshake,
  LockKeyhole,
  MapPin,
  Menu,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Siren,
  Users,
  WifiOff,
  X,
} from "lucide-react";

const navLinks = [
  { label: "Platform", href: "#platform" },
  { label: "How it works", href: "#how" },
  { label: "Delivery truth", href: "#trust" },
  { label: "Privacy", href: "#privacy" },
];

const stats = [
  { value: "<1s", label: "Local SOS written" },
  { value: "4", label: "Delivery states, per channel" },
  { value: "0", label: "Silent location shares" },
  { value: "24/7", label: "Offline-ready" },
];

const features = [
  {
    icon: ShieldCheck,
    tone: "",
    title: "Offline SOS",
    desc: "Hold to record an emergency locally before any network call. The event is safe even when the signal is not.",
  },
  {
    icon: MapPin,
    tone: "lp-icon-rose",
    title: "Location with context",
    desc: "Fresh GPS when available, last-known as fallback — with accuracy and freshness always attached.",
  },
  {
    icon: Users,
    tone: "lp-icon-amber",
    title: "Your trusted circle",
    desc: "Choose who hears from you, in what order, and through which channel. No one is added silently.",
  },
  {
    icon: MessageSquareText,
    tone: "",
    title: "Every channel that works",
    desc: "WhatsApp hand-off, SMS, push or a one-tap call. Queued alerts keep trying as connectivity returns.",
  },
  {
    icon: BadgeCheck,
    tone: "lp-icon-rose",
    title: "Honest delivery",
    desc: "Queued, prepared, sent, acknowledged. Per contact, per channel — with no optimistic green ticks.",
  },
  {
    icon: LockKeyhole,
    tone: "lp-icon-amber",
    title: "Private by default",
    desc: "Per-event sharing, time-boxed access and instant revocation. Nothing leaves the device without your action.",
  },
];

const steps = [
  {
    icon: Siren,
    title: "Hold",
    desc: "Press and hold the SOS button. No connection, account lookup or network handshake is required.",
  },
  {
    icon: HardDrive,
    title: "Record",
    desc: "Time, location and device state are written locally in under a second — before the first delivery attempt.",
  },
  {
    icon: Radio,
    title: "Reach",
    desc: "The alert moves through every channel still open while you see the real status of each contact.",
  },
];

const deliveryTruth = [
  { label: "Queued", desc: "Saved on your device. Nothing has left yet." },
  { label: "Prepared", desc: "Message, time and location are ready for a channel." },
  { label: "Sent", desc: "The provider accepted it — that is all “sent” can mean." },
  { label: "Acknowledged", desc: "A contact confirmed they saw the alert." },
];

const promises = [
  {
    icon: HeartHandshake,
    title: "Consent first",
    desc: "Contacts receive only what you choose, for as long as you grant it.",
  },
  {
    icon: LockKeyhole,
    title: "Revoke instantly",
    desc: "Removing a contact stops future alerts and location immediately.",
  },
  {
    icon: ShieldCheck,
    title: "Calm under pressure",
    desc: "Large targets, plain language and a quiet interface when everything feels loud.",
  },
];

const truthPills = [
  { label: "Queued", state: "is-done" },
  { label: "Prepared", state: "is-done" },
  { label: "Sent", state: "is-current" },
  { label: "Acked", state: "" },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const enter = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  const reveal = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-60px" },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="landing-page">
      <div className="lp-backdrop" aria-hidden="true">
        <div className="lp-grid" />
      </div>

      <a href="#main" className="lp-skip">
        Skip to content
      </a>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="lp-nav">
        <div className="lp-container flex h-[76px] items-center justify-between gap-4">
          <Link to="/" className="lp-logo-link flex items-center gap-3" aria-label="RakshaNet home">
            <span className="lp-logo">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              <span className="lp-logo-dot" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[17px] font-semibold tracking-tight">RakshaNet</span>
              <span className="lp-faint mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                Offline-first safety
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="lp-nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-sm hidden sm:inline-flex">
              Sign in
            </Link>
            <Link to="/register" className="lp-btn lp-btn-primary lp-btn-sm hidden sm:inline-flex">
              Create account
            </Link>
            <button
              type="button"
              className="lp-btn lp-btn-ghost lp-btn-icon lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="lp-mobile-nav"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="lp-mobile-nav" className="lp-container pb-4 lg:hidden">
            <nav className="lp-mobile-panel" aria-label="Mobile">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="lp-mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
              <div className="mt-2 grid gap-2 border-t border-[var(--lp-border)] pt-3">
                <Link to="/login" className="lp-btn lp-btn-ghost">
                  Sign in
                </Link>
                <Link to="/register" className="lp-btn lp-btn-primary">
                  Create account
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main" className="relative z-10">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="lp-container pb-12 pt-14 sm:pt-20 lg:pb-16 lg:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            <div>
              <motion.div {...enter(0)} className="lp-eyebrow">
                Offline-first safety for women &amp; children
              </motion.div>

              <motion.h1
                {...enter(0.08)}
                className="lp-display mt-5 text-balance text-[2.45rem] sm:text-6xl lg:text-[4.5rem]"
              >
                Safety that <em>doesn&apos;t wait</em> for a signal.
              </motion.h1>

              <motion.p
                {...enter(0.18)}
                className="lp-muted mt-6 max-w-xl text-[15px] leading-relaxed sm:text-[17px]"
              >
                RakshaNet writes an SOS to your device in under a second, then reaches the
                people you trust through every channel still open — internet, SMS or a call.
              </motion.p>

              <motion.div {...enter(0.26)} className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/register" className="lp-btn lp-btn-primary">
                  Create your safety circle
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a href="#how" className="lp-btn lp-btn-ghost">
                  See how it works
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </a>
              </motion.div>

              <motion.ul
                {...enter(0.34)}
                className="lp-muted mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px]"
              >
                {["No silent tracking", "Revoke access anytime", "Works in airplane mode"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-[var(--lp-primary)]" aria-hidden="true" />
                      {item}
                    </li>
                  ),
                )}
              </motion.ul>
            </div>

            {/* Product preview */}
            <motion.div
              {...(reduceMotion
                ? {}
                : {
                    initial: { opacity: 0, y: 30, scale: 0.97 },
                    animate: { opacity: 1, y: 0, scale: 1 },
                    transition: {
                      duration: 0.8,
                      delay: 0.2,
                      ease: [0.22, 1, 0.36, 1] as const,
                    },
                  })}
              className="lp-visual-wrap mx-auto w-full max-w-[430px] lg:max-w-none"
            >
              <div className="lp-float lp-float-a" aria-hidden="true">
                <WifiOff className="h-4 w-4 text-[var(--lp-primary)]" />
                Works offline
              </div>
              <div className="lp-float lp-float-b" aria-hidden="true">
                <BadgeCheck className="h-4 w-4 text-[var(--lp-accent-strong)]" />
                No false “sent”
              </div>

              <div className="lp-app-card">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <span className="lp-app-logo">
                      <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold tracking-tight">RakshaNet</div>
                      <div className="lp-faint text-[10px]">Protection active</div>
                    </div>
                  </div>
                  <span className="lp-live">
                    <span className="lp-live-dot" aria-hidden="true" />
                    Offline ready
                  </span>
                </div>

                <div className="lp-sos-stage">
                  <div className="lp-sos-orb-wrap">
                    <span className="lp-sos-ring" aria-hidden="true" />
                    <span className="lp-sos-ring" aria-hidden="true" />
                    <span className="lp-sos-ring" aria-hidden="true" />
                    <div className="lp-sos-orb">
                      <Siren className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                      <span className="lp-sos-title">SOS</span>
                      <span className="lp-sos-label">Hold 3 sec</span>
                    </div>
                  </div>
                  <p className="lp-faint mt-2 max-w-[15rem] text-center text-[11px] leading-snug">
                    The alert is saved on this device before any network call.
                  </p>
                </div>

                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div className="lp-mini">
                    <span className="lp-mini-icon">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="lp-mini-title">GPS ready</div>
                      <div className="lp-mini-sub">Fresh · ±12 m</div>
                    </div>
                  </div>
                  <div className="lp-mini">
                    <span className="lp-mini-icon">
                      <HardDrive className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="lp-mini-title">Saved locally</div>
                      <div className="lp-mini-sub">In under 1 second</div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-bg-soft)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold">Your trusted circle</span>
                    <span className="lp-faint text-[10px]">5 people</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center">
                      {["A", "M", "R", "+2"].map((initials) => (
                        <span key={initials} className="lp-avatar">
                          {initials}
                        </span>
                      ))}
                    </div>
                    <span className="lp-faint text-[10px]">Primary: Aarti</span>
                  </div>
                </div>

                <div className="lp-truth">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold">Delivery truth</span>
                    <span className="lp-faint text-[10px]">Per contact · per channel</span>
                  </div>
                  <div className="lp-truth-track">
                    <span className="lp-truth-line" aria-hidden="true" />
                    {truthPills.map((pill) => (
                      <div
                        key={pill.label}
                        className={`lp-truth-step ${pill.state}`.trim()}
                      >
                        <span className="lp-truth-dot" aria-hidden="true" />
                        {pill.label}
                      </div>
                    ))}
                  </div>
                  <p className="lp-faint mt-2 text-[10px] leading-snug">
                    A WhatsApp hand-off is never reported as delivered.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Honest stats ─────────────────────────────────────────── */}
        <motion.section {...reveal(0.05)} className="lp-container pb-6">
          <div className="lp-stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="lp-stat">
                <div className="lp-display text-3xl text-[var(--lp-primary-strong)] sm:text-[2rem]">
                  {stat.value}
                </div>
                <div className="lp-faint mt-1.5 text-[11px] font-medium leading-snug">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Features ─────────────────────────────────────────────── */}
        <section id="platform" className="lp-container scroll-mt-28 py-16 sm:py-20">
          <motion.div {...reveal(0)} className="max-w-2xl">
            <span className="lp-eyebrow">The essentials, done properly</span>
            <h2 className="lp-display mt-4 text-balance text-3xl sm:text-4xl lg:text-[3.1rem]">
              A safety net that doesn&apos;t need a signal.
            </h2>
            <p className="lp-muted mt-4 text-[15px] leading-relaxed sm:text-base">
              Every core action is device-first. The network is a channel, not a dependency —
              so the first, most important second never waits on it.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  {...reveal(0.04 * i)}
                  className="lp-card lp-card-hover p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`lp-icon ${feature.tone}`.trim()}>
                      <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="lp-card-num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="lp-muted mt-2 text-sm leading-relaxed">{feature.desc}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section id="how" className="lp-container scroll-mt-28 py-4 sm:py-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <motion.div {...reveal(0)} className="lg:pt-2">
              <span className="lp-eyebrow">How it works</span>
              <h2 className="lp-display mt-4 text-balance text-3xl sm:text-4xl">
                From hold to help in three moves.
              </h2>
              <p className="lp-muted mt-4 max-w-md text-[15px] leading-relaxed">
                No onboarding maze, no connection check, no silent waiting. The first action
                is always local — the rest is delivery.
              </p>
            </motion.div>

            <div className="relative grid gap-4 sm:grid-cols-3">
              <div
                className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-[var(--lp-border-strong)] sm:block"
                aria-hidden="true"
              />
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    {...reveal(0.08 * i)}
                    className="lp-step-card"
                  >
                    <span className="lp-step-badge">
                      <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="lp-faint text-[10px] font-bold tracking-[0.16em]">
                        0{i + 1}
                      </span>
                      <h3 className="text-[17px] font-semibold tracking-tight">{step.title}</h3>
                    </div>
                    <p className="lp-muted mt-2 text-sm leading-relaxed">{step.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Delivery truth ───────────────────────────────────────── */}
        <section id="trust" className="lp-container scroll-mt-28 py-16 sm:py-20">
          <motion.div {...reveal(0)} className="lp-dark grid gap-10 p-7 sm:p-10 lg:grid-cols-2 lg:p-14">
            <div className="relative z-10">
              <span className="lp-eyebrow">Honest by design</span>
              <h2 className="lp-display mt-4 text-balance text-3xl sm:text-4xl lg:text-[3rem]">
                We never call it “sent” when it isn&apos;t.
              </h2>
              <p className="lp-dark-muted mt-5 max-w-lg text-[15px] leading-relaxed">
                Opening WhatsApp is a hand-off, not a delivery. RakshaNet shows exactly what
                happened, contact by contact and channel by channel — even when that answer is
                uncomfortable.
              </p>

              <ul className="mt-7 space-y-3">
                {[
                  "We don't call a WhatsApp hand-off a delivery.",
                  "We don't share location without your consent.",
                  "We don't hide a failed channel.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgba(111,224,189,0.14)] text-[#8fe8cd]">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span className="text-[#e6f2ee]">{item}</span>
                  </li>
                ))}
              </ul>

              <Link to="/register" className="lp-btn lp-btn-outline-light mt-8">
                See it in the app
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="relative z-10 space-y-2.5">
              {deliveryTruth.map((state, i) => (
                <motion.div key={state.label} {...reveal(0.05 * i)} className="lp-status">
                  <span className="lp-status-num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="text-sm font-semibold tracking-tight">{state.label}</div>
                    <p className="lp-dark-muted mt-1 text-[13px] leading-relaxed">{state.desc}</p>
                  </div>
                </motion.div>
              ))}
              <p className="lp-dark-muted pt-2 text-[11px] leading-relaxed">
                “Delivered” requires a signed provider webhook. Simulated sends are always
                labelled as simulated.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ── Privacy ──────────────────────────────────────────────── */}
        <section id="privacy" className="lp-container scroll-mt-28 py-4 sm:py-8">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            <motion.div {...reveal(0)}>
              <span className="lp-eyebrow">Trust, in plain language</span>
              <h2 className="lp-display mt-4 text-balance text-3xl sm:text-4xl">
                Your safety. Your data. Your call.
              </h2>
              <p className="lp-muted mt-4 max-w-md text-[15px] leading-relaxed">
                Safety tools carry private information by definition. RakshaNet is built to
                share less by default and to make every exception visible.
              </p>
              <div className="lp-quote mt-8">
                <p className="lp-quote-text">
                  “Safety tools should be honest, especially when they fail.”
                </p>
                <p className="lp-faint mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                  Our design principle
                </p>
              </div>
            </motion.div>

            <div className="grid content-start gap-3">
              {promises.map((promise, i) => {
                const Icon = promise.icon;
                return (
                  <motion.div
                    key={promise.title}
                    {...reveal(0.06 * i)}
                    className="lp-promise"
                  >
                    <span className="lp-icon shrink-0">
                      <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold tracking-tight">
                        {promise.title}
                      </h3>
                      <p className="lp-muted mt-1 text-sm leading-relaxed">{promise.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="lp-container py-16 sm:py-20">
          <motion.div {...reveal(0)} className="lp-cta">
            <div className="relative z-10 max-w-2xl">
              <span className="lp-eyebrow">Start small</span>
              <h2 className="lp-display mt-4 text-balance text-3xl text-white sm:text-4xl lg:text-[3.15rem]">
                Your safety circle can be ready in two minutes.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#d6efe8]">
                Create an account, add one trusted contact, and try a test alert — even in
                airplane mode.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="lp-btn lp-btn-light">
                  Create account
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/login" className="lp-btn lp-btn-outline-light">
                  Sign in
                </Link>
              </div>
              <p className="mt-6 text-xs leading-relaxed text-[#bfe3d9]">
                RakshaNet does not replace emergency services. In immediate danger, call 112.
              </p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="lp-footer relative z-10">
        <div className="lp-container py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Link to="/" className="flex items-center gap-3" aria-label="RakshaNet home">
                <span className="lp-logo">
                  <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  <span className="lp-logo-dot" aria-hidden="true" />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="text-[17px] font-semibold tracking-tight">RakshaNet</span>
                  <span className="lp-faint mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    Offline-first safety
                  </span>
                </span>
              </Link>
              <p className="lp-muted mt-4 max-w-xs text-sm leading-relaxed">
                Offline-first safety for women and children — built to work when the network
                doesn&apos;t.
              </p>
              <span className="lp-faint mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-1.5 text-[11px] font-semibold">
                <WifiOff className="h-3.5 w-3.5 text-[var(--lp-primary)]" aria-hidden="true" />
                Works without internet
              </span>
            </div>

            <nav aria-label="Platform">
              <h2 className="lp-faint text-[11px] font-bold uppercase tracking-[0.16em]">
                Platform
              </h2>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a href="#platform" className="lp-footer-link">
                    Offline SOS
                  </a>
                </li>
                <li>
                  <a href="#platform" className="lp-footer-link">
                    Trusted contacts
                  </a>
                </li>
                <li>
                  <a href="#trust" className="lp-footer-link">
                    Delivery truth
                  </a>
                </li>
                <li>
                  <a href="#privacy" className="lp-footer-link">
                    Privacy controls
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Account">
              <h2 className="lp-faint text-[11px] font-bold uppercase tracking-[0.16em]">
                Account
              </h2>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link to="/login" className="lp-footer-link">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="lp-footer-link">
                    Create account
                  </Link>
                </li>
                <li>
                  <a href="#how" className="lp-footer-link">
                    How it works
                  </a>
                </li>
              </ul>
            </nav>

            <div>
              <h2 className="lp-faint text-[11px] font-bold uppercase tracking-[0.16em]">
                Principles
              </h2>
              <ul className="mt-4 space-y-2.5">
                <li className="lp-footer-link">Honest delivery</li>
                <li className="lp-footer-link">Consent by default</li>
                <li className="lp-footer-link">Instant revocation</li>
                <li className="lp-footer-link">Offline-first</li>
              </ul>
            </div>
          </div>

          <div className="lp-faint mt-10 flex flex-col gap-3 border-t border-[var(--lp-border)] pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 RakshaNet. Built by Anurudh Singh.</p>
            <p>
              RakshaNet does not replace emergency services. In immediate danger, call{" "}
              <a href="tel:112" className="font-semibold text-[var(--lp-primary-strong)]">
                112
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
