import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Navigation, MapPin, Clock, AlertTriangle,
  Activity, Wifi, WifiOff, CheckCircle,
  Radio, Zap, TrendingUp, Lock, RefreshCw,
  Timer, Users, Bell, X
} from "lucide-react";
import { useJourneyStore } from "../store/journeyStore";
import { useSafetyStore } from "../store/safetyStore";
import MapView from "../components/MapView";
import { PageHeader } from "../components/ui";

// ── Helpers ──────────────────────────────────────────────────────────
function formatTime(isoStr: string | null | undefined) {
  if (!isoStr) return "—";
  try { return new Date(isoStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

function formatDateTime(isoStr: string | null | undefined) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString([], {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function timeAgo(isoStr: string | null | undefined) {
  if (!isoStr) return "Never";
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function minutesUntil(isoStr: string | null | undefined) {
  if (!isoStr) return null;
  const diff = new Date(isoStr).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 60000);
}

function timeOverdue(isoStr: string | null | undefined) {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m overdue`;
  return `${Math.floor(mins / 60)}h overdue`;
}

function metersToKm(m: number | null | undefined) {
  if (!m && m !== 0) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}



function escalationLabel(level: number) {
  if (level === 0) return "SAFE";
  if (level === 1) return "MONITORING";
  if (level === 2) return "ALERT";
  return "CRITICAL";
}

// ── Sub-components ────────────────────────────────────────────────────

function CardShell({ children, className = "", glow }: {
  children: React.ReactNode;
  className?: string;
  glow?: "cyan" | "amber" | "rose" | "emerald";
}) {
  const glowCls = glow === "cyan" ? "shadow-cyan-900/30 shadow-lg"
    : glow === "amber" ? "shadow-amber-900/30 shadow-lg"
    : glow === "rose" ? "shadow-rose-900/40 shadow-lg border-rose-500/20"
    : glow === "emerald" ? "shadow-emerald-900/30 shadow-lg"
    : "";
  return (
    <div className={`glass-strong rounded-3xl p-5 ${glowCls} ${className}`}>
      {children}
    </div>
  );
}



function DataRow({ label, value, valueClass = "text-slate-200" }: {
  label: string; value: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center glass p-2.5 rounded-xl text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

// ── 1. Start Journey Form ─────────────────────────────────────────────
function StartJourneyForm({ myPos }: { myPos: [number, number] | null }) {
  const { startJourney, isLoading, error, clearError } = useJourneyStore();
  const [form, setForm] = useState({
    sourceLabel: "",
    destinationLabel: "",
    expectedDurationMinutes: "45",
  });

  const [destSearch, setDestSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  // Haversine formula
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSearch = async () => {
    if (!destSearch.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destSearch)}`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Geocoding failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (res: any) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    setCoords({ lat, lng });
    setForm((p) => ({ ...p, destinationLabel: res.display_name }));
    setSearchResults([]);
    setDestSearch(res.display_name);

    if (myPos) {
      const dist = getDistanceKm(myPos[0], myPos[1], lat, lng);
      setDistanceKm(dist);
      const durationMin = Math.max(5, Math.round(dist * 2.5 + 5)); // 2.5 min per km + 5 min buffer
      setForm((p) => ({ ...p, expectedDurationMinutes: String(durationMin) }));
    }
  };

  // Recalculate distance and duration if user's location changes and coords are set
  useEffect(() => {
    if (myPos && coords.lat !== null && coords.lng !== null) {
      const dist = getDistanceKm(myPos[0], myPos[1], coords.lat, coords.lng);
      setDistanceKm(dist);
      const durationMin = Math.max(5, Math.round(dist * 2.5 + 5));
      setForm((p) => ({ ...p, expectedDurationMinutes: String(durationMin) }));
    }
  }, [myPos, coords.lat, coords.lng]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (coords.lat === null || coords.lng === null) {
      alert("Please search and select a destination first.");
      return;
    }
    await startJourney({
      sourceLat: myPos ? myPos[0] : 19.4314,
      sourceLng: myPos ? myPos[1] : 72.8208,
      sourceLabel: form.sourceLabel || "Current Location",
      destinationLat: coords.lat,
      destinationLng: coords.lng,
      destinationLabel: form.destinationLabel || "Destination",
      expectedDurationMinutes: parseInt(form.expectedDurationMinutes) || 45,
    });
  };

  const durationNum = parseInt(form.expectedDurationMinutes) || 0;
  const etaTime =
    durationNum > 0
      ? new Date(Date.now() + durationNum * 60000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const inp =
    "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-400/60 transition placeholder:text-slate-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <PageHeader
        eyebrow="Safe journey guardian"
        title={<>Start a <em>protected</em> journey</>}
        description="RakshaNet will monitor your route, send heartbeats, and alert guardians if you miss checkpoints or go dark."
        actions={
          <span className="rn-pill is-emerald">
            <span className="rn-dot" aria-hidden="true" /> Live monitoring ready
          </span>
        }
      />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <CardShell className="lg:col-span-2" glow="cyan">
          <div className="font-bold flex items-center gap-2 text-cyan-300 mb-4">
            <ShieldCheck className="w-5 h-5" /> Journey Setup
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Source */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Your Origin Label</label>
              <input
                className={inp}
                placeholder="e.g. Home, Office"
                value={form.sourceLabel}
                onChange={(e) => setForm((p) => ({ ...p, sourceLabel: e.target.value }))}
              />
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                {myPos ? `GPS: ${myPos[0].toFixed(5)}, ${myPos[1].toFixed(5)} (Auto-detected)` : "Acquiring GPS…"}
              </div>
            </div>

            {/* Destination Search */}
            <div className="relative">
              <label className="text-[11px] text-slate-400 block mb-1">Destination Search</label>
              <div className="flex gap-2">
                <input
                  className={inp}
                  placeholder="Search destination (e.g. Connaught Place)"
                  value={destSearch}
                  onChange={(e) => setDestSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || !destSearch}
                  className="rn-btn rn-btn-ghost rn-btn-sm px-4"
                >
                  {isSearching ? "..." : "Search"}
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-slate-900/95 border border-white/10 rounded-xl max-h-48 overflow-y-auto shadow-2xl glass animate-fade-in">
                  {searchResults.map((res) => (
                    <button
                      key={res.place_id || res.osm_id}
                      type="button"
                      onClick={() => handleSelectResult(res)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-cyan-500/20 border-b border-white/5 transition last:border-b-0"
                    >
                      {res.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Route Stats (Distance, ETA) */}
            {coords.lat && coords.lng && (
              <div className="glass p-3 rounded-xl space-y-2 border border-cyan-500/20 bg-cyan-500/5">
                <div className="text-[11px] font-bold text-cyan-300">Route Summary</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-400">Distance:</span>{" "}
                    <span className="text-white font-semibold">
                      {distanceKm !== null ? `${distanceKm.toFixed(2)} km` : "Calculating..."}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Estimated Arrival:</span>{" "}
                    <span className="text-cyan-300 font-semibold">{etaTime}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Expected Duration (minutes)</label>
              <input
                className={inp}
                type="number"
                min="1"
                max="600"
                value={form.expectedDurationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, expectedDurationMinutes: e.target.value }))}
              />
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting…</>
              ) : (
                <><Zap className="w-4 h-4" /> Start Safe Journey</>
              )}
            </button>
          </form>
        </CardShell>

        {/* Info cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min">
          {[
            {
              icon: <Radio className="w-6 h-6 text-cyan-300" />,
              title: "Real-time Heartbeat",
              desc: "Continuous GPS pings every 10s. Dead Man Switch activates if you go silent for 3+ checkpoints.",
            },
            {
              icon: <Shield className="w-6 h-6 text-emerald-300" />,
              title: "Guardian Alerts",
              desc: "Your registered emergency contacts receive SMS + voice calls if escalation triggers.",
            },
            {
              icon: <WifiOff className="w-6 h-6 text-amber-300" />,
              title: "Offline Buffer",
              desc: "If you lose signal, GPS points are buffered locally and bulk-synced when you reconnect.",
            },
            {
              icon: <Lock className="w-6 h-6 text-violet-300" />,
              title: "End-to-End Encrypted",
              desc: "All location data is encrypted in transit. Guardians can only see what you share.",
            },
          ].map((f) => (
            <CardShell key={f.title}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{f.icon}</div>
                <div>
                  <div className="font-bold text-sm text-white mb-1">{f.title}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </CardShell>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── 10. Completion Summary ────────────────────────────────────────────
function CompletionSummary({ journey, onDismiss }: {
  journey: { status: string; startTime?: string | null; expectedArrivalTime?: string | null; missedCheckpoints?: number; escalationLevel?: number; sourceLabel?: string; destinationLabel?: string };
  onDismiss: () => void;
}) {
  const wasClean = (journey.missedCheckpoints ?? 0) === 0 && (journey.escalationLevel ?? 0) === 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
          className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${wasClean ? "bg-emerald-500/20 border-2 border-emerald-400/40" : "bg-amber-500/20 border-2 border-amber-400/40"}`}
        >
          {wasClean ? <CheckCircle className="w-10 h-10 text-emerald-400" /> : <AlertTriangle className="w-10 h-10 text-amber-400" />}
        </motion.div>
        <h1 className={`text-3xl font-black ${wasClean ? "text-emerald-300" : "text-amber-300"}`}>
          {journey.status === "COMPLETED" ? "Journey Completed!" : "Journey Cancelled"}
        </h1>
        <p className="text-slate-400 text-sm">
          {wasClean ? "You arrived safely. Your guardians have been notified." : "Journey ended with some events recorded."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <CardShell glow={wasClean ? "emerald" : "amber"}>
          <div className="font-bold text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-300" /> Journey Timeline
          </div>
          <div className="space-y-2">
            <DataRow label="Start Time" value={formatDateTime(journey.startTime)} valueClass="text-slate-200" />
            <DataRow label="Route" value={`${journey.sourceLabel || "Origin"} → ${journey.destinationLabel || "Destination"}`} valueClass="text-cyan-300" />
            <DataRow label="Status" value={journey.status} valueClass={wasClean ? "text-emerald-400" : "text-amber-400"} />
          </div>
        </CardShell>

        <CardShell glow={wasClean ? "emerald" : "amber"}>
          <div className="font-bold text-sm mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-300" /> Safety Report
          </div>
          <div className="space-y-2">
            <DataRow label="Missed Checkpoints" value={journey.missedCheckpoints ?? 0}
              valueClass={(journey.missedCheckpoints ?? 0) > 0 ? "text-rose-400 font-bold" : "text-emerald-400"} />
            <DataRow label="Max Escalation Level" value={escalationLabel(journey.escalationLevel ?? 0)}
              valueClass={(journey.escalationLevel ?? 0) > 0 ? "text-amber-400" : "text-emerald-400"} />
            <DataRow label="Safety Rating" value={wasClean ? "✅ All Clear" : "⚠ Events Logged"}
              valueClass={wasClean ? "text-emerald-400" : "text-amber-400"} />
          </div>
        </CardShell>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={onDismiss}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm transition flex items-center gap-2"
        >
          <Zap className="w-4 h-4" /> Start New Journey
        </button>
      </div>
    </motion.div>
  );
}

// ── Shield icon (missing from lucide import) ─────────────────────────
function Shield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function SafeJourneyPage() {
  const {
    currentJourney, journeyId, isJourneyActive, journeyStatus,
    missedCheckpoints, escalationLevel, lastHeartbeatTime, heartbeatSent,
    offlineBuffer, isSyncing, lastSyncResult, isOnline,
    sendHeartbeat, syncOfflineBuffer, confirmArrival, cancelJourney,
    loadJourney, setOnline, completedJourney, clearCompletedJourney,
    isLoading, error, clearError,
  } = useJourneyStore();

  const { contacts: safetyContacts, fetchContacts } = useSafetyStore();
  const [escalationTime, setEscalationTime] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    if (escalationLevel >= 1) {
      if (!escalationTime) {
        setEscalationTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } else {
      setEscalationTime(null);
    }
  }, [escalationLevel, escalationTime]);

  // GPS
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [battery, setBattery] = useState<number | undefined>(undefined);
  const watchIdRef = useRef<number | null>(null);

  // Dead man timer (counts seconds since last heartbeat)
  const [deadManSecs, setDeadManSecs] = useState(0);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Read battery
  useEffect(() => {
    (navigator as any).getBattery?.().then((b: any) => {
      setBattery(Math.round(b.level * 100));
      b.addEventListener("levelchange", () => setBattery(Math.round(b.level * 100)));
    });
  }, []);

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) { setGpsError(true); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => setGpsError(true),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  // Poll journey every 10s when active.
  // Also fire once on mount even if isJourneyActive is false — this lets us
  // recover from stale localStorage (e.g., AUTO_ESCALATION_PENDING was written
  // as active=false by the old buggy code before this fix).
  useEffect(() => {
    if (!journeyId) return;
    // Always do one immediate load to sync with server truth
    loadJourney(journeyId);
    // Keep polling as long as the journey id exists and is active
    if (!isJourneyActive) return;
    const interval = setInterval(() => loadJourney(journeyId), 10000);
    return () => clearInterval(interval);
  }, [journeyId, isJourneyActive, loadJourney]);

  // Dead Man Switch timer (counts up from last heartbeat)
  useEffect(() => {
    if (!isJourneyActive) return;
    const t = setInterval(() => {
      if (!lastHeartbeatTime) { setDeadManSecs(0); return; }
      setDeadManSecs(Math.floor((Date.now() - new Date(lastHeartbeatTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [isJourneyActive, lastHeartbeatTime]);

  // Auto heartbeat every 30 seconds when active
  useEffect(() => {
    if (!isJourneyActive) return;
    const t = setInterval(() => {
      const lat = myPos ? myPos[0] : undefined;
      const lng = myPos ? myPos[1] : undefined;
      if (lat && lng) sendHeartbeat(lat, lng, battery);
    }, 30000);
    return () => clearInterval(t);
  }, [isJourneyActive, myPos, battery, sendHeartbeat]);

  const handleManualHeartbeat = useCallback(() => {
    const lat = myPos ? myPos[0] : 19.4314;
    const lng = myPos ? myPos[1] : 72.8208;
    sendHeartbeat(lat, lng, battery);
  }, [myPos, battery, sendHeartbeat]);

  // ── Derived UI ────────────────────────────────────────────────────
  const overdue = timeOverdue(currentJourney?.expectedArrivalTime);
  const minsLeft = minutesUntil(currentJourney?.expectedArrivalTime);
  const deadManMinutes = Math.floor(deadManSecs / 60);
  const deadManStatus = deadManSecs > 420 ? "CRITICAL"
    : deadManSecs > 180 ? "ELEVATED" : "NORMAL";

  // Map markers
  const mapMarkers = (() => {
    const m: any[] = [];
    if (myPos) m.push({ position: myPos, label: "📍 You", kind: "user", meta: `${myPos[0].toFixed(5)}, ${myPos[1].toFixed(5)}` });
    if (currentJourney?.destinationLat && currentJourney?.destinationLng) {
      m.push({
        position: [currentJourney.destinationLat, currentJourney.destinationLng] as [number, number],
        label: `🎯 ${currentJourney.destinationLabel || "Destination"}`,
        kind: "alert",
        meta: currentJourney.destinationLabel || "Destination",
      });
    }
    if (currentJourney?.lastKnownLat && currentJourney?.lastKnownLng) {
      m.push({
        position: [currentJourney.lastKnownLat, currentJourney.lastKnownLng] as [number, number],
        label: "📡 Last Known",
        kind: "police",
        meta: "Last server-confirmed position",
      });
    }
    return m;
  })();

  // Show completion summary
  if (completedJourney || journeyStatus === "COMPLETED" || journeyStatus === "CANCELLED") {
    return (
      <div className="space-y-6">
        <CompletionSummary
          journey={completedJourney || { status: journeyStatus || "COMPLETED", missedCheckpoints, escalationLevel }}
          onDismiss={clearCompletedJourney}
        />
      </div>
    );
  }

  // Show start form when no active journey
  if (!isJourneyActive) {
    return <StartJourneyForm myPos={myPos} />;
  }

  // ── ACTIVE JOURNEY DASHBOARD ─────────────────────────────────────


  return (
    <div className="space-y-5">
      {/* ── Top Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Safe Journey Guardian</div>
          <h1 className="text-3xl lg:text-4xl font-black mt-1">
            {escalationLevel >= 2 ? "🚨 " : escalationLevel === 1 ? "⚠️ " : "🛡️ "}
            {escalationLevel >= 2 ? "ESCALATION ACTIVE" : escalationLevel === 1 ? "Monitoring Elevated" : "Journey Monitoring"}
          </h1>
          <p className="text-slate-400 mt-1 text-sm flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            {currentJourney?.sourceLabel || "Origin"} → {currentJourney?.destinationLabel || "Destination"}
            {" · "}Started {timeAgo(currentJourney?.startTime)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${
            isOnline
              ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-400/30 text-rose-300"
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${
            escalationLevel === 0 ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
            : escalationLevel === 1 ? "bg-amber-500/15 border-amber-400/30 text-amber-300"
            : "bg-rose-500/15 border-rose-400/30 text-rose-300 blink"
          }`}>
            <ShieldCheck className="w-3 h-3" />
            ESC LVL {escalationLevel}
          </span>
        </div>
      </div>

      {/* ── ESCALATION BANNER ────────────────────────────────────────── */}
      <AnimatePresence>
        {escalationLevel >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-rose-400 animate-pulse" />
              <div>
                <div className="text-rose-300 font-black">ESCALATION LEVEL {escalationLevel} — GUARDIANS NOTIFIED</div>
                <div className="text-xs text-rose-200/70 mt-0.5">
                  Your emergency contacts have been alerted via SMS and voice call. Missed checkpoints: {missedCheckpoints}
                </div>
              </div>
            </div>
            <button
              onClick={() => confirmArrival()}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition whitespace-nowrap"
            >
              ✅ I'm Safe
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OFFLINE BANNER ───────────────────────────────────────────── */}
      {!isOnline && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300 text-xs">
            <WifiOff className="w-4 h-4" />
            <span>You're offline. GPS points are being buffered locally ({offlineBuffer.length} queued).</span>
          </div>
        </div>
      )}

      {/* ── Offline sync result notification ─────────────────────────── */}
      <AnimatePresence>
        {lastSyncResult && isOnline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-cyan-300 text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>Offline sync complete — {lastSyncResult.accepted}/{lastSyncResult.total} points uploaded.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STAT ROW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Journey Status */}
        <div className={`glass relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br ${
          currentJourney?.status === "ESCALATED"
            ? "from-rose-500/20 to-red-500/5 border-rose-400/20"
            : "from-emerald-500/20 to-teal-500/5 border-emerald-400/20"
        }`}>
          <div className="text-[11px] uppercase tracking-widest text-slate-400">Status</div>
          <div className="mt-1 text-xl font-black flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              currentJourney?.status === "ESCALATED" ? "bg-rose-400 blink" : "bg-emerald-400 blink"
            }`} />
            {currentJourney?.status || "ACTIVE"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Since {formatTime(currentJourney?.startTime)}
          </div>
        </div>

        {/* 2. ETA */}
        <div className={`glass relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br ${
          overdue ? "from-rose-500/20 to-red-500/5 border-rose-400/20" : "from-cyan-500/20 to-sky-500/5 border-cyan-400/20"
        }`}>
          <div className="text-[11px] uppercase tracking-widest text-slate-400">ETA</div>
          <div className="mt-1 text-xl font-black text-cyan-200">
            {overdue ? overdue : (minsLeft !== null ? `${minsLeft}m` : "—")}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Arrival: {formatTime(currentJourney?.expectedArrivalTime)}
          </div>
        </div>

        {/* 3. Missed Checkpoints */}
        <div className={`glass relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br ${
          missedCheckpoints > 0 ? "from-rose-500/20 to-red-500/5 border-rose-400/20" : "from-violet-500/20 to-fuchsia-500/5 border-violet-400/20"
        }`}>
          <div className="text-[11px] uppercase tracking-widest text-slate-400">Missed Checks</div>
          <div className={`mt-1 text-3xl font-black ${missedCheckpoints > 0 ? "text-rose-300" : "text-violet-200"}`}>
            {missedCheckpoints}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {missedCheckpoints === 0 ? "All checkpoints OK" : `${missedCheckpoints} missed`}
          </div>
        </div>

        {/* 4. Escalation Level */}
        <div className={`glass relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br ${
          escalationLevel === 0 ? "from-emerald-500/20 to-teal-500/5 border-emerald-400/20"
          : escalationLevel === 1 ? "from-amber-500/20 to-orange-500/5 border-amber-400/20"
          : "from-rose-500/20 to-red-500/5 border-rose-400/20"
        }`}>
          <div className="text-[11px] uppercase tracking-widest text-slate-400">Escalation</div>
          <div className={`mt-1 text-3xl font-black ${
            escalationLevel === 0 ? "text-emerald-200" : escalationLevel === 1 ? "text-amber-200" : "text-rose-200"
          }`}>
            {escalationLabel(escalationLevel)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Level {escalationLevel}</div>
        </div>
      </div>

      {/* ── MAIN GRID ────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Map ── */}
        <div className="lg:col-span-2 glass-strong p-4 rounded-3xl">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400">Live Map</div>
              <div className="text-sm font-semibold text-cyan-200 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                {currentJourney?.sourceLabel || "Origin"} → {currentJourney?.destinationLabel || "Destination"}
              </div>
            </div>
            {currentJourney?.distanceToDestM !== undefined && (
              <div className="text-right">
                <div className="text-amber-300 font-black">{metersToKm(currentJourney.distanceToDestM)}</div>
                <div className="text-[10px] text-slate-400">to destination</div>
              </div>
            )}
          </div>
          <MapView
            center={
              myPos ?? (currentJourney?.lastKnownLat && currentJourney?.lastKnownLng
                ? [currentJourney.lastKnownLat, currentJourney.lastKnownLng]
                : [19.4314, 72.8208])
            }
            zoom={14}
            height={460}
            markers={mapMarkers}
          />
          <div className="flex gap-4 mt-2 px-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> You</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Destination</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Last Known</span>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">

          {/* 2. Live Tracking Card */}
          <CardShell glow="cyan">
            <div className="font-bold flex items-center gap-2 text-cyan-300 text-sm mb-3">
              <Activity className="w-4 h-4" /> Live Tracking
            </div>
            <div className="space-y-2">
              <DataRow
                label="Your GPS"
                value={myPos ? `${myPos[0].toFixed(5)}, ${myPos[1].toFixed(5)}` : gpsError ? "Unavailable" : "Acquiring…"}
                valueClass={myPos ? "text-emerald-300 font-mono text-[10px]" : "text-slate-400"}
              />
              <DataRow
                label="Last Known (Server)"
                value={currentJourney?.lastKnownLat
                  ? `${currentJourney.lastKnownLat.toFixed(5)}, ${currentJourney.lastKnownLng?.toFixed(5)}`
                  : "No data yet"}
                valueClass="text-cyan-300 font-mono text-[10px]"
              />
              <DataRow label="Distance to Dest." value={metersToKm(currentJourney?.distanceToDestM)} valueClass="text-amber-300" />
              <DataRow label="Last Heartbeat" value={timeAgo(lastHeartbeatTime)} valueClass="text-slate-200" />
              {battery !== undefined && (
                <DataRow label="Battery" value={`${battery}%`}
                  valueClass={battery < 20 ? "text-rose-400" : battery < 50 ? "text-amber-300" : "text-emerald-300"} />
              )}
            </div>

            {/* Manual heartbeat button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleManualHeartbeat}
              className={`mt-3 w-full py-2.5 rounded-xl text-white font-bold text-xs transition flex items-center justify-center gap-2 ${
                heartbeatSent
                  ? "bg-emerald-600 shadow-lg shadow-emerald-900/30"
                  : "bg-cyan-600/80 hover:bg-cyan-600 border border-cyan-500/30"
              }`}
            >
              <motion.div animate={heartbeatSent ? { scale: [1, 1.3, 1] } : {}}>
                <Radio className="w-3.5 h-3.5" />
              </motion.div>
              {heartbeatSent ? "Heartbeat Sent ✓" : "Send Manual Heartbeat"}
            </motion.button>
          </CardShell>

          {/* 5. Dead Man Switch Timer */}
          <CardShell glow={deadManStatus === "CRITICAL" ? "rose" : deadManStatus === "ELEVATED" ? "amber" : undefined}>
            <div className={`font-bold flex items-center gap-2 text-sm mb-3 ${
              deadManStatus === "CRITICAL" ? "text-rose-300" : deadManStatus === "ELEVATED" ? "text-amber-300" : "text-slate-300"
            }`}>
              <Timer className="w-4 h-4" /> Dead Man Switch
            </div>
            <div className="text-center py-2">
              <div className={`text-4xl font-black tabular font-mono ${
                deadManStatus === "CRITICAL" ? "text-rose-400 blink" : deadManStatus === "ELEVATED" ? "text-amber-400" : "text-emerald-400"
              }`}>
                {String(deadManMinutes).padStart(2, "0")}:{String(deadManSecs % 60).padStart(2, "0")}
              </div>
              <div className={`text-xs mt-1 ${
                deadManStatus === "CRITICAL" ? "text-rose-400" : deadManStatus === "ELEVATED" ? "text-amber-400" : "text-slate-400"
              }`}>
                since last heartbeat
              </div>
            </div>
            <div className="space-y-1.5 text-[10px] mt-2">
              <div className={`flex items-center gap-2 p-2 rounded-xl ${deadManSecs > 180 ? "bg-amber-500/15 text-amber-300" : "glass text-slate-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${deadManSecs > 180 ? "bg-amber-400" : "bg-slate-600"}`} />
                3 min — Suspicious stop detected
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-xl ${deadManSecs > 420 ? "bg-rose-500/15 text-rose-300 blink" : "glass text-slate-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${deadManSecs > 420 ? "bg-rose-400" : "bg-slate-600"}`} />
                7 min — Guardians alerted
              </div>
            </div>
          </CardShell>

          {/* 6. Guardian Alert Delivery Status */}
          <CardShell glow={escalationLevel >= 1 ? "rose" : "cyan"}>
            <div className="font-bold flex items-center gap-2 text-cyan-300 text-sm mb-3">
              <Users className="w-4 h-4" /> Guardian Alert Pipeline
            </div>
            
            <div className="space-y-3">
              {/* Guardian Contact List */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Primary Guardians</div>
                {safetyContacts.length === 0 ? (
                  <DataRow 
                    label="Mom" 
                    value="+91 XXXXXXX" 
                    valueClass="text-slate-300 font-mono text-[10px]" 
                  />
                ) : (
                  safetyContacts.slice(0, 2).map((c, i) => (
                    <DataRow 
                      key={c.id || i}
                      label={`${c.relation} (${c.name})`} 
                      value={c.phone} 
                      valueClass="text-slate-300 font-mono text-[10px]" 
                    />
                  ))
                )}
              </div>

              {/* Alert Delivery Statuses */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Alert Delivery</div>
                <DataRow 
                  label="SMS Status" 
                  value={escalationLevel >= 1 ? "✅ Delivered" : "⏳ Pending"} 
                  valueClass={escalationLevel >= 1 ? "text-emerald-400 font-bold" : "text-slate-400"} 
                />
                <DataRow 
                  label="Voice Call Status" 
                  value={escalationLevel >= 2 ? "✅ Active" : "⏳ Pending"} 
                  valueClass={escalationLevel >= 2 ? "text-emerald-400 font-bold" : "text-slate-400"} 
                />
              </div>

              {/* Last Escalation Event */}
              <div className="pt-2 border-t border-white/5">
                <DataRow 
                  label="Last Escalation Event" 
                  value={escalationTime || "—"} 
                  valueClass={escalationLevel >= 1 ? "text-rose-400 font-mono font-bold" : "text-slate-400"} 
                />
              </div>
            </div>
          </CardShell>

          {/* 7. Offline Sync Status Card */}
          <CardShell glow={offlineBuffer.length > 0 ? "amber" : undefined}>
            <div className="font-bold flex items-center gap-2 text-sm mb-3 text-slate-300">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-300" /> : <WifiOff className="w-4 h-4 text-amber-300" />}
              Offline Sync Status
            </div>
            <div className="space-y-2">
              <DataRow label="Connection" value={isOnline ? "Online" : "Offline"}
                valueClass={isOnline ? "text-emerald-400" : "text-amber-400"} />
              <DataRow label="Buffered Points" value={offlineBuffer.length}
                valueClass={offlineBuffer.length > 0 ? "text-amber-300 font-bold" : "text-slate-300"} />
              {lastSyncResult && (
                <DataRow label="Last Sync" value={`${lastSyncResult.accepted}/${lastSyncResult.total} pts`}
                  valueClass="text-emerald-300" />
              )}
            </div>
            {offlineBuffer.length > 0 && isOnline && (
              <button
                onClick={syncOfflineBuffer}
                disabled={isSyncing}
                className="mt-3 w-full py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing…" : `Sync ${offlineBuffer.length} Points Now`}
              </button>
            )}
          </CardShell>
        </div>
      </div>

      {/* ── BOTTOM ROW ───────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* 4. Checkpoint Status */}
        <CardShell>
          <div className="font-bold flex items-center gap-2 text-sm mb-4 text-violet-300">
            <TrendingUp className="w-4 h-4" /> Checkpoint Status
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Missed Checkpoints</span>
              <span className={`text-2xl font-black ${missedCheckpoints > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {missedCheckpoints}
              </span>
            </div>
            {/* Visual bar */}
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  missedCheckpoints === 0 ? "bg-emerald-400 w-full"
                  : missedCheckpoints === 1 ? "bg-amber-400 w-2/3"
                  : "bg-rose-400 w-full"
                }`}
              />
            </div>
            <div className="space-y-1.5 text-[10px]">
              {[
                { label: "0 missed", state: missedCheckpoints === 0, color: "emerald", desc: "All clear" },
                { label: "1 missed", state: missedCheckpoints === 1, color: "amber", desc: "Guardian monitoring" },
                { label: "2+ missed", state: missedCheckpoints >= 2, color: "rose", desc: "Escalation triggered" },
              ].map(r => (
                <div key={r.label} className={`flex items-center gap-2 p-2 rounded-xl ${r.state ? `bg-${r.color}-500/15` : "glass"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${r.state ? `bg-${r.color}-400` : "bg-slate-600"}`} />
                  <span className={r.state ? `text-${r.color}-300 font-bold` : "text-slate-500"}>{r.label} — {r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </CardShell>

        {/* 6. Escalation Level Card */}
        <CardShell glow={escalationLevel >= 2 ? "rose" : escalationLevel === 1 ? "amber" : "emerald"}>
          <div className="font-bold flex items-center gap-2 text-sm mb-4 text-slate-300">
            <Bell className="w-4 h-4" /> Escalation State
          </div>
          <div className="text-center py-2">
            <div className={`text-5xl font-black ${
              escalationLevel === 0 ? "text-emerald-400" : escalationLevel === 1 ? "text-amber-400" : "text-rose-400 blink"
            }`}>
              {escalationLevel}
            </div>
            <div className={`text-sm font-bold mt-1 ${
              escalationLevel === 0 ? "text-emerald-300" : escalationLevel === 1 ? "text-amber-300" : "text-rose-300"
            }`}>
              {escalationLabel(escalationLevel)}
            </div>
          </div>
          <div className="space-y-1.5 mt-3 text-[10px]">
            {[
              { lvl: 0, label: "Level 0 — Monitoring", color: "emerald" },
              { lvl: 1, label: "Level 1 — Alert Sent", color: "amber" },
              { lvl: 2, label: "Level 2 — Voice Call", color: "orange" },
              { lvl: 3, label: "Level 3 — Emergency", color: "rose" },
            ].map(l => (
              <div key={l.lvl} className={`flex items-center gap-2 p-2 rounded-xl ${
                escalationLevel === l.lvl ? `bg-${l.color}-500/15 text-${l.color}-300 font-bold` : "glass text-slate-500"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${escalationLevel >= l.lvl ? `bg-${l.color}-400` : "bg-slate-600"}`} />
                {l.label}
              </div>
            ))}
          </div>
        </CardShell>

        {/* 9. Emergency State + Action Buttons */}
        <CardShell glow={escalationLevel >= 2 ? "rose" : undefined}>
          <div className="font-bold flex items-center gap-2 text-sm mb-4 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-300" /> Journey Controls
          </div>

          <div className="space-y-3">
            {/* Journey details */}
            <div className="space-y-2">
              <DataRow label="Journey ID" value={currentJourney?.id ? `${currentJourney.id.slice(0, 8)}…` : "—"} valueClass="font-mono text-[10px] text-slate-300" />
              <DataRow label="Start Time" value={formatTime(currentJourney?.startTime)} />
              <DataRow label="Expected Arrival" value={formatTime(currentJourney?.expectedArrivalTime)} valueClass="text-cyan-300" />
              <DataRow label="Duration" value={currentJourney?.expectedDurationMin ? `${currentJourney.expectedDurationMin} min` : "—"} />
            </div>

            {/* Confirm arrival */}
            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={() => { clearError(); confirmArrival(); }}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Confirming…</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> ✅ Confirm Safe Arrival</>
              )}
            </button>

            {/* Cancel */}
            {!confirmCancelOpen ? (
              <button
                onClick={() => setConfirmCancelOpen(true)}
                className="w-full py-2.5 rounded-xl glass text-slate-400 hover:text-rose-300 hover:border-rose-500/30 border border-white/10 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <X className="w-3.5 h-3.5" /> Cancel Journey
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] text-rose-300 text-center font-bold">Confirm cancellation?</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { cancelJourney(); setConfirmCancelOpen(false); }}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
                  >
                    Yes, Cancel
                  </button>
                  <button
                    onClick={() => setConfirmCancelOpen(false)}
                    className="flex-1 py-2 rounded-xl glass text-slate-400 font-bold text-xs transition"
                  >
                    Keep Active
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardShell>
      </div>

      {/* ── 8. Guardian Acknowledgement Section (full width) ─────────── */}
      <CardShell className="border border-violet-500/20 bg-violet-500/5">
        <div className="font-bold flex items-center gap-2 text-violet-300 mb-4">
          <Users className="w-5 h-5" /> Guardian Acknowledgement
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <div className="glass p-4 rounded-2xl space-y-2">
            <div className="text-slate-400 text-[11px] uppercase tracking-wider mb-2">Escalation Pipeline</div>
            <DataRow label="Level 0" value="Passive monitoring" valueClass="text-emerald-300" />
            <DataRow label="Level 1" value="SMS sent to guardian" valueClass="text-amber-300" />
            <DataRow label="Level 2" value="Voice call triggered" valueClass="text-orange-300" />
            <DataRow label="Level 3" value="Emergency services" valueClass="text-rose-300" />
          </div>

          <div className="glass p-4 rounded-2xl space-y-2">
            <div className="text-slate-400 text-[11px] uppercase tracking-wider mb-2">Current State</div>
            <DataRow label="Missed Checkpoints" value={missedCheckpoints}
              valueClass={missedCheckpoints > 0 ? "text-rose-300 font-bold" : "text-emerald-300"} />
            <DataRow label="Escalation Level" value={`${escalationLevel} — ${escalationLabel(escalationLevel)}`}
              valueClass={escalationLevel === 0 ? "text-emerald-300" : "text-amber-300"} />
            <DataRow label="Last Heartbeat" value={timeAgo(lastHeartbeatTime)} />
            <DataRow label="GPS Points Buffered" value={offlineBuffer.length}
              valueClass={offlineBuffer.length > 0 ? "text-amber-300" : "text-slate-300"} />
          </div>

          <div className="glass p-4 rounded-2xl space-y-2">
            <div className="text-slate-400 text-[11px] uppercase tracking-wider mb-2">Ack. Status</div>
            <div className={`flex items-center gap-2 p-2.5 rounded-xl ${
              escalationLevel === 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-rose-500/10 border border-rose-500/20"
            }`}>
              <span className={`w-2 h-2 rounded-full ${escalationLevel === 0 ? "bg-emerald-400" : "bg-rose-400 blink"}`} />
              <span className={escalationLevel === 0 ? "text-emerald-300" : "text-rose-300"}>
                {escalationLevel === 0 ? "No acknowledgement needed" : `Level ${escalationLevel} requires guardian response`}
              </span>
            </div>
            <p className="text-slate-500 leading-relaxed mt-1">
              {escalationLevel === 0
                ? "Journey is within safe parameters. Guardians are passively monitoring."
                : "Guardian acknowledgement is sent automatically via Twilio SMS/call. No action needed on your part."}
            </p>
          </div>
        </div>
      </CardShell>
    </div>
  );
}
