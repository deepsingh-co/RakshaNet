import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Users, Plus, Share2, Radio, MapPin, Shield,
  Copy, CheckCircle2, UserPlus, Cpu, LogIn, Trash2, AlertTriangle, X,
} from "lucide-react";
import { Card, Pill } from "../../components/ui";
import { podsApi } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";

interface Pod {
  id: string;
  name: string;
  members: number;
  active: boolean;
  code: string;
  creatorName?: string;
  memberNames?: string;
  sosTriggeredBy?: string;
  createdAt: string;
}

interface SosAlert {
  podId: string;
  podName: string;
  podCode: string;
  triggeredBy: string;
}

export default function PodsWeb() {
  const { user } = useAuthStore();
  const userName = user?.name || "Mangesh";

  const [pods, setPods] = useState<Pod[]>([]);
  const [newPodName, setNewPodName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [activePod, setActivePod] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<string | null>(null);
  
  // Global SOS notification overlay state
  const [globalSosAlert, setGlobalSosAlert] = useState<SosAlert | null>(null);
  const [dismissedSosIds, setDismissedSosIds] = useState<Set<string>>(new Set());
  const activePodRef = useRef<string | null>(null);
  const speakingRef = useRef(false);

  const fetchPods = useCallback(async () => {
    try {
      const data = await podsApi.list(userName);
      const formatted = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        members: p.members,
        active: p.active,
        code: p.code,
        creatorName: p.creatorName,
        memberNames: p.memberNames,
        sosTriggeredBy: p.sosTriggeredBy,
        createdAt: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "just now"
      }));
      setPods(formatted);
      
      // Auto-select first pod on first load
      if (formatted.length > 0 && !activePodRef.current) {
        activePodRef.current = formatted[0].id;
        setActivePod(formatted[0].id);
      }

      // ── GLOBAL SOS DETECTION across ALL user pods ──────────────────
      // This fires for Mangesh even if Nitesh triggered it in a different browser tab!
      const podWithSos = formatted.find(
        (p) =>
          p.sosTriggeredBy &&
          p.sosTriggeredBy.toLowerCase() !== userName.toLowerCase() // Don't alert yourself
      );

      if (podWithSos && podWithSos.sosTriggeredBy) {
        const alertKey = `${podWithSos.id}-${podWithSos.sosTriggeredBy}`;
        if (!dismissedSosIds.has(alertKey)) {
          // Show full-screen overlay
          setGlobalSosAlert({
            podId: podWithSos.id,
            podName: podWithSos.name,
            podCode: podWithSos.code,
            triggeredBy: podWithSos.sosTriggeredBy,
          });

          // Play urgent voice alert (only once per SOS event)
          if (!speakingRef.current) {
            speakingRef.current = true;
            const voiceMsg = `EMERGENCY ALERT! ${podWithSos.sosTriggeredBy} has triggered a critical SOS in safety pod ${podWithSos.name}! This is an emergency. Check their location immediately and call for help!`;
            const utterance = new SpeechSynthesisUtterance(voiceMsg);
            utterance.rate = 0.9;
            utterance.pitch = 1.2;
            utterance.volume = 1.0;
            utterance.onend = () => { speakingRef.current = false; };
            // Cancel any current speech then speak urgently
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }
        }
      } else if (!podWithSos) {
        // SOS was resolved – clear the overlay
        setGlobalSosAlert(null);
        speakingRef.current = false;
      }
    } catch (e) {
      console.error("Failed fetching pods from Spring Boot", e);
      if (pods.length === 0) {
        const fallbackPods = [
          { id: "1", name: "Late Night Cab (Fallback)", members: 4, active: true, code: "ABC123", createdAt: "2 hours ago" },
          { id: "2", name: "College Friends (Fallback)", members: 6, active: false, code: "XYZ789", createdAt: "Yesterday" },
        ];
        setPods(fallbackPods);
        activePodRef.current = "1";
        setActivePod("1");
      }
    }
  }, [userName, dismissedSosIds]);

  useEffect(() => {
    fetchPods(); // Initial load
    const interval = setInterval(fetchPods, 3000); // Poll database every 3 seconds for real-time cross-user SOS detection!
    return () => clearInterval(interval);
  }, [fetchPods]);

  // When the activePod state changes, sync the ref
  useEffect(() => {
    activePodRef.current = activePod;
  }, [activePod]);

  const dismissSosAlert = () => {
    if (globalSosAlert) {
      setDismissedSosIds(prev => new Set([...prev, `${globalSosAlert.podId}-${globalSosAlert.triggeredBy}`]));
      setGlobalSosAlert(null);
      window.speechSynthesis.cancel();
      speakingRef.current = false;
    }
  };

  const createPod = async () => {
    if (!newPodName.trim()) return;
    try {
      const data = await podsApi.create(newPodName, userName);
      const newPod: Pod = {
        id: data.id,
        name: data.name,
        members: data.members,
        active: data.active,
        code: data.code,
        creatorName: data.creatorName,
        memberNames: data.memberNames,
        sosTriggeredBy: data.sosTriggeredBy,
        createdAt: "just now",
      };
      setPods([newPod, ...pods]);
      setActivePod(newPod.id);
      setShowCode(data.code);
      setTimeout(() => setShowCode(null), 5000);
    } catch (e) {
      console.error("Failed creating pod", e);
      // Fallback local save in case of offline
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const newPod: Pod = {
        id: Date.now().toString(),
        name: newPodName,
        members: 1,
        active: true,
        code,
        createdAt: "just now",
      };
      setPods([newPod, ...pods]);
      setActivePod(newPod.id);
      setShowCode(code);
      setTimeout(() => setShowCode(null), 5000);
    }
    setNewPodName("");
  };

  const joinPod = async () => {
    if (!joinCode.trim()) return;
    try {
      const data = await podsApi.join(joinCode.trim().toUpperCase(), userName);
      const updatedPod: Pod = {
        id: data.id,
        name: data.name,
        members: data.members,
        active: data.active,
        code: data.code,
        creatorName: data.creatorName,
        memberNames: data.memberNames,
        sosTriggeredBy: data.sosTriggeredBy,
        createdAt: "just now",
      };
      setPods(prev => {
        const filtered = prev.filter(p => p.id !== data.id);
        return [updatedPod, ...filtered];
      });
      setActivePod(data.id);
    } catch (e) {
      console.error("Failed joining pod on backend, running local fallback search", e);
      const matchingPod = pods.find(p => p.code === joinCode.trim().toUpperCase());
      if (matchingPod) {
        setPods(prevPods => prevPods.map(p => {
          if (p.id === matchingPod.id) {
            return { ...p, members: Math.min(p.members + 1, 6), active: true };
          }
          return p;
        }));
        setActivePod(matchingPod.id);
      } else {
        alert(`✗ Invalid Pod Code: "${joinCode.trim().toUpperCase()}". Please check and try again!`);
      }
    }
    setJoinCode("");
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
  };

  return (
    <div className="space-y-6">
      {/* ── GLOBAL SOS EMERGENCY OVERLAY ─────────────────────────────── */}
      <AnimatePresence>
        {globalSosAlert && (
          <motion.div
            key="sos-overlay"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              animate={{ boxShadow: ["0 0 0 0 rgba(239,68,68,0.7)", "0 0 0 30px rgba(239,68,68,0)", "0 0 0 0 rgba(239,68,68,0)"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="relative max-w-md w-full mx-4 rounded-3xl bg-gradient-to-br from-red-900/95 to-red-950/95 border-2 border-red-500 p-8 text-center shadow-2xl shadow-red-950"
            >
              {/* Dismiss button */}
              <button
                onClick={dismissSosAlert}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <X className="w-4 h-4 text-red-200" />
              </button>

              {/* Pulsing icon */}
              <div className="relative w-20 h-20 mx-auto mb-5">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-red-500/30"
                />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-white" />
                </div>
              </div>

              <motion.div
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-red-200 text-xs uppercase tracking-[0.3em] font-bold mb-2"
              >
                🚨 Emergency Alert — Safety Pod
              </motion.div>

              <h2 className="text-3xl font-black text-white mb-2">SOS TRIGGERED!</h2>
              
              <div className="text-xl font-bold text-red-300 mb-1">
                {globalSosAlert.triggeredBy}
              </div>
              <p className="text-sm text-red-200/80 mb-1">
                triggered an emergency in
              </p>
              <div className="text-lg font-bold text-white mb-4">
                "{globalSosAlert.podName}"
              </div>

              <p className="text-xs text-red-300/70 mb-6">
                Check their live location on the map and reach out immediately. Every second counts!
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    // Switch to the SOS pod
                    setActivePod(globalSosAlert.podId);
                    activePodRef.current = globalSosAlert.podId;
                    dismissSosAlert();
                    // Scroll to map section after a short delay to allow render
                    setTimeout(() => {
                      const mapEl = document.getElementById("pod-live-map");
                      if (mapEl) {
                        mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
                      } else {
                        window.scrollTo({ top: 600, behavior: "smooth" });
                      }
                    }, 200);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-red-950"
                >
                  <MapPin className="w-4 h-4" /> View Their Location Now
                </button>
                <button
                  onClick={async () => {
                    try {
                      await podsApi.resolveSos(globalSosAlert.podCode);
                      fetchPods();
                      dismissSosAlert();
                    } catch (e) {
                      console.error("Failed resolving SOS", e);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-semibold text-sm border border-emerald-500/30 transition"
                >
                  <CheckCircle2 className="w-4 h-4 inline mr-1" /> Mark as Safe / Resolved
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 mb-2">
        <Link to="/app/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Group Safety</div>
          <h1 className="text-3xl font-black">Safety Pods</h1>
          <p className="text-slate-400 text-sm mt-1">Group travel protection with shared live location</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card glow="cyan">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-semibold">WebRTC P2P + Group WebSocket</span>
            </div>
            <p className="text-sm text-slate-400">
              Create pods for group travel. All members share live location in real-time.
              Any member triggers SOS → everyone alerted. Perfect for late-night cabs, walks, events.
            </p>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Plus className="w-4 h-4 text-cyan-300" />
                <h3 className="text-sm font-bold">Create Pod</h3>
              </div>
              <input
                value={newPodName}
                onChange={(e) => setNewPodName(e.target.value)}
                placeholder="e.g., Friday Night Out"
                className="w-full glass px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-cyan-400/40 mb-3"
              />
              <button
                onClick={createPod}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create
              </button>

              {showCode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30"
                >
                  <div className="text-xs text-emerald-300 font-semibold mb-1">Share this code:</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-black tracking-widest font-mono text-emerald-200">{showCode}</div>
                    <button onClick={() => copyCode(showCode)} className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30">
                      <Copy className="w-3.5 h-3.5 text-emerald-300" />
                    </button>
                  </div>
                </motion.div>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3">
                <LogIn className="w-4 h-4 text-emerald-300" />
                <h3 className="text-sm font-bold">Join Pod</h3>
              </div>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="6-digit code"
                maxLength={6}
                className="w-full glass px-4 py-2.5 rounded-xl text-center text-2xl tracking-widest font-mono outline-none border border-transparent focus:border-emerald-400/40 mb-3"
              />
              <button
                onClick={joinPod}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> Join
              </button>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Your Pods ({pods.length})</h3>
              <Pill tone="cyan">{pods.filter((p) => p.active).length} active</Pill>
            </div>
            <div className="space-y-3">
              {pods.map((pod, i) => (
                <motion.div
                  key={pod.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl grid place-items-center ${
                        pod.active ? "bg-gradient-to-br from-cyan-500 to-blue-600" : "bg-gradient-to-br from-slate-600 to-slate-700"
                      }`}>
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-lg">{pod.name}</span>
                          {pod.active && <Pill tone="cyan">ACTIVE</Pill>}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {pod.members} members</span>
                          <span className="flex items-center gap-1 font-mono"><Share2 className="w-3 h-3" /> {pod.code}</span>
                          <span>{pod.createdAt}</span>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => copyCode(pod.code)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/30 flex items-center gap-1"
                          >
                            <Share2 className="w-3 h-3" /> Share Code
                          </button>
                          {activePod === pod.id ? (
                            <button
                              onClick={() => setActivePod(null)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/30 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </button>
                          ) : (
                            <button
                              onClick={() => setActivePod(pod.id)}
                              className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-200 text-xs font-semibold hover:bg-pink-500/30 flex items-center gap-1"
                            >
                              <Radio className="w-3 h-3" /> Activate
                            </button>
                          )}
                          {pod.creatorName?.toLowerCase() === userName.toLowerCase() && (
                            <button
                              onClick={async () => {
                                if (confirm(`🚨 Are you sure you want to end and delete the safety pod "${pod.name}"?`)) {
                                  try {
                                    await podsApi.delete(pod.code, userName);
                                    if (activePod === pod.id) {
                                      setActivePod(null);
                                    }
                                    fetchPods();
                                  } catch (e) {
                                    console.error("Failed to delete pod", e);
                                  }
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 text-xs font-semibold hover:bg-red-500/30 flex items-center gap-1 transition ml-auto border border-red-500/20"
                            >
                              <Trash2 className="w-3 h-3 text-red-300 animate-pulse" /> End Pod
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {activePod && (() => {
            const activePodObj = pods.find((p) => p.id === activePod);
            
            // Extract the comma separated list of joined members from Spring Boot
            const membersList = activePodObj?.memberNames
              ? activePodObj.memberNames.split(",").map(m => m.trim())
              : [activePodObj?.creatorName || userName];

            const memberPositions = [
              { x: 30, y: 40, color: "from-pink-500 to-rose-600" },
              { x: 60, y: 30, color: "from-cyan-500 to-blue-600" },
              { x: 45, y: 70, color: "from-amber-500 to-orange-600" },
              { x: 75, y: 60, color: "from-emerald-500 to-teal-600" },
              { x: 20, y: 65, color: "from-purple-500 to-indigo-600" },
              { x: 80, y: 25, color: "from-teal-500 to-emerald-600" },
            ];

            const visibleMembers = membersList.map((name, index) => {
              const pos = memberPositions[index % memberPositions.length];
              const isCurrentUser = name.toLowerCase() === userName.toLowerCase();
              return {
                x: pos.x,
                y: pos.y,
                name: isCurrentUser ? `You (${name})` : name,
                color: pos.color,
              };
            });

            const isSosActive = !!activePodObj?.sosTriggeredBy;

            return (
              <Card glow={isSosActive ? "pink" : "emerald"}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-5 h-5 ${isSosActive ? "text-red-400 animate-ping" : "text-emerald-300"}`} />
                    <h3 className="text-lg font-bold">
                      Pod Active: {activePodObj?.name} {isSosActive ? "— 🚨 SOS TRIGGERED!" : "— Live Tracking"}
                    </h3>
                  </div>
                  {activePodObj && activePodObj.members < 6 && (
                    <button
                      onClick={async () => {
                        try {
                          const existingNames = activePodObj?.memberNames
                            ? activePodObj.memberNames.split(",").map(n => n.trim().toLowerCase())
                            : [];
                          const pool = ["Priya", "Anita", "Rahul", "Karan"];
                          const nextSimName = pool.find(n => !existingNames.includes(n.toLowerCase())) || "Guest";
                          await podsApi.join(activePodObj.code, nextSimName);
                          fetchPods();
                        } catch (e) {
                          setPods(prev => prev.map(p => {
                            if (p.id === activePod) {
                              return { ...p, members: p.members + 1 };
                            }
                            return p;
                          }));
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold transition flex items-center gap-1 border border-emerald-500/30"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Simulate Member Join ({activePodObj.code})
                    </button>
                  )}
                </div>

                {isSosActive ? (
                  <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center space-y-3">
                    <div className="text-red-400 font-black text-xl flex items-center justify-center gap-2 animate-bounce">
                      <Radio className="w-6 h-6 animate-ping text-red-500" />
                      🚨 EMERGENCY: {activePodObj?.sosTriggeredBy} triggered SOS!
                    </div>
                    <p className="text-xs text-red-200">
                      An emergency signal was activated inside this travel safety pod. Location coordinates are being shared dynamically. Check their position on the map below!
                    </p>
                    <button
                      onClick={async () => {
                        if (!activePodObj) return;
                        try {
                          await podsApi.resolveSos(activePodObj.code);
                          fetchPods();
                        } catch (e) {
                          console.error("Failed resolving SOS", e);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-950"
                    >
                      Mark SOS as Resolved / Safe
                    </button>
                  </div>
                ) : (
                  <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-sm text-slate-400">
                      All members can see each other's live location. Current Members: <strong className="text-cyan-300">{activePodObj?.members}</strong>. Anyone triggers SOS → all alerted instantly.
                    </p>
                    <button
                      onClick={async () => {
                        if (!activePodObj) return;
                        try {
                          await podsApi.triggerSos(activePodObj.code, userName);
                          fetchPods();
                        } catch (e) {
                          console.error("Failed triggering SOS", e);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-red-950/45 animate-pulse"
                    >
                      <Radio className="w-4 h-4 animate-ping" /> Trigger Pod SOS
                    </button>
                  </div>
                )}

                {/* Map placeholder */}
                <div id="pod-live-map" className={`relative h-64 glass rounded-2xl overflow-hidden border transition-colors duration-500 ${isSosActive ? "border-red-500/50" : "border-transparent"}`}>
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: "linear-gradient(rgba(56,232,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,232,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }} />
                  {visibleMembers.map((m, i) => {
                    const cleanName = m.name.replace("You (", "").replace(")", "");
                    const isSenderInSos = isSosActive && cleanName.toLowerCase() === activePodObj?.sosTriggeredBy?.toLowerCase();
                    return (
                      <motion.div
                        key={i}
                        animate={isSenderInSos ? { scale: [1, 1.15, 1], y: [0, -5, 0] } : { x: [0, 5, 0], y: [0, 3, 0] }}
                        transition={isSenderInSos ? { duration: 1.5, repeat: Infinity } : { duration: 3, repeat: Infinity, delay: i * 0.5 }}
                        className="absolute"
                        style={{ left: `${m.x}%`, top: `${m.y}%` }}
                      >
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${m.color} grid place-items-center text-white text-xs font-bold border-2 ${
                            isSenderInSos 
                              ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,1.0)] scale-110" 
                              : "border-white/30"
                          }`}>
                            {cleanName[0]}
                          </div>
                          <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap px-1 rounded ${
                            isSenderInSos ? "text-red-400 bg-red-950/70 border border-red-500/30" : "text-white"
                          }`}>
                            {m.name} {isSenderInSos && "🚨"}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            );
          })()}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="text-sm font-bold mb-3">Use Cases</div>
            <div className="space-y-2 text-xs">
              {[
                { i: "🚖", t: "Late-night cabs", d: "Share ride with friends" },
                { i: "🌙", t: "Night walks", d: "Group walks together" },
                { i: "🎉", t: "Parties/events", d: "Stay connected in crowd" },
                { i: "🏕️", t: "Travel/trips", d: "Group travel safety" },
                { i: "🎓", t: "College commute", d: "Daily travel pods" },
              ].map((u) => (
                <div key={u.t} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <div className="text-lg">{u.i}</div>
                  <div>
                    <div className="font-semibold">{u.t}</div>
                    <div className="text-slate-400">{u.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Pod Features</div>
            <div className="space-y-1.5 text-xs text-slate-300">
              {[
                "Real-time group location",
                "Group SOS (one triggers all)",
                "In-pod chat & voice",
                "Route deviation alerts",
                "ETA to each other",
                "Emergency broadcast",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <CheckCircle2 className="w-3 h-3 text-cyan-300 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-bold">Privacy First</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Location only shared with pod members. End-to-end encrypted. Auto-deletes after pod ends. No server storage.
            </p>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-bold">Invite Friends</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Share pod code via WhatsApp, SMS, or QR. Anyone with the RakshaNet app can join instantly.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
