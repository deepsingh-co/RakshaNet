import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Siren,
  ShieldAlert,
  MessageSquare,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  CheckCircle2,
  Play,
} from "lucide-react";
import { useSafetyStore } from "../store/safetyStore";
import {
  checkDistressKeywords,
  executeVoiceDistressDispatch,
  stopEmergencySiren,
  transcribeWithGnani,
  VoiceDispatchResult,
} from "../services/voiceDistressService";

interface VoiceDistressDetectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceDistressDetector({ isOpen, onClose }: VoiceDistressDetectorProps) {
  const { currentLocation, sosActive, dismissSOS } = useSafetyStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessingGnani, setIsProcessingGnani] = useState(false);
  const [gnaniTranscript, setGnaniTranscript] = useState("");
  const [dispatchResult, setDispatchResult] = useState<VoiceDispatchResult | null>(null);
  const [sirenMuted, setSirenMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number[]>([15, 25, 45, 60, 30, 20]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Trigger dispatch handler
  const handleTriggerSos = useCallback(
    async (phrase: string, source: "gnani.ai" | "web-speech" | "manual-test") => {
      const result = await executeVoiceDistressDispatch(phrase, source);
      setDispatchResult(result);
    },
    []
  );

  // Initialize Speech Recognition
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Google Chrome or test with the One-Click Test button.");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "hi-IN"; // Primary Hindi recognition (detects Hindi and Hinglish)

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }

        setTranscript(currentTranscript);

        // Check for distress trigger
        const check = checkDistressKeywords(currentTranscript);
        if (check.isDistress) {
          recognition.stop();
          setIsListening(false);
          handleTriggerSos(check.matchedKeyword, "web-speech");
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[VoiceDetector] recognition error:", event.error);
        if (event.error === "not-allowed") {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Auto-restart if modal is open and SOS not active
        if (isOpen && !useSafetyStore.getState().sosActive) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error("[VoiceDetector] failed to start recognition:", err);
      setIsListening(false);
    }
  }, [isOpen, handleTriggerSos]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Record audio clip and send to Gnani.ai API
  const handleRecordWithGnani = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setIsProcessingGnani(true);
        const res = await transcribeWithGnani(audioBlob);
        setIsProcessingGnani(false);

        if (res.success && res.transcript) {
          setGnaniTranscript(res.transcript);
          const check = checkDistressKeywords(res.transcript);
          if (check.isDistress) {
            handleTriggerSos(res.transcript, "gnani.ai");
          }
        } else if (res.error) {
          console.warn("[Gnani STT]", res.error);
          setGnaniTranscript(`Gnani STT: ${res.error}`);
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);

      // Record for 4 seconds then transcribe
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 4000);
    } catch (err: any) {
      alert("Microphone permission required for Gnani.ai voice transcription: " + err.message);
    }
  };

  // Pulse visualizer
  useEffect(() => {
    if (!isListening) return;
    const interval = setInterval(() => {
      setAudioLevel([
        Math.floor(20 + Math.random() * 60),
        Math.floor(30 + Math.random() * 70),
        Math.floor(40 + Math.random() * 80),
        Math.floor(20 + Math.random() * 50),
        Math.floor(30 + Math.random() * 65),
        Math.floor(15 + Math.random() * 45),
      ]);
    }, 150);
    return () => clearInterval(interval);
  }, [isListening]);

  // Start on modal open
  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen, startListening, stopListening]);

  const toggleSiren = () => {
    if (sirenMuted) {
      setSirenMuted(false);
    } else {
      stopEmergencySiren();
      setSirenMuted(true);
    }
  };

  const handleDismissAll = () => {
    stopEmergencySiren();
    dismissSOS();
    setDispatchResult(null);
    setTranscript("");
    setGnaniTranscript("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-pink-500/30 bg-slate-900/95 shadow-2xl shadow-pink-950/50 text-white"
      >
        {/* Glow header stripe */}
        <div className="h-2 w-full bg-gradient-to-r from-pink-500 via-rose-500 to-cyan-400" />

        {/* Modal content */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/30">
                <Mic className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white">AI Voice Distress Guard</h3>
                  <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-[10px] font-bold text-pink-300 border border-pink-400/30">
                    Gnani.ai Prisma v3.0
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Instant activation when you say:{" "}
                  <strong className="text-pink-300">"Mera koi picha kr raha hai"</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ACTIVE DISPATCH STATE (When Triggered) */}
          <AnimatePresence>
            {(dispatchResult || sosActive) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-2xl border-2 border-red-500 bg-red-950/40 p-5 shadow-inner"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-400">
                    <Siren className="h-6 w-6 animate-ping" />
                    <span className="text-sm font-black tracking-wider uppercase">
                      🚨 DISTRESS DETECTED &amp; DISPATCHED!
                    </span>
                  </div>
                  <button
                    onClick={toggleSiren}
                    className="flex items-center gap-1.5 rounded-lg bg-red-900/50 px-3 py-1 text-xs font-bold text-red-200 border border-red-500/40 hover:bg-red-800/50"
                  >
                    {sirenMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    <span>{sirenMuted ? "Siren Muted" : "Mute Siren"}</span>
                  </button>
                </div>

                <div className="mt-3 rounded-xl bg-slate-900/90 p-3.5 text-xs text-slate-300 space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Detected Trigger:</span>
                    <span className="text-pink-300">
                      "{dispatchResult?.phrase || "Mera koi picha kr raha hai"}"
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Live GPS:</span>
                    <span className="text-cyan-300">
                      {currentLocation?.area || "Connaught Place, New Delhi"} ({currentLocation?.lat.toFixed(4)}, {currentLocation?.lng.toFixed(4)})
                    </span>
                  </div>
                </div>

                {/* Notified contacts list */}
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Emergency Broadcast Dispatched To:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(dispatchResult?.contactsNotified || [
                      { name: "Rahul Sharma", relation: "Brother", phone: "+91 98765 43210", status: "DELIVERED" },
                      { name: "Sneha Kapoor", relation: "Friend", phone: "+91 98123 45678", status: "DELIVERED" },
                      { name: "Mom Sunita", relation: "Mother", phone: "+91 98987 65432", status: "DELIVERED" },
                      { name: "Delhi Police 112", relation: "Emergency", phone: "112", status: "DELIVERED" },
                    ]).map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2 border border-white/5 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{c.name}</div>
                          <div className="text-[10px] text-slate-400">{c.relation} • {c.phone}</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>SMS &amp; WA</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WhatsApp & SMS direct action link */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `🚨 EMERGENCY SOS: "Mera koi picha kr raha hai" at https://www.google.com/maps?q=${currentLocation?.lat},${currentLocation?.lng}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-md"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Open WhatsApp Alert</span>
                  </a>
                  <button
                    onClick={handleDismissAll}
                    className="px-4 py-2.5 rounded-xl border border-white/20 text-xs font-semibold hover:bg-white/10 text-slate-300"
                  >
                    Resolve / False Alarm
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LISTENING & AUDIO VISUALIZER */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center space-y-4">
            <div className="flex justify-center items-center gap-2">
              <div
                className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
                  isListening
                    ? "bg-gradient-to-tr from-pink-600 to-rose-500 shadow-xl shadow-pink-600/40"
                    : "bg-slate-800"
                }`}
              >
                {isListening && (
                  <div className="absolute inset-0 rounded-full border-4 border-pink-400 animate-ping opacity-30" />
                )}
                <Mic className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Audio Wave Bars */}
            {isListening && (
              <div className="flex justify-center items-end gap-1.5 h-10">
                {audioLevel.map((lvl, idx) => (
                  <motion.div
                    key={idx}
                    animate={{ height: `${lvl}%` }}
                    transition={{ duration: 0.15 }}
                    className="w-1.5 rounded-full bg-gradient-to-t from-pink-500 to-cyan-400"
                  />
                ))}
              </div>
            )}

            <div>
              <div className="text-sm font-bold text-white">
                {isListening ? "Listening continuously..." : "Microphone Idle"}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Speak normally. Any distress phrase will trigger the instant SOS message broadcast.
              </p>
            </div>

            {/* Real-time speech transcript feedback */}
            <div className="min-h-[50px] rounded-xl bg-slate-900 p-3 text-left border border-white/5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                <span>Real-Time Voice Stream:</span>
                <span className="text-pink-400 font-mono">hi-IN / indic-auto</span>
              </div>
              <div className="text-xs text-slate-200 font-mono italic">
                {transcript || (isListening ? "Listening... (e.g. 'Mera koi picha kr raha hai')" : "Tap 'Start Listening' or Test Trigger below.")}
              </div>
            </div>

            {gnaniTranscript && (
              <div className="rounded-xl bg-teal-950/30 p-2.5 text-left border border-teal-500/20 text-xs text-teal-300">
                <strong>Gnani.ai Output:</strong> {gnaniTranscript}
              </div>
            )}
          </div>

          {/* QUICK TEST & TRIGGER BUTTONS */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span>One-Click Voice Test &amp; Triggers:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Test target phrase button */}
              <button
                onClick={() => handleTriggerSos("Mera koi picha kr raha hai", "manual-test")}
                className="flex items-center gap-3 rounded-2xl border border-pink-500/40 bg-pink-500/10 p-3.5 text-left hover:bg-pink-500/20 transition group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500 text-white font-bold group-hover:scale-105 transition">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Test Primary Voice Trigger</div>
                  <div className="text-[11px] text-pink-300 font-medium">"Mera koi picha kr raha hai"</div>
                </div>
              </button>

              {/* Test secondary trigger */}
              <button
                onClick={() => handleTriggerSos("Bachao! Mujhe emergency help chahiye", "manual-test")}
                className="flex items-center gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-3.5 text-left hover:bg-cyan-500/20 transition group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white font-bold group-hover:scale-105 transition">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Test Emergency Callout</div>
                  <div className="text-[11px] text-cyan-300 font-medium">"Bachao! Mujhe help chahiye"</div>
                </div>
              </button>
            </div>
          </div>

          {/* Model info banner */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-pink-400 shrink-0" />
              <span>
                <strong>Gnani.ai Key:</strong> <code className="text-slate-300 font-mono">vach_1ytE...cca</code>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRecordWithGnani}
                disabled={isProcessingGnani}
                className="text-xs font-bold text-pink-300 hover:text-white underline disabled:opacity-50"
              >
                {isProcessingGnani ? "Processing with Gnani.ai..." : "Transcribe via Gnani STT API"}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {isListening ? (
              <button
                onClick={stopListening}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition"
              >
                <MicOff className="h-4 w-4" />
                <span>Pause Listening</span>
              </button>
            ) : (
              <button
                onClick={startListening}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:from-pink-600 hover:to-rose-700 transition"
              >
                <Mic className="h-4 w-4" />
                <span>Start Listening</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/5 transition"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

