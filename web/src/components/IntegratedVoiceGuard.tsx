import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Siren,
  Plus,
  Trash2,
  RotateCcw,
  PhoneCall,
  CheckCircle2,
  Radio,
  Sparkles,
} from "lucide-react";
import {
  getTriggerKeywords,
  addTriggerKeyword,
  removeTriggerKeyword,
  resetTriggerKeywords,
  checkDistressKeywords,
  executeVoiceDistressDispatch,
} from "../services/voiceDistressService";
import { useSafetyStore } from "../store/safetyStore";

interface IntegratedVoiceGuardProps {
  variant?: "full" | "compact" | "drawer";
}

export function IntegratedVoiceGuard({
  variant = "full",
}: IntegratedVoiceGuardProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [heardTranscript, setHeardTranscript] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [audioMeter, setAudioMeter] = useState<number[]>([18, 28, 45, 60, 32, 22]);

  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Load trigger words
  const refreshKeywords = useCallback(() => {
    setKeywords(getTriggerKeywords());
  }, []);

  useEffect(() => {
    refreshKeywords();
    const handleUpdate = () => refreshKeywords();
    window.addEventListener("rakshanet:keywords-updated", handleUpdate);
    return () => window.removeEventListener("rakshanet:keywords-updated", handleUpdate);
  }, [refreshKeywords]);

  // Handle triggered phrase
  const handleTrigger = useCallback(
    async (phrase: string, source: "gnani.ai" | "web-speech" | "manual-test") => {
      setFeedbackMsg(`🚨 Activated by "${phrase}"! Alerts & Demo Call dispatched.`);
      await executeVoiceDistressDispatch(phrase, source);
    },
    []
  );

  // Continuous auto-listening without requiring clicks
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    let recog: any = null;

    const startAutoListening = () => {
      try {
        if (recog) {
          try {
            recog.abort();
          } catch { }
        }
        recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = "hi-IN";

        recog.onstart = () => {
          if (isMountedRef.current) setIsListening(true);
        };

        recog.onresult = (event: any) => {
          let text = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          if (isMountedRef.current) {
            setHeardTranscript(text);
            setAudioMeter([
              Math.floor(25 + Math.random() * 55),
              Math.floor(35 + Math.random() * 60),
              Math.floor(45 + Math.random() * 50),
              Math.floor(30 + Math.random() * 65),
              Math.floor(40 + Math.random() * 55),
              Math.floor(20 + Math.random() * 50),
            ]);
          }

          const check = checkDistressKeywords(text);
          if (check.isDistress && !useSafetyStore.getState().sosActive) {
            handleTrigger(check.matchedKeyword, "web-speech");
          }
        };

        recog.onerror = () => {};
        recog.onend = () => {
          if (isMountedRef.current && !useSafetyStore.getState().sosActive) {
            try {
              recog.start();
            } catch { }
          }
        };

        recog.start();
        recognitionRef.current = recog;
      } catch {}
    };

    startAutoListening();

    return () => {
      isMountedRef.current = false;
      if (recog) {
        try {
          recog.abort();
        } catch { }
      }
    };
  }, [handleTrigger]);

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    const updated = addTriggerKeyword(newWord.trim());
    setKeywords(updated);
    setNewWord("");
    setFeedbackMsg(`Added trigger phrase: "${newWord.trim()}"`);
    setTimeout(() => setFeedbackMsg(""), 3500);
  };

  const handleRemoveWord = (word: string) => {
    const updated = removeTriggerKeyword(word);
    setKeywords(updated);
    setFeedbackMsg(`Removed: "${word}"`);
    setTimeout(() => setFeedbackMsg(""), 3500);
  };

  const handleResetDefaults = () => {
    const updated = resetTriggerKeywords();
    setKeywords(updated);
    setFeedbackMsg("Restored default trigger phrases.");
    setTimeout(() => setFeedbackMsg(""), 3500);
  };

  const handleSimulateDemoCall = () => {
    window.dispatchEvent(
      new CustomEvent("rakshanet:demo-call", {
        detail: {
          phrase: "Mera koi picha kr raha hai",
          caller: "🚨 RakshaNet Safety Dispatch",
          number: "+91 112 • Emergency SOS Desk",
        },
      })
    );
  };

  return (
    <div
      className={`glass-strong rounded-3xl ${
        variant === "compact" ? "p-4 sm:p-5" : "p-6"
      } border border-pink-500/20 relative overflow-hidden space-y-4`}
    >
      {/* Ambient gradient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/15 border border-pink-400/30 text-pink-300 grid place-items-center shrink-0">
            <Mic className="w-5 h-5 text-pink-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-wide">
                AI Voice Distress Guard
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Gnani.ai
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Zero-click background detection • Instant SOS alert + Demo Call
            </p>
          </div>
        </div>

        {/* Live Audio Status */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isListening ? "bg-emerald-400 animate-ping" : "bg-emerald-400"
              }`}
            />
            <span>Auto Listening</span>
          </div>
          <div className="hidden sm:flex items-center gap-0.5 h-4 px-1.5 py-0.5 bg-black/40 rounded-lg border border-white/5">
            {audioMeter.map((h, i) => (
              <span
                key={i}
                className="w-1 bg-pink-400 rounded-full transition-all duration-150"
                style={{ height: `${Math.max(4, h / 3.5)}px` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Live Input Preview Box */}
      <div className="glass p-3 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Radio className="w-4 h-4 text-pink-400 shrink-0 animate-pulse" />
          <div className="min-w-0 truncate">
            <span className="text-slate-400">Heard: </span>
            <span className="text-white font-medium italic">
              {heardTranscript
                ? `"${heardTranscript}"`
                : 'Listening... say "Mera koi picha kr raha hai" or any trigger word'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleTrigger("Mera koi picha kr raha hai", "manual-test")}
            className="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/30 text-pink-200 font-semibold text-[11px] transition flex items-center gap-1.5 cursor-pointer"
            title="Simulate full trigger + SMS + Demo Call"
          >
            <Siren className="w-3.5 h-3.5 text-pink-400" />
            Test Voice Trigger
          </button>
          <button
            onClick={handleSimulateDemoCall}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 font-semibold text-[11px] transition flex items-center gap-1.5 cursor-pointer"
            title="Preview demo escape call"
          >
            <PhoneCall className="w-3.5 h-3.5 text-cyan-300" />
            Demo Call
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Words Section */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Configured Trigger Phrases
            </span>
            <span className="text-[10px] text-pink-300 font-mono bg-pink-500/20 px-1.5 py-0.5 rounded-full border border-pink-400/30">
              {keywords.length}
            </span>
          </div>
          <button
            onClick={handleResetDefaults}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Defaults
          </button>
        </div>

        {/* Add Word Form */}
        <form onSubmit={handleAddWord} className="flex gap-2">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Add your own custom word (e.g. 'Ghar jaldi aao', 'Code Red')…"
            className="flex-1 text-xs bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500/50 transition placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!newWord.trim()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-pink-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Fix Word
          </button>
        </form>

        {/* Clean Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto no-scrollbar">
          {keywords.map((word) => {
            const isPriority =
              word.toLowerCase().includes("picha") ||
              word.toLowerCase().includes("bachao") ||
              word.toLowerCase().includes("help");
            return (
              <span
                key={word}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  isPriority
                    ? "bg-pink-500/20 border-pink-400/40 text-pink-200"
                    : "glass border-white/10 text-slate-300"
                  }`}
              >
                <span>{word}</span>
                <button
                  onClick={() => handleRemoveWord(word)}
                  className="hover:text-red-400 transition p-0.5 cursor-pointer"
                  title={`Remove "${word}"`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
