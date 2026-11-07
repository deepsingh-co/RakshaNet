import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Battery, Activity, Clock, ShieldCheck, Radio, Crosshair, Siren } from "lucide-react";
import { useSafetyStore } from "../store/safetyStore";
import MapView from "../components/MapView";
import { StatCard, Pill, PageHeader } from "../components/ui";
import { useAuthStore } from "../store/authStore";
import { sosApi } from "../api/endpoints";
import { useJourneyStore } from "../store/journeyStore";

// ── Haversine distance (metres) ──────────────────────────────────────
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// walking ETA minutes at 5 km/h
const etaMin = (m: number) => Math.ceil(m / 83);

// default waypoints (fallback when GPS unavailable)
const WAYPOINTS: [number, number][] = [
  [28.6139, 77.209], [28.6152, 77.2103], [28.6167, 77.2119],
  [28.618, 77.2134],  [28.6193, 77.2151], [28.6203, 77.2168],
  [28.6214, 77.2187], [28.6225, 77.2204], [28.6237, 77.2221],
];

export default function LiveTracking() {
  const { user } = useAuthStore();
  const userName = user?.name || "User";
  const { liveTracking, battery, tick } = useSafetyStore();
  
  const {
    currentJourney,
    journeyId,
    isJourneyActive,
    startJourney,
    loadJourney,
    sendHeartbeat,
    confirmArrival,
  } = useJourneyStore();

  const [destLabel, setDestLabel] = useState("Connaught Place");
  const [expectedMins, setExpectedMins] = useState(45);

  // ── Poll current journey details every 10 seconds ─────────────────
  useEffect(() => {
    if (journeyId) {
      loadJourney(journeyId);
      const interval = setInterval(() => {
        loadJourney(journeyId);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [journeyId, loadJourney]);

  // ── My real GPS location ──────────────────────────────────────────
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // ── Active distress from another user ────────────────────────────
  const [activeDistress, setActiveDistress] = useState<any | null>(null);
  const [playedSosFor, setPlayedSosFor] = useState<string | null>(null);

  // ── Responder mode (came from beacon popup) ───────────────────────
  const [responderMode, setResponderMode] = useState(false);

  // ── Read sessionStorage on mount: auto-enter responder mode ──────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('aegis_responder_target');
      if (!raw) return;
      const target = JSON.parse(raw);
      // Only use if fresh (within last 5 minutes)
      if (Date.now() - target.ts < 5 * 60 * 1000) {
        setActiveDistress({
          id: target.id,
          userName: target.name,
          latitude: target.lat,
          longitude: target.lng,
          areaName: target.area,
        });
        setResponderMode(true);
      }
      sessionStorage.removeItem('aegis_responder_target');
    } catch { /* ignore */ }
  }, []);

  // ── Derived ───────────────────────────────────────────────────────
  const distressPos: [number, number] | null = activeDistress
    ? [activeDistress.latitude, activeDistress.longitude]
    : null;

  const distanceMetres = myPos && distressPos
    ? haversineM(myPos[0], myPos[1], distressPos[0], distressPos[1])
    : null;

  // ── GPS watch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setGpsError(true); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => setGpsError(true),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ── Safety store ticker ──────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(tick, 1500);
    return () => clearInterval(t);
  }, [tick]);

  // ── Poll active SOS every 3 s ─────────────────────────────────────
  const checkDistress = useCallback(async () => {
    try {
      const list = await sosApi.active();
      if (list && list.length > 0) {
        const d = list.find((s: any) =>
          s.userName.toLowerCase() !== userName.toLowerCase()
        );
        setActiveDistress(d ?? null);
      } else {
        setActiveDistress(null);
      }
    } catch { /* ignore */ }
  }, [userName]);

  useEffect(() => {
    checkDistress();
    const p = setInterval(checkDistress, 3000);
    return () => clearInterval(p);
  }, [checkDistress]);

  // ── BroadcastChannel: auto-enter responder mode ───────────────────
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("aegis_beacon");
      bc.onmessage = (e) => {
        if (e.data?.type === "BYSTANDER_BEACON_ACTIVE") {
          setResponderMode(true);
          checkDistress();
        }
        if (e.data?.type === "BYSTANDER_BEACON_STOPPED") {
          setResponderMode(false);
        }
      };
    } catch { /* unsupported */ }
    return () => bc?.close();
  }, [checkDistress]);

  // ── Voice alert on new distress ───────────────────────────────────
  useEffect(() => {
    if (activeDistress && activeDistress.userName !== playedSosFor) {
      const msg = `Emergency! ${activeDistress.userName} needs help. They are ${
        distanceMetres ? Math.round(distanceMetres) + " metres away." : "nearby."
      }`;
      window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(msg), { rate: 0.95 }));
      setPlayedSosFor(activeDistress.userName);
    }
    if (!activeDistress) { setPlayedSosFor(null); setResponderMode(false); }
  }, [activeDistress, playedSosFor, distanceMetres]);

  // ── Map center logic ──────────────────────────────────────────────
  const fallbackPos: [number, number] = WAYPOINTS[4];
  const helperPos: [number, number] = myPos ?? fallbackPos;
  const mapCenter: [number, number] = responderMode && distressPos ? distressPos : helperPos;

  // ── Map markers ───────────────────────────────────────────────────
  const markers = [
    {
      position: helperPos,
      label: `📍 ${userName} (You)`,
      kind: "user" as const,
      meta: myPos ? `${myPos[0].toFixed(5)}, ${myPos[1].toFixed(5)}` : "Getting GPS…",
    },
    ...(distressPos
      ? [{
          position: distressPos,
          label: `🚨 ${activeDistress.userName}`,
          kind: "alert" as const,
          severity: "CRITICAL" as const,
          meta: `${activeDistress.latitude.toFixed(5)}, ${activeDistress.longitude.toFixed(5)}${
            distanceMetres ? ` • ${distanceMetres < 1000
              ? Math.round(distanceMetres) + " m away"
              : (distanceMetres / 1000).toFixed(2) + " km away"}` : ""
          }`,
        }]
      : []),
    { position: [28.617, 77.215] as [number, number], label: "Police Post", kind: "police" as const, meta: "340m" },
  ];

  // connecting line between helper and distress person
  const connectPath: [number, number][] =
    myPos && distressPos ? [helperPos, distressPos] : [];

  const guardianWatching = [
    { name: "Rahul Sharma", rel: "Brother", eta: "Watching now", online: true },
    { name: "Sneha Kapoor", rel: "Best Friend", eta: "Last seen 2m ago", online: true },
    { name: "Mom • Sunita", rel: "Mother", eta: "Offline", online: false },
  ];

  return (
    <div className="space-y-6">

      {/* ── Distress Banner ─────────────────────────────────────────── */}
      {activeDistress && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-between flex-wrap gap-4 shadow-lg shadow-red-950/30"
        >
          <div className="flex items-center gap-3">
            <Radio className="w-8 h-8 text-red-500 animate-ping" />
            <div>
              <div className="text-red-400 font-black text-lg">🚨 EMERGENCY DISTRESS ACTIVE</div>
              <div className="text-xs text-red-200 mt-0.5">
                <strong>{activeDistress.userName}</strong> needs help!
                {distanceMetres !== null && (
                  <span className="ml-2 text-amber-300 font-bold">
                    {distanceMetres < 1000
                      ? `${Math.round(distanceMetres)} m away`
                      : `${(distanceMetres / 1000).toFixed(2)} km away`}
                    {" "}• ETA ~{etaMin(distanceMetres)} min walking
                  </span>
                )}
              </div>
              <div className="text-[11px] text-red-300/70 mt-0.5">
                📍 {activeDistress.latitude?.toFixed(5)}, {activeDistress.longitude?.toFixed(5)}
                {activeDistress.areaName && ` • ${activeDistress.areaName}`}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setResponderMode(!responderMode)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow ${
                responderMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              {responderMode ? "Back to My View" : "Navigate to Help"}
            </button>
            <button
              onClick={async () => {
                try { await sosApi.resolve(activeDistress.id); checkDistress(); } catch { /* */ }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition"
            >
              ✅ Resolved / I Helped
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Distance Info Card (when in responder mode) ─────────────── */}
      {responderMode && activeDistress && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="glass-strong p-4 rounded-2xl text-center">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Distress Location</div>
            <div className="text-sm font-bold text-red-300">
              {activeDistress.latitude?.toFixed(4)}, {activeDistress.longitude?.toFixed(4)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">{activeDistress.areaName || "Active Emergency"}</div>
          </div>
          <div className="glass-strong p-4 rounded-2xl text-center">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Distance</div>
            <div className="text-2xl font-black text-amber-300">
              {distanceMetres !== null
                ? distanceMetres < 1000
                  ? `${Math.round(distanceMetres)}m`
                  : `${(distanceMetres / 1000).toFixed(2)}km`
                : "Calculating…"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {distanceMetres ? `~${etaMin(distanceMetres)} min walk` : "Getting GPS…"}
            </div>
          </div>
          <div className="glass-strong p-4 rounded-2xl text-center">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Your Location</div>
            <div className="text-sm font-bold text-emerald-300">
              {myPos ? `${myPos[0].toFixed(4)}, ${myPos[1].toFixed(4)}` : "Acquiring GPS…"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {gpsError ? "⚠ GPS unavailable" : myPos ? "Live GPS" : "Fetching…"}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Live tracking"
        title={
          responderMode
            ? <>Responding to <em>emergency</em></>
            : <>Real-time <em>guardian</em> visibility</>
        }
        description={
          <span className="flex items-center gap-2">
            <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
            {myPos
              ? `Your GPS: ${myPos[0].toFixed(5)}, ${myPos[1].toFixed(5)}`
              : gpsError
                ? "GPS unavailable — enable location permission"
                : "Acquiring GPS…"}
          </span>
        }
        actions={
          !responderMode ? (
            <Pill tone="emerald">
              <span className="rn-dot" aria-hidden="true" /> Encrypted stream
            </Pill>
          ) : (
            <Pill tone="pink">
              <Siren className="h-3 w-3" aria-hidden="true" /> Responder mode active
            </Pill>
          )
        }
      />

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={responderMode ? "Distance to Victim" : "ETA to Destination"}
          value={
            responderMode && distanceMetres !== null
              ? distanceMetres < 1000 ? `${Math.round(distanceMetres)}m` : `${(distanceMetres / 1000).toFixed(1)}km`
              : `${liveTracking.eta} min`
          }
          hint={responderMode ? (distanceMetres ? `~${etaMin(distanceMetres)} min walk` : "Calculating…") : "Connaught Place"}
          tone="cyan" icon={<Clock className="w-6 h-6" />}
        />
        <StatCard label="Speed" value="4.2 km/h" hint="Walking" tone="emerald" icon={<Activity className="w-6 h-6" />} />
        <StatCard label="Battery" value={`${battery}%`} hint="Low-power armed" tone={battery < 20 ? "amber" : "violet"} icon={<Battery className="w-6 h-6" />} />
        <StatCard
          label="GPS Status"
          value={myPos ? "Live" : gpsError ? "Error" : "Fixing…"}
          hint={myPos ? "High accuracy" : gpsError ? "Enable location" : "Please wait"}
          tone={myPos ? "emerald" : gpsError ? "pink" : "amber"}
          icon={<MapPin className="w-6 h-6" />}
        />
      </div>

      {/* ── Map + Sidebar ────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-strong p-4 rounded-3xl">
          <div className="flex items-center justify-between mb-3 px-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400">
                {responderMode ? "Emergency Response Map" : "Live Journey"}
              </div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pink-300" />
                {responderMode
                  ? `You → ${activeDistress?.userName ?? "Victim"}`
                  : "Home → Connaught Place"}
              </div>
            </div>
            {responderMode && distanceMetres !== null && (
              <div className="text-right">
                <div className="text-amber-300 font-black text-lg">
                  {distanceMetres < 1000
                    ? `${Math.round(distanceMetres)} m`
                    : `${(distanceMetres / 1000).toFixed(2)} km`}
                </div>
                <div className="text-[11px] text-slate-400">live distance</div>
              </div>
            )}
          </div>

          <MapView
            center={mapCenter}
            zoom={responderMode ? 16 : 15}
            height={520}
            path={responderMode ? connectPath : WAYPOINTS}
            markers={markers}
            dangerZones={[
              { center: [28.6185, 77.2125], radius: 180, color: "#ffb020", label: "Low-light stretch" },
            ]}
          />

          {/* Legend */}
          <div className="flex gap-4 mt-3 px-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> You</span>
            {distressPos && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {activeDistress?.userName}</span>}
            {responderMode && connectPath.length > 0 && <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-cyan-400 inline-block" /> Route to victim</span>}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* ── Safe Journey Guardian Card ── */}
          <div className="glass-strong p-5 rounded-3xl space-y-4">
            <div className="font-bold flex items-center gap-2 text-cyan-300">
              <ShieldCheck className="w-5 h-5" /> Safe Journey Guardian
            </div>
            
            {!isJourneyActive ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start a monitored safe journey. RakshaNet will track your route, verify heartbeats, and alert your guardians if you miss checkpoints.
                </p>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Destination Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Connaught Place"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                      value={destLabel}
                      onChange={(e) => setDestLabel(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Expected Duration (mins)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                      value={expectedMins}
                      onChange={(e) => setExpectedMins(Number(e.target.value))}
                    />
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const startLat = myPos ? myPos[0] : 28.6139;
                    const startLng = myPos ? myPos[1] : 77.209;
                    const destLat = 28.6237;
                    const destLng = 77.2221;
                    
                    await startJourney({
                      sourceLat: startLat,
                      sourceLng: startLng,
                      destinationLat: destLat,
                      destinationLng: destLng,
                      expectedDurationMinutes: expectedMins
                    });
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs transition shadow-md shadow-cyan-950/20"
                >
                  🚀 Start Safe Journey
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Journey Status</div>
                    <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 blink" />
                      {currentJourney?.status || "ACTIVE"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Missed Checkpoints</div>
                    <div className={`text-sm font-bold mt-0.5 ${currentJourney?.missedCheckpoints && currentJourney.missedCheckpoints > 0 ? "text-rose-400 font-extrabold" : "text-slate-300"}`}>
                      {currentJourney?.missedCheckpoints ?? 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between glass p-2.5 rounded-xl">
                    <span className="text-slate-400">Start Time</span>
                    <span className="text-slate-200">
                      {currentJourney?.startTime ? new Date(currentJourney.startTime).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between glass p-2.5 rounded-xl">
                    <span className="text-slate-400">Expected Arrival</span>
                    <span className="text-cyan-300 font-semibold">
                      {currentJourney?.expectedArrivalTime ? new Date(currentJourney.expectedArrivalTime).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => {
                      const lat = myPos ? myPos[0] : 28.6139;
                      const lng = myPos ? myPos[1] : 77.209;
                      sendHeartbeat(lat, lng);
                    }}
                    className="py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5 text-cyan-400" /> Send Heartbeat
                  </button>
                  <button
                    onClick={() => confirmArrival()}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Confirm Arrival
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Guardians */}
          <div className="glass-strong p-5 rounded-3xl">
            <div className="font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" /> Guardians Watching
            </div>
            <div className="mt-3 space-y-2">
              {guardianWatching.map((g) => (
                <div key={g.name} className="flex items-center gap-3 glass p-3 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-cyan-400 grid place-items-center text-xs font-bold">
                    {g.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{g.name}</div>
                    <div className="text-[11px] text-slate-400">{g.rel} • {g.eta}</div>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${g.online ? "bg-emerald-400 blink" : "bg-slate-600"}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Live Location Details */}
          <div className="glass-strong p-5 rounded-3xl space-y-3">
            <div className="font-bold flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-300" /> Live Location Data
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between glass p-2.5 rounded-xl">
                <span className="text-slate-400">Your Coordinates</span>
                <span className="font-mono text-emerald-300 text-right">
                  {myPos ? `${myPos[0].toFixed(5)}, ${myPos[1].toFixed(5)}` : "Acquiring…"}
                </span>
              </div>
              {distressPos && (
                <div className="flex justify-between glass p-2.5 rounded-xl">
                  <span className="text-slate-400">{activeDistress.userName}</span>
                  <span className="font-mono text-red-300 text-right">
                    {activeDistress.latitude.toFixed(5)}, {activeDistress.longitude.toFixed(5)}
                  </span>
                </div>
              )}
              {distanceMetres !== null && (
                <div className="flex justify-between glass p-2.5 rounded-xl border border-amber-400/20">
                  <span className="text-slate-400">Distance Between</span>
                  <span className="font-bold text-amber-300">
                    {distanceMetres < 1000
                      ? `${Math.round(distanceMetres)} m`
                      : `${(distanceMetres / 1000).toFixed(2)} km`}
                  </span>
                </div>
              )}
              {distanceMetres !== null && (
                <div className="flex justify-between glass p-2.5 rounded-xl">
                  <span className="text-slate-400">Walking ETA</span>
                  <span className="font-bold text-cyan-300">~{etaMin(distanceMetres)} min</span>
                </div>
              )}
            </div>
          </div>

          {/* Route Safety */}
          <div className="glass-strong p-5 rounded-3xl">
            <div className="font-bold">Route Safety Score</div>
            <div className="mt-3 space-y-2 text-xs">
              {[
                ["Lighting", 82, "emerald"], ["Crowd density", 71, "cyan"],
                ["Police proximity", 64, "amber"], ["Community reports", 91, "emerald"],
              ].map(([l, v, t]: any) => (
                <div key={l}>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{l}</span>
                    <span className="tabular font-semibold">{v}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden">
                    <div className={`h-full ${t === "emerald" ? "bg-emerald-400" : t === "cyan" ? "bg-cyan-400" : "bg-amber-400"}`}
                      style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
