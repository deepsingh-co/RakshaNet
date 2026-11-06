import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  Volume2,
  Radio,
  CheckCircle2,
} from "lucide-react";
import {
  playDemoCallRingtone,
  stopDemoCallRingtone,
  speakDemoCallOperator,
  stopDemoCallOperatorSpeech,
} from "../services/voiceDistressService";

interface DemoCallState {
  isOpen: boolean;
  caller: string;
  number: string;
  phrase: string;
  status: "ringing" | "connected" | "ended";
  duration: number;
}

export function DemoCallOverlay() {
  const [call, setCall] = useState<DemoCallState>({
    isOpen: false,
    caller: "🚨 RakshaNet Safety Dispatch",
    number: "+91 112 • Emergency SOS Desk",
    phrase: "Mera koi picha kr raha hai",
    status: "ringing",
    duration: 0,
  });

  const timerRef = useRef<any>(null);

  // Listen for global demo-call events
  useEffect(() => {
    const handleTriggerCall = (e: any) => {
      const { phrase, caller, number } = e.detail || {};
      setCall({
        isOpen: true,
        caller: caller || "🚨 RakshaNet Safety Dispatch",
        number: number || "+91 112 • Emergency SOS Desk",
        phrase: phrase || "Mera koi picha kr raha hai",
        status: "ringing",
        duration: 0,
      });

      // Start ringing sound
      playDemoCallRingtone();
    };

    window.addEventListener("rakshanet:demo-call", handleTriggerCall);
    return () => {
      window.removeEventListener("rakshanet:demo-call", handleTriggerCall);
    };
  }, []);

  // Connected call duration timer
  useEffect(() => {
    if (call.status === "connected") {
      timerRef.current = setInterval(() => {
        setCall((prev) => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call.status]);

  const handleAnswer = () => {
    stopDemoCallRingtone();
    setCall((prev) => ({ ...prev, status: "connected" }));
    // Trigger spoken voice operator
    speakDemoCallOperator(call.phrase);
  };

  const handleDecline = () => {
    stopDemoCallRingtone();
    stopDemoCallOperatorSpeech();
    setCall((prev) => ({ ...prev, status: "ended" }));
    setTimeout(() => {
      setCall((prev) => ({ ...prev, isOpen: false }));
    }, 600);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!call.isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          className="w-full max-w-sm rounded-[36px] p-6 glass-strong border border-pink-500/30 shadow-2xl relative overflow-hidden flex flex-col items-center text-center glow-pink"
          style={{ background: "color-mix(in srgb, var(--aegis-bg-alt, #0f172a) 90%, #831843 10%)" }}
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-pink-500/20 to-transparent pointer-events-none" />

          {/* Top header badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-[11px] font-bold text-pink-300 uppercase tracking-wider mb-6">
            <Radio className="w-3 h-3 text-pink-400 animate-pulse" />
            {call.status === "ringing" ? "Incoming Emergency Call" : "Call in Progress"}
          </div>

          {/* Caller Avatar with pulsing radar animation */}
          <div className="relative my-4">
            {call.status === "ringing" && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-pink-500/30"
                />
                <motion.div
                  animate={{ scale: [1, 2.1], opacity: [0.4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
                  className="absolute inset-0 rounded-full bg-rose-500/20"
                />
              </>
            )}

            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-500 p-1 shadow-xl relative z-10 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-pink-400 animate-bounce" />
              </div>
            </div>
          </div>

          {/* Caller Details */}
          <h2 className="text-xl font-black text-white mt-3 tracking-wide">{call.caller}</h2>
          <p className="text-xs text-pink-300/80 font-mono mt-0.5">{call.number}</p>

          {/* Trigger Context */}
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300 max-w-xs">
            Voice trigger: <span className="text-pink-300 font-semibold italic">"{call.phrase}"</span>
          </div>

          {/* Call Status / Timer */}
          <div className="mt-4 text-sm font-semibold text-slate-400">
            {call.status === "ringing" ? (
              <span className="flex items-center gap-1.5 text-pink-300">
                <Volume2 className="w-4 h-4 animate-pulse" /> Ringing (Demo Escape Call)...
              </span>
            ) : call.status === "connected" ? (
              <div className="space-y-1">
                <div className="text-emerald-400 font-mono text-base font-bold">{formatTimer(call.duration)}</div>
                <div className="text-[11px] text-slate-400">Voice operator active • Location shared</div>
              </div>
            ) : (
              <span className="text-slate-500">Call Ended</span>
            )}
          </div>

          {/* Spoken Operator Live Audio Wave & Transcript (when connected) */}
          {call.status === "connected" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3.5 rounded-2xl bg-slate-900/80 border border-pink-500/30 text-left text-xs text-slate-300 space-y-2 w-full"
            >
              <div className="flex items-center justify-between text-[11px] text-pink-300 font-semibold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Dispatcher Speaking
                </span>
                <span className="flex items-center gap-0.5">
                  {[12, 22, 16, 28, 14, 20].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-pink-400 rounded-full animate-pulse"
                      style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed italic border-l-2 border-pink-500 pl-2">
                "RakshaNet Command here. Distress detected for '{call.phrase}'. Emergency SMS and WhatsApp alerts have been sent to your guardians with your live location. Help is on the way!"
              </p>
            </motion.div>
          )}

          {/* Actions Bottom Bar */}
          <div className="w-full mt-6 pt-4 border-t border-white/10 flex items-center justify-around">
            {call.status === "ringing" ? (
              <>
                {/* Decline Button */}
                <button
                  onClick={handleDecline}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition">
                    <PhoneOff className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">Decline</span>
                </button>

                {/* Answer Button */}
                <button
                  onClick={handleAnswer}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:scale-110 transition animate-pulse">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400">Answer</span>
                </button>
              </>
            ) : (
              /* End Call Button */
              <button
                onClick={handleDecline}
                className="flex flex-col items-center gap-1 group cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/40 group-hover:scale-105 transition">
                  <PhoneOff className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-red-400">End Emergency Call</span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
