import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Mic, MicOff, ShieldCheck, Save, Trash2,
  Eye, EyeOff, AlertTriangle, CheckCircle2, Radio, Lock,
} from "lucide-react";
import { Card, Pill } from "../ui";
import { isLocalMode, sosApi, voiceCodeApi } from "../api/endpoints";

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type Status = "idle" | "saving" | "saved" | "armed" | "triggered" | "error";

export default function VoiceCodeWeb() {
  // ── Phrase Setup State ────────────────────────────────────────────
  const [phrase, setPhrase] = useState("");
  const [savedHint, setSavedHint] = useState("");
  const [hasPhrase, setHasPhrase] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [pendingSos, setPendingSos] = useState(false);

  // ── Listening / Armed State ───────────────────────────────────────
  const [armed, setArmed] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [listeningStatus, setListeningStatus] = useState("Tap to arm");
  const recognitionRef = useRef<any>(null);
  const armedRef = useRef(false); // keep in sync with state for closure safety
  armedRef.current = armed;
  const lastCheckedRef = useRef(""); // prevent spamming backend

  // ── Voice input for setup (type by speaking) ──────────────────────
  const [voiceInput, setVoiceInput] = useState(false);
  const setupRecogRef = useRef<any>(null);

  // ── Load existing phrase hint on mount ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await voiceCodeApi.get();
        if (data.active) {
          setHasPhrase(true);
          setSavedHint(data.hint);
        }
      } catch { /* no phrase saved yet */ }
    })();
  }, []);

  // ── Save phrase to backend ─────────────────────────────────────────
  const savePhrase = async () => {
    if (!phrase.trim() || phrase.trim().length < 3) {
      setStatus("error");
      setStatusMsg("Phrase must be at least 3 characters");
      return;
    }
    setStatus("saving");
    try {
      const data = await voiceCodeApi.save(phrase.trim());
      setSavedHint(data.hint);
      setHasPhrase(true);
      setPhrase("");
      setStatus("saved");
      setStatusMsg(`Secret phrase saved! Hint: ${data.hint}`);
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setStatusMsg("Failed to save. Please try again.");
    }
  };

  // ── Delete phrase ─────────────────────────────────────────────────
  const deletePhrase = async () => {
    try {
      await voiceCodeApi.remove();
      setHasPhrase(false);
      setSavedHint("");
      setArmed(false);
      stopListening();
      setStatusMsg("Secret phrase removed.");
    } catch { /* ignore */ }
  };

  // ── Voice-to-text for SETUP INPUT ────────────────────────────────
  const startVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Your browser doesn't support voice input. Please type manually."); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setPhrase(text);
      setVoiceInput(false);
    };
    rec.onerror = () => setVoiceInput(false);
    rec.onend = () => setVoiceInput(false);
    setupRecogRef.current = rec;
    rec.start();
    setVoiceInput(true);
  };

  // ── Start continuous listening (ARMED mode) ───────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";

    rec.onstart = () => setListeningStatus("🎤 Listening… speak your phrase");

    rec.onresult = async (e: any) => {
      let current = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .toLowerCase()
        .replace(/[.,!?]/g, "")
        .trim();
      setTranscript(current);

      const expectedWordCount = savedHint ? savedHint.trim().split(/\s+/).length : 0;

      if (expectedWordCount > 0 && current) {
        const words = current.split(/\s+/);
        // We only need to check if we have enough words
        if (words.length >= expectedWordCount) {
          // Extract the last 'expectedWordCount' words as the candidate phrase
          const candidate = words.slice(-expectedWordCount).join(" ");
          
          // Only send to backend if we haven't checked this exact candidate yet
          if (candidate !== lastCheckedRef.current) {
            lastCheckedRef.current = candidate;
            
            try {
              const data = await voiceCodeApi.verify(candidate);
              if (data.match) {
                // A matched duress phrase stops listening and asks for an
                // explicit confirmation. RakshaNet never lets an automated
                // matcher create an incident on its own.
                setArmed(false);
                stopListening();
                setStatus("triggered");
                setPendingSos(true);
                setStatusMsg(
                  "Duress phrase recognised. SOS was not sent automatically — confirm below.",
                );
              }
            } catch { /* network error — ignore silently */ }
          }
        }
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") {
        // Restart on silence
        if (armedRef.current) rec.start();
      } else {
        setListeningStatus("⚠️ Mic error — tap to retry");
        setArmed(false);
      }
    };

    rec.onend = () => {
      // Auto-restart if still armed
      if (armedRef.current) {
        try { rec.start(); } catch { /* ignore */ }
      } else {
        setListeningStatus("Tap to arm");
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setListeningStatus("Tap to arm");
    setTranscript("");
  };

  const toggleArmed = () => {
    if (!hasPhrase) {
      setStatusMsg("⚠️ Save a secret phrase first before arming.");
      return;
    }
    if (armed) {
      setArmed(false);
      stopListening();
    } else {
      setArmed(true);
      startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      setupRecogRef.current?.stop();
    };
  }, []);

  const sendSos = async () => {
    setPendingSos(false);
    const send = async (latitude: number, longitude: number) => {
      await sosApi.trigger({
        triggerType: "VOICE",
        latitude,
        longitude,
        areaName: "Voice Secret Code Triggered",
      });
    };
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await send(pos.coords.latitude, pos.coords.longitude);
            resolve();
          },
          async () => {
            await send(0, 0);
            resolve();
          },
          { enableHighAccuracy: true, timeout: 6000 },
        );
      });
      setStatusMsg(
        isLocalMode
          ? "SOS recorded on this device. Local mode does not call or message anyone."
          : "SOS sent to the RakshaNet command center.",
      );
    } catch {
      setStatusMsg("Could not record the SOS. Use the main SOS screen instead.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-pink-300">Stealth Trigger</div>
          <h1 className="text-3xl font-black">Voice Secret Code</h1>
          <p className="text-slate-400 text-sm mt-1">
            Say your decoy phrase — the app recognises it and asks you to confirm SOS.
          </p>
        </div>
      </div>

      {/* SOS triggered — invisible overlay (shown briefly, then clears) */}
      <AnimatePresence>
        {status === "triggered" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none"
            onAnimationComplete={() => setTimeout(() => setStatus("idle"), 100)}
          >
            {/* Completely transparent — screen looks unchanged to attacker */}
            <div className="sr-only">SOS Triggered</div>
          </motion.div>
        )}
      </AnimatePresence>

      {pendingSos && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-red-200">
            <AlertTriangle className="w-4 h-4" />
            Duress phrase matched — confirm before anything is sent
          </div>
          <p className="mt-1 text-xs text-red-100/80">
            Nothing has been sent yet. Confirming records an SOS with your current
            location. In local mode this stays on this device.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void sendSos()}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400"
            >
              Send SOS now
            </button>
            <button
              onClick={() => {
                setPendingSos(false);
                setStatusMsg("Cancelled. No SOS was sent.");
              }}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
            >
              I'm safe — cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* ── Step 1: Setup Phrase ─────────────────────────────── */}
          <Card glow="pink">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-bold">Step 1 — Set Your Secret Phrase</span>
              {hasPhrase && <Pill tone="emerald">ACTIVE</Pill>}
            </div>

            {/* Current saved phrase hint */}
            {hasPhrase && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-300 font-semibold">Current Secret Phrase</div>
                  <div className="text-lg font-mono font-bold mt-0.5">
                    {showPhrase ? savedHint : savedHint.replace(/[^\s]/g, "●")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPhrase(!showPhrase)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                    {showPhrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={deletePhrase}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Phrase input */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold">
                  {hasPhrase ? "UPDATE PHRASE" : "TYPE YOUR DECOY PHRASE"}
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPhrase ? "text" : "password"}
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && savePhrase()}
                    placeholder="e.g. Call mom, Order pizza, Play music..."
                    className="w-full glass px-4 py-3 rounded-xl text-sm outline-none pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button onClick={() => setShowPhrase(!showPhrase)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
                      {showPhrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={startVoiceInput}
                      className={`p-1.5 rounded-lg transition ${voiceInput ? "bg-pink-500/30 text-pink-300 animate-pulse" : "hover:bg-white/10 text-slate-400"}`}
                      title="Speak your phrase instead"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {voiceInput && (
                  <div className="text-[11px] text-pink-300 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping inline-block" />
                    Listening… speak your secret phrase now
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Choose something you'd naturally say aloud — "Order food", "Text Priya", "Play music"
                </p>
              </div>

              <button
                onClick={savePhrase}
                disabled={status === "saving" || !phrase.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {status === "saving" ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                ) : (
                  <><Save className="w-4 h-4" /> {hasPhrase ? "Update Secret Phrase" : "Save Secret Phrase"}</>
                )}
              </button>

              {/* Status message */}
              <AnimatePresence>
                {statusMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                      status === "error" ? "bg-red-500/10 text-red-300 border border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    }`}
                  >
                    {status === "error"
                      ? <AlertTriangle className="w-4 h-4 shrink-0" />
                      : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {statusMsg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* ── Step 2: Arm the Trigger ──────────────────────────── */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-bold">Step 2 — Arm the Hidden Trigger</span>
              {armed && <Pill tone="pink">ARMED</Pill>}
            </div>

            <div className="text-center py-6">
              {/* Main arm button */}
              <motion.button
                onClick={toggleArmed}
                whileTap={{ scale: 0.95 }}
                className={`relative w-40 h-40 rounded-full mx-auto flex flex-col items-center justify-center gap-2 font-bold text-sm transition-all ${
                  armed
                    ? "bg-gradient-to-br from-red-500 to-rose-700 shadow-[0_0_60px_rgba(239,68,68,0.6)]"
                    : hasPhrase
                    ? "bg-gradient-to-br from-pink-500 to-rose-600 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                    : "bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed"
                }`}
              >
                {/* Pulsing ring when armed */}
                {armed && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-red-500/30"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                      className="absolute inset-0 rounded-full bg-red-500/20"
                    />
                  </>
                )}
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  {armed ? (
                    <MicOff className="w-10 h-10 text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                  <span className="text-white font-black text-base">
                    {armed ? "DISARM" : "ARM"}
                  </span>
                  <span className="text-white/70 text-[11px]">
                    {armed ? "Click to stop" : "Click to arm"}
                  </span>
                </div>
              </motion.button>

              {/* Listening status */}
              <div className="mt-5 space-y-2">
                <div className={`text-sm font-semibold ${armed ? "text-red-300" : "text-slate-400"}`}>
                  {armed ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                      {listeningStatus}
                    </span>
                  ) : listeningStatus}
                </div>
                {armed && hasPhrase && (
                  <div className="text-[11px] text-slate-500">
                    Waiting for: <span className="font-mono text-slate-400">{savedHint}</span>
                  </div>
                )}
                {armed && transcript && (
                  <div className="text-[11px] text-slate-600 max-w-xs mx-auto italic">
                    Heard: "{transcript.slice(-60)}"
                  </div>
                )}
              </div>

              {!hasPhrase && (
                <p className="text-xs text-amber-300 mt-3 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Save a secret phrase in Step 1 first
                </p>
              )}
            </div>

            {/* Security note */}
            <div className="mt-2 p-3 rounded-xl bg-slate-800/50 border border-white/5 text-[11px] text-slate-400 flex gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
              <span>
                When triggered, SOS fires silently in the background. <strong className="text-white">No sound. No screen change.</strong> The attacker will not know.
                Guardian alerts, GPS, and evidence vault activate instantly.
              </span>
            </div>
          </Card>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <Card glow="pink">
            <div className="text-sm font-bold mb-3">How It Works</div>
            <div className="space-y-3 text-xs">
              {[
                { n: "1", t: "Set Phrase", d: "Type a decoy phrase like \"Call Mom\"" },
                { n: "2", t: "Arm Trigger", d: "Tap ARM — mic starts listening silently" },
                { n: "3", t: "Speak It", d: "Say your phrase naturally near attacker" },
                { n: "4", t: "SOS Fires", d: "Alerts, GPS, evidence vault activate" },
                { n: "5", t: "No Trace", d: "Screen unchanged — attacker is unaware" },
              ].map((s) => (
                <div key={s.n} className="flex gap-3 glass p-2.5 rounded-lg">
                  <div className="text-xl font-black text-pink-400 w-6 shrink-0">{s.n}</div>
                  <div>
                    <div className="font-semibold">{s.t}</div>
                    <div className="text-slate-400 mt-0.5">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">✅ Good Phrase Examples</div>
            <div className="space-y-1.5 text-xs">
              {["Call Mom", "Order pizza", "Play music", "Set alarm", "Text Priya"].map((p) => (
                <button key={p} onClick={() => setPhrase(p)}
                  className="w-full text-left glass p-2 rounded-lg hover:bg-white/10 text-emerald-300 font-mono transition">
                  "{p}" →
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              ❌ Avoid These
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              {[
                "Single words (\"Help\", \"Yes\")",
                "Common phrases heard accidentally",
                "Very long sentences",
                "Foreign words you may mispronounce",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <span className="text-red-400 shrink-0">✗</span> {t}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-300" />
              Security
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your phrase is stored as a <strong className="text-white">BCrypt hash</strong> — never as plaintext. Even the server cannot read your actual phrase. Only a matching spoken word unlocks the trigger.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
