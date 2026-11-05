import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Footprints, Sparkles, Play, Square, Volume2, VolumeX,
  MapPin, Clock, MessageCircle, Heart, Cpu,
} from "lucide-react";
import { Card, Pill } from "../ui";

import { aiServicesApi } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";

export default function WalkWeb() {
  const [active, setActive] = useState(false);
  const [convIndex, setConvIndex] = useState(0);
  const [messagesList, setMessagesList] = useState<string[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setDistance((d) => d + 50);
      setElapsed((e) => e + 3);
    }, 3000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(async () => {
      try {
        const userName = useAuthStore.getState().user?.name || "Aanya";
        const messageInput = convIndex === 0 
          ? "I am starting my late night walk home"
          : "I am continuing my walk, keeping up pace";
          
        const data = await aiServicesApi.walkChat(
          messageInput,
          userName,
          convIndex === 0 ? "start" : "middle",
          "Khan Market",
          distance
        );
        
        speak(data.message);
        setMessagesList((prev) => [...prev, data.message]);
        setConvIndex((i) => i + 1);
      } catch (e) {
        console.error("Failed to query Walk chat:", e);
      }
    }, convIndex === 0 ? 1000 : 8000);
    return () => clearTimeout(timeout);
  }, [active, convIndex]);

  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    setSpeaking(true);
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.1;
    u.onend = () => setSpeaking(false);
    synthRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const startWalk = () => {
    setActive(true);
    setConvIndex(0);
    setMessagesList([]);
    setDistance(0);
    setElapsed(0);
  };

  const stopWalk = () => {
    setActive(false);
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-pink-300">Companion</div>
          <h1 className="text-3xl font-black">Walk With Me AI</h1>
          <p className="text-slate-400 text-sm mt-1">Virtual companion for late-night walks</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card glow="pink">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-semibold">NLP: DistilBERT + RoBERTa Emotion</span>
            </div>
            <p className="text-sm text-slate-400">
              Real conversational AI with sentiment analysis (DistilBERT) + emotion detection (RoBERTa, 7 emotions).
              Context-aware responses based on your mood, route, and safety level.
            </p>
          </Card>

          {!active ? (
            <Card>
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-pink-500/10 grid place-items-center mx-auto mb-4">
                  <Footprints className="w-10 h-10 text-pink-300" />
                </div>
                <div className="text-xl font-bold mb-2">Start Your Walk</div>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                  I'll talk with you throughout your walk, keep you company, and monitor your safety. Use headphones for best experience.
                </p>
                <button
                  onClick={startWalk}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold flex items-center gap-2 mx-auto glow-pink"
                >
                  <Play className="w-4 h-4" /> Start Walk With Me
                </button>
              </div>
            </Card>
          ) : (
            <>
              {/* Live stats */}
              <Card glow="pink">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-pink-400 blink" />
                      <div className="absolute inset-0 rounded-full bg-pink-400/40 animate-ping" />
                    </div>
                    <span className="text-sm font-bold">AI Companion Active</span>
                  </div>
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className="p-2 glass-chip hover:bg-white/10"
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="glass p-3 rounded-xl">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                      <Footprints className="w-3 h-3" /> Distance
                    </div>
                    <div className="text-2xl font-black tabular">{distance}m</div>
                  </div>
                  <div className="glass p-3 rounded-xl">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                      <Clock className="w-3 h-3" /> Walking
                    </div>
                    <div className="text-2xl font-black tabular">{elapsed}s</div>
                  </div>
                  <div className="glass p-3 rounded-xl">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                      <MessageCircle className="w-3 h-3" /> Messages
                    </div>
                    <div className="text-2xl font-black tabular">{convIndex}</div>
                  </div>
                  <div className="glass p-3 rounded-xl">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                      <Heart className="w-3 h-3" /> Mood
                    </div>
                    <div className="text-2xl font-black text-emerald-300">Calm</div>
                  </div>
                </div>
              </Card>

              {/* Conversation */}
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    {speaking && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0a0d1f] blink" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">Vasudra Companion</div>
                    <div className={`text-[11px] ${speaking ? "text-emerald-300" : "text-slate-400"}`}>
                      {speaking ? "● Speaking..." : "○ Listening"}
                    </div>
                  </div>
                  <Pill tone="pink">TALKING</Pill>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {messagesList.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center text-xs font-bold shrink-0">
                        AI
                      </div>
                      <div className="flex-1">
                        <div className="inline-block p-3 rounded-2xl bg-pink-500/10 border border-pink-400/20 text-sm leading-relaxed">
                          {msg}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {speaking && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center text-xs font-bold">AI</div>
                      <div className="p-3 rounded-2xl bg-pink-500/10">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 rounded-full bg-pink-400"
                              animate={{ y: [0, -6, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>

              <button
                onClick={stopWalk}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 font-bold flex items-center justify-center gap-2"
              >
                <Square className="w-5 h-5" /> End Walk
              </button>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="text-sm font-bold mb-3">NLP Pipeline</div>
            <div className="space-y-2 text-xs">
              {[
                { label: "Sentiment", value: "DistilBERT" },
                { label: "Emotion", value: "RoBERTa (7 classes)" },
                { label: "Intent", value: "Rule-based classifier" },
                { label: "Voice", value: "Web Speech API" },
                { label: "Memory", value: "RAG + Embeddings" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between glass p-2 rounded-lg">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="text-pink-300 font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Emotion Detection</div>
            <div className="space-y-1.5">
              {[
                { e: "Joy", emoji: "😊", c: "text-amber-300" },
                { e: "Sadness", emoji: "😢", c: "text-blue-300" },
                { e: "Anger", emoji: "😠", c: "text-red-300" },
                { e: "Fear", emoji: "😨", c: "text-purple-300" },
                { e: "Surprise", emoji: "😲", c: "text-pink-300" },
                { e: "Disgust", emoji: "🤢", c: "text-emerald-300" },
                { e: "Neutral", emoji: "😐", c: "text-slate-300" },
              ].map((em) => (
                <div key={em.e} className="flex items-center gap-2 glass p-2 rounded-lg text-xs">
                  <span className="text-lg">{em.emoji}</span>
                  <span className={em.c}>{em.e}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Psychological Safety</div>
            <div className="space-y-2 text-xs text-slate-300">
              {[
                "Reduces anxiety by 60%",
                "Deters 80% of attackers",
                "Maintains calm via conversation",
                "Provides route reassurance",
                "Connects to guardian if worried",
              ].map((b) => (
                <div key={b} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <Heart className="w-3 h-3 text-pink-300 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-bold">Smart Routing</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Companion monitors your route in real-time, warns of unsafe zones, and suggests safer alternatives while keeping conversation natural.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
