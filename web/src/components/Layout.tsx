import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LayoutDashboard, Siren, MapPinned, Flame, Users, Bot, Eye, Command,
  LogOut, Bell, Search, Activity, Menu, X, Radio, Sparkles,
  UserCheck, Heart, History, Settings, FileText, BarChart3, Server, UserCog,
  ShieldAlert, ClipboardList, AlertTriangle, CheckCircle2, ShieldCheck, Mic,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { useSafetyStore } from "../store/safetyStore";
import { sosApi } from "../api/endpoints";
import { DemoCallOverlay } from "./DemoCallOverlay";
import { IntegratedVoiceGuard } from "./IntegratedVoiceGuard";
import { checkDistressKeywords, executeVoiceDistressDispatch } from "../services/voiceDistressService";

const userNav = [
  { to: "/app/dashboard", label: "Command Deck", icon: LayoutDashboard },
  { to: "/app/sos", label: "SOS Center", icon: Siren },
  { to: "/app/journey", label: "Safe Journey", icon: ShieldCheck },
  { to: "/app/features", label: "9 AI Features", icon: Sparkles },
  { to: "/app/tracking", label: "Live Tracking", icon: MapPinned },
  { to: "/app/heatmap", label: "Threat Heatmap", icon: Flame },
  { to: "/app/community", label: "Community Intel", icon: Users },
  { to: "/app/ai", label: "AI Safety Copilot", icon: Bot },
];

const guardianNav = [
  { to: "/app/guardian", label: "Guardian Dashboard", icon: Eye },
  { to: "/app/guardian/wards", label: "My Wards", icon: UserCheck },
  { to: "/app/guardian/tracking", label: "Live Tracking", icon: MapPinned },
  { to: "/app/guardian/alerts", label: "SOS Alerts", icon: ShieldAlert },
  { to: "/app/guardian/history", label: "Ward History", icon: History },
  { to: "/app/guardian/contacts", label: "Emergency Contacts", icon: Heart },
  { to: "/app/guardian/settings", label: "Settings", icon: Settings },
];

const adminNav = [
  { to: "/app/admin", label: "Command Center", icon: Command },
  { to: "/app/admin/users", label: "User Management", icon: UserCog },
  { to: "/app/admin/incidents", label: "Incident Verification", icon: ClipboardList },
  { to: "/app/admin/analytics", label: "City Analytics", icon: BarChart3 },
  { to: "/app/admin/reports", label: "Community Reports", icon: FileText },
  { to: "/app/admin/system", label: "System Health", icon: Server },
  { to: "/app/admin/settings", label: "Settings", icon: Settings },
];

// ── Global Bystander/SOS Wake Alert ────────────────────────────────────
// Runs on EVERY page inside the Layout. Mangesh will be alerted
// the moment Nitesh (or anyone) triggers a Bystander Beacon / SOS.
//
// BULLETPROOF: Uses suppressUntil timestamp — once user resolves/dismisses,
// ALL alerts are suppressed for minutes. Multiple SOS IDs cannot re-trigger.
function GlobalBeaconWatcher() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  interface BeaconAlert {
    id: string;
    triggeredBy: string;
    area: string;
    lat: number;
    lng: number;
  }

  const [beaconAlert, setBeaconAlert] = useState<BeaconAlert | null>(null);

  // Single ref object — all mutable polling state lives here, always current
  const S = useRef({
    userName: user?.name || "",
    suppressUntil: 0,      // timestamp ms — block ALL alerts until this time
    shownAlertId: "",      // currently shown alert id
    speaking: false,
  });

  // Keep userName current when user changes
  useEffect(() => { S.current.userName = user?.name || ""; }, [user]);

  const checkAlerts = useCallback(async () => {
    const { userName, suppressUntil } = S.current;
    if (!userName) return;

    // ✅ SUPPRESSED — user explicitly acted, don't re-show anything
    if (Date.now() < suppressUntil) return;

    try {
      const alerts = await sosApi.active();
      const FIFTEEN_MIN = 15 * 60 * 1000;
      const now = Date.now();

      const incomingAlert = alerts.find((a) => {
        // Skip alerts by the current user
        if (a.userName.toLowerCase().includes(userName.toLowerCase())) return false;
        if (userName.toLowerCase().includes(a.userName.toLowerCase())) return false;

        // ✅ KEY FIX: Skip alerts whose areaName mentions current user
        // e.g. "Bystander Beacon Activated by Nitesh" — Nitesh triggered it, skip on Nitesh's tab
        if (a.areaName?.toLowerCase().includes(userName.toLowerCase())) return false;

        // ✅ Skip STALE alerts older than 15 minutes — prevents old DB records from re-firing
        if (a.createdAt) {
          const age = now - new Date(a.createdAt).getTime();
          if (age > FIFTEEN_MIN) return false;
        }

        return true;
      });

      if (incomingAlert) {
        if (S.current.shownAlertId !== incomingAlert.id) {
          S.current.shownAlertId = incomingAlert.id;
          setBeaconAlert({
            id: incomingAlert.id,
            triggeredBy: incomingAlert.userName,
            area: incomingAlert.areaName || "Nearby location",
            lat: incomingAlert.latitude,
            lng: incomingAlert.longitude,
          });
          if (!S.current.speaking) {
            S.current.speaking = true;
            const isBystander = incomingAlert.areaName?.toLowerCase().includes("bystander");
            const voiceMsg = isBystander
              ? `Urgent! ${incomingAlert.userName} has activated a Bystander Distress Beacon near you! Someone needs immediate help! Please respond now!`
              : `Emergency alert! ${incomingAlert.userName} has triggered an SOS signal near ${incomingAlert.areaName || "your location"}. Please assist immediately!`;
            const utterance = new SpeechSynthesisUtterance(voiceMsg);
            utterance.rate = 0.88;
            utterance.pitch = 1.25;
            utterance.volume = 1.0;
            utterance.onend = () => { S.current.speaking = false; };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }
        }
      } else {
        if (S.current.shownAlertId && !S.current.shownAlertId.startsWith("bc-beacon-")) {
          S.current.shownAlertId = "";
          setBeaconAlert(null);
          S.current.speaking = false;
        }
      }
    } catch (_) { /* Backend offline — silent */ }
  }, []); // No deps — all state via ref

  useEffect(() => {
    checkAlerts();
    const id = setInterval(checkAlerts, 5000);
    return () => clearInterval(id);
  }, [checkAlerts]);

  // ── INSTANT BroadcastChannel listener ────────────────────────────────
  // Receives BYSTANDER_BEACON_ACTIVE immediately when Nitesh fires the beacon.
  // Mangesh gets the overlay with ZERO polling delay regardless of backend state.
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("aegis_beacon");
      bc.onmessage = (e) => {
        const { type, triggeredBy, lat, lng, area, responderNames } = e.data;
        const myName = S.current.userName;
        if (!myName || !triggeredBy) return;

        // ✅ Don't alert the person who triggered the beacon
        // Use partial matching to handle "Nitesh" vs "Nitesh Kumar" etc.
        const iAmTrigger =
          triggeredBy.toLowerCase().includes(myName.toLowerCase()) ||
          myName.toLowerCase().includes(triggeredBy.toLowerCase());
        if (iAmTrigger) return;

        if (type === "BYSTANDER_BEACON_ACTIVE") {
          // Check if I am among the ranked responders
          const isSelectedResponder = Array.isArray(responderNames) &&
            responderNames.some(
              (n: string) =>
                n.toLowerCase().includes(myName.toLowerCase()) ||
                myName.toLowerCase().includes(n.toLowerCase())
            );

          // ✅ For selected responders: BYPASS suppress so they always get notified
          // For general alerts: respect suppress
          if (!isSelectedResponder && Date.now() < S.current.suppressUntil) return;

          // Reset suppress so this important alert can always show
          if (isSelectedResponder) {
            S.current.suppressUntil = 0;
          }

          const alertId = `bc-beacon-${triggeredBy}-${e.data.timestamp}`;
          S.current.shownAlertId = alertId;

          setBeaconAlert({
            id: alertId,
            triggeredBy,
            area: isSelectedResponder
              ? `🎯 You were selected as a nearby responder! ${triggeredBy} needs help!`
              : (area || `Bystander Beacon — ${triggeredBy} needs help nearby!`),
            lat: lat || 0,
            lng: lng || 0,
          });

          // Personalised voice alert
          if (!S.current.speaking) {
            S.current.speaking = true;
            const voiceMsg = isSelectedResponder
              ? `${myName}! You have been selected as a top responder! ${triggeredBy} has activated a distress beacon nearby and needs your help urgently! Please respond now!`
              : `Urgent! ${triggeredBy} has activated a Bystander Distress Beacon near you! Someone needs immediate help! Please respond now!`;
            const utterance = new SpeechSynthesisUtterance(voiceMsg);
            utterance.rate = 0.85;
            utterance.pitch = 1.3;
            utterance.volume = 1.0;
            utterance.onend = () => { S.current.speaking = false; };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }

        } else if (type === "BYSTANDER_BEACON_STOPPED") {
          if (S.current.shownAlertId.startsWith("bc-beacon-")) {
            S.current.shownAlertId = "";
            S.current.speaking = false;
            setBeaconAlert(null);
            window.speechSynthesis.cancel();
          }
        }
      };
    } catch (_) { /* BroadcastChannel not supported */ }
    return () => { bc?.close(); };
  }, []); // Mount once — reads all mutable state via S ref

  /** Suppress and close — used for "Dismiss for now" (60 s) */
  const dismiss = (suppressSeconds = 60) => {
    S.current.suppressUntil = Date.now() + suppressSeconds * 1000;
    S.current.shownAlertId = "";
    S.current.speaking = false;
    setBeaconAlert(null);
    window.speechSynthesis.cancel();
  };

  /** Resolve all active foreign SOS in DB, then suppress for 10 min */
  const resolveAndDismiss = async () => {
    const capturedAlert = beaconAlert; // capture before dismiss clears it

    // ✅ Close overlay INSTANTLY — don't wait for network
    dismiss(600); // suppress 10 minutes — no way it can re-show

    if (!capturedAlert) return;
    // Resolve all active SOS from others in the background
    try {
      const allActive = await sosApi.active();
      const foreignAlerts = allActive.filter(
        (a) =>
          !a.userName.toLowerCase().includes(S.current.userName.toLowerCase()) &&
          !S.current.userName.toLowerCase().includes(a.userName.toLowerCase())
      );
      // Fire-and-forget resolve for every foreign alert
      foreignAlerts.forEach((a) => sosApi.resolve(a.id).catch(() => { }));
    } catch (_) {
      // Resolve the specific one at minimum
      sosApi.resolve(capturedAlert.id).catch(() => { });
    }
  };

  return (
    <AnimatePresence>
      {beaconAlert && (
        <motion.div
          key="beacon-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="relative max-w-lg w-full mx-4 rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: "linear-gradient(135deg, #1a0000 0%, #2d0000 50%, #1a0505 100%)", border: "2px solid rgba(239,68,68,0.6)" }}
          >
            {/* Animated red pulse border */}
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl"
              style={{ boxShadow: "0 0 60px rgba(239,68,68,0.4) inset", pointerEvents: "none" }}
            />

            {/* Top danger stripe */}
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="h-2 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600"
            />

            <div className="p-8 text-center relative">
              {/* Dismiss X */}
              <button
                onClick={() => dismiss()}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/15 transition text-red-200"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Pulsing alert icon */}
              <div className="relative w-24 h-24 mx-auto mb-5">
                <motion.div
                  animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-red-500/40"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                  className="absolute inset-0 rounded-full bg-red-500/20"
                />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-lg shadow-red-900">
                  <AlertTriangle className="w-12 h-12 text-white" />
                </div>
              </div>

              <motion.p
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
                className="text-xs text-red-300 uppercase tracking-[0.4em] font-bold mb-2"
              >
                🚨 Distress Beacon Detected
              </motion.p>

              <h2 className="text-4xl font-black text-white mb-3 leading-tight">
                HELP NEEDED!
              </h2>

              <div className="mb-1">
                <span className="text-2xl font-bold text-red-300">{beaconAlert.triggeredBy}</span>
              </div>
              <p className="text-sm text-red-200/70 mb-1">activated a distress beacon at</p>
              <div className="text-base font-semibold text-white/90 mb-5">
                📍 {beaconAlert.area}
              </div>

              <div className="glass rounded-2xl p-4 mb-6 text-left space-y-2">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Alert Details</div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Triggered by</span>
                  <span className="text-red-300 font-bold">{beaconAlert.triggeredBy}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Location</span>
                  <span className="text-white font-mono text-[11px]">{beaconAlert.lat.toFixed(4)}, {beaconAlert.lng.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Area</span>
                  <span className="text-amber-300">{beaconAlert.area}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Status</span>
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block animate-ping" />
                    ACTIVE EMERGENCY
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    // Store distress target in sessionStorage so LiveTracking
                    // can auto-enter responder mode with real victim coordinates
                    if (beaconAlert) {
                      sessionStorage.setItem('aegis_responder_target', JSON.stringify({
                        name: beaconAlert.triggeredBy,
                        lat: beaconAlert.lat,
                        lng: beaconAlert.lng,
                        area: beaconAlert.area,
                        id: beaconAlert.id,
                        ts: Date.now(),
                      }));
                    }
                    navigate("/app/tracking");
                    dismiss();
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-xl"
                  style={{ background: "linear-gradient(135deg, #ef4444, #e11d48)", boxShadow: "0 4px 24px rgba(239,68,68,0.4)" }}
                >
                  <MapPinned className="w-4 h-4" /> View Live Location & Respond
                </button>
                <button
                  onClick={resolveAndDismiss}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition border border-emerald-500/30 text-emerald-300"
                  style={{ background: "rgba(16,185,129,0.1)" }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark as Safe / Resolved
                </button>
                <button
                  onClick={() => dismiss()}
                  className="text-xs text-slate-500 hover:text-slate-300 transition py-1"
                >
                  Dismiss for now
                </button>
              </div>
            </div>

            {/* Bottom danger stripe */}
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
              className="h-2 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { riskLevel, notifications, sosActive } = useSafetyStore();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [voiceGuardOpen, setVoiceGuardOpen] = useState(false);

  const currentLabel =
    [...userNav, ...guardianNav, ...adminNav]
      .sort((a, b) => b.to.length - a.to.length)
      .find(
        (n) =>
          location.pathname === n.to ||
          location.pathname.startsWith(`${n.to}/`)
      )?.label ?? "Command Deck";

  // Global Background Voice Distress Listener for "Mera koi picha kr raha hai"
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let recog: any = null;
    let active = true;

    try {
      recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "hi-IN";

      recog.onresult = (event: any) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        const check = checkDistressKeywords(text);
        if (check.isDistress && !useSafetyStore.getState().sosActive) {
          executeVoiceDistressDispatch(check.matchedKeyword, "web-speech");
          setVoiceGuardOpen(true);
        }
      };

      recog.onerror = () => {};
      recog.onend = () => {
        if (active && !useSafetyStore.getState().sosActive) {
          try {
            recog.start();
          } catch {}
        }
      };

      recog.start();
    } catch {
      // Ignore background mic permission prompts if blocked
    }

    return () => {
      active = false;
      if (recog) recog.abort();
    };
  }, []);

  // Select navigation based on user role
  const nav = user?.role === "ADMIN" ? adminNav : user?.role === "GUARDIAN" ? guardianNav : userNav;

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Drawer chrome: Escape closes it and the page behind stops scrolling.
  useEffect(() => {
    if (!voiceGuardOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVoiceGuardOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [voiceGuardOpen]);

  const riskTone = {
    LOW: "is-emerald",
    MEDIUM: "is-amber",
    HIGH: "is-rose",
    CRITICAL: "is-rose",
  }[riskLevel];

  return (
    <div className="rn-page rn-shell">
      {/* Landing-style ambient field */}
      <div className="rn-backdrop" aria-hidden="true">
        <div className="rn-grid" />
      </div>

      {/* Global cross-user Bystander / SOS wake alert — fires on ANY page */}
      <GlobalBeaconWatcher />

      <div className="relative z-10 flex">
        {/* Mobile overlay — renders BEFORE sidebar so sidebar's z-40 sits on top */}
        <div
          className={`lg:hidden fixed inset-0 z-30 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          style={{ background: "rgba(2,5,11,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <aside
          className={`${
            open ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:sticky top-0 h-screen w-[264px] shrink-0 z-40 transition-transform duration-300 ${
            !open ? "lg:pointer-events-auto pointer-events-none" : "pointer-events-auto"
          }`}
        >
          <div className="rn-sidebar">
            <div className="rn-sidebar-brand">
              <span className="rn-logo">
                <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                <span className="rn-logo-dot" aria-hidden="true" />
              </span>
              <span>
                <span className="rn-brand-name block">RakshaNet</span>
                <span className="rn-brand-sub block">Offline-first safety</span>
              </span>
              <div className="ml-auto lg:hidden">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rn-icon-btn"
                  style={{ width: 36, height: 36 }}
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Role indicator badge */}
            <div
              className={`rn-role-badge ${
                user?.role === "ADMIN"
                  ? "is-admin"
                  : user?.role === "GUARDIAN"
                    ? "is-guardian"
                    : ""
              }`}
            >
              {user?.role === "ADMIN" ? (
                <>
                  <Command className="h-3.5 w-3.5" aria-hidden="true" /> Admin panel
                </>
              ) : user?.role === "GUARDIAN" ? (
                <>
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Guardian panel
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" /> User panel
                </>
              )}
            </div>

            <div className="rn-nav-label">
              <span className="rn-nav-label-line" aria-hidden="true" />
              Command modules
            </div>

            <nav className="rn-nav" aria-label="Main navigation">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rn-nav-item ${isActive ? "rn-nav-active" : ""}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <n.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{n.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="navdot"
                          className="rn-nav-dot"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="rn-sidebar-foot">
              <div className="rn-live-card">
                <div className="rn-live-row">
                  <span className="inline-flex items-center gap-1.5">
                    <Radio
                      className="h-3 w-3 text-[var(--rn-primary)]"
                      aria-hidden="true"
                    />
                    Live system
                  </span>
                  <span className="rn-live-ok">Online</span>
                </div>
                <div className="rn-live-row">
                  <span>WebSocket</span>
                  <span className="rn-live-ok">Connected</span>
                </div>
                <div className="rn-live-row">
                  <span>AI engine</span>
                  <span className="rn-live-ok">Online</span>
                </div>
                <div className="rn-live-row">
                  <span>Twilio</span>
                  <span className="rn-live-ok">Armed</span>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="rn-btn rn-btn-quiet rn-btn-sm w-full justify-start"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </button>

              <div className="rn-sidebar-build">
                <span className="rn-sidebar-build-dot" aria-hidden="true" />
                RN OPS · v2.4 · Delhi NCR
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="rn-topbar">
            <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
              <div className="lg:hidden">
                <button
                  className="rn-icon-btn"
                  onClick={() => setOpen(!open)}
                  aria-label={open ? "Close navigation" : "Open navigation"}
                  aria-expanded={open}
                >
                  {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>

              <div className="rn-breadcrumb hidden 2xl:flex">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--rn-primary)]" aria-hidden="true" />
                <span className="rn-breadcrumb-root">RakshaNet</span>
                <ChevronRight className="h-3 w-3 opacity-50" aria-hidden="true" />
                <span className="rn-breadcrumb-current">{currentLabel}</span>
              </div>

              <div className="hidden md:block">
                <div className="rn-search w-[260px] xl:w-[320px]">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <input
                    placeholder="Search areas, users, incidents…"
                    aria-label="Search areas, users and incidents"
                  />
                  <kbd>⌘K</kbd>
                </div>
              </div>

              <div className="flex-1" />

              <div className="hidden sm:block">
                <span className={`rn-pill ${riskTone}`}>
                  <Activity className="h-3.5 w-3.5" aria-hidden="true" /> {riskLevel} risk
                </span>
              </div>

              <div className="hidden xl:block">
                <span className="rn-clock">
                  <span className="rn-clock-dot" aria-hidden="true" />
                  {time.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>

              {/* AI Voice Guard Header Indicator */}
              <button
                onClick={() => setVoiceGuardOpen(!voiceGuardOpen)}
                className={`rn-voice-btn ${voiceGuardOpen ? "is-open" : ""}`}
                aria-expanded={voiceGuardOpen}
                title="AI Voice Auto-Detection & Fix Trigger Words"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Voice guard</span>
                <span className="rounded border border-current px-1.5 text-[10px] opacity-80">
                  Auto
                </span>
              </button>

              <button className="rn-icon-btn relative" aria-label="Notifications">
                <Bell className="h-4 w-4" aria-hidden="true" />
                {sosActive && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--rn-accent)] blink" />
                )}
              </button>

              <div className="rn-user-chip">
                <div className="rn-avatar" aria-hidden="true">
                  {user?.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </div>
                <div className="hidden leading-tight xl:block">
                  <div className="rn-user-name">{user?.name}</div>
                  <div className="rn-user-role">
                    {user?.role} <span className="rn-user-sep">/</span> online
                  </div>
                </div>
              </div>
            </div>

            {/* Live ticker */}
            <div className="rn-ticker">
              <span className="rn-ticker-label">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--rn-accent)] blink" />
                Live feed
              </span>
              <div className="overflow-hidden flex-1">
                <div className="rn-ticker-track">
                  {[
                    "🚨 SOS-4821 escalated to Delhi Police • Paharganj",
                    "🛡 Safe route recomputed • 3 reports cleared on Ring Road",
                    "⚡ AI Risk Engine • 14,283 live predictions/sec",
                    "📡 Guardian portal • 2,417 active watchers",
                    "🗺 Community intel • 48 new reports verified in last hour",
                    "🚨 SOS-4821 escalated to Delhi Police • Paharganj",
                    "🛡 Safe route recomputed • 3 reports cleared on Ring Road",
                    "⚡ AI Risk Engine • 14,283 live predictions/sec",
                  ].map((m, i) => (
                    <span key={i}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <main className="rn-main">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-5 right-5 z-50 w-[340px] max-w-[calc(100vw-2.5rem)] space-y-2">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className={`rn-toast ${
                n.kind === "critical" ? "is-critical" : n.kind === "warn" ? "is-warn" : ""
              }`}
              role={n.kind === "critical" ? "alert" : "status"}
            >
              <span className="rn-toast-icon">
                {n.kind === "critical" ? (
                  <Siren className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Bell className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <span className="pt-1.5">{n.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Slide-over right drawer — Voice Guard & trigger phrases */}
      <AnimatePresence>
        {voiceGuardOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVoiceGuardOpen(false)}
              className="rn-drawer-scrim"
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Voice guard and trigger phrases"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="rn-voice-drawer"
            >
              <IntegratedVoiceGuard
                variant="compact"
                onClose={() => setVoiceGuardOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Incoming Emergency Demo Call Screen */}
      <DemoCallOverlay />

      {/* Overlay moved above sidebar in DOM — removed from here */}
    </div>
  );
}