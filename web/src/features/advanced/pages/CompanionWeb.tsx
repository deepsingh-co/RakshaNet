import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Send, Sparkles, Brain, CheckCircle2, MapPin, Clock,
  Shield, Heart, Route,
} from "lucide-react";
import { Card, Pill } from "../ui";
import { useAuthStore } from "../store/authStore";

import { aiServicesApi } from "../api/endpoints";

interface Message {
  role: "user" | "ai";
  text: string;
  time: string;
  emotion?: string;
  intent?: string;
}

const MEMORY_ITEMS = [
  { k: "routes", v: "Usually takes Route A on Tuesdays", i: Route },
  { k: "times", v: "Avoids going out after 10 PM", i: Clock },
  { k: "places", v: "Feels safest in Khan Market", i: MapPin },
  { k: "contacts", v: "Rahul is primary guardian", i: Shield },
];

const QUICK_PROMPTS = [
  "What's the safest route today?",
  "I'm feeling nervous about tonight",
  "Is my usual route safe?",
  "Remind me about self-defense",
];

export default function CompanionWeb() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: `Hi ${useAuthStore.getState().user?.name?.split(" ")[0] || "User"}! I'm your AI safety companion. I've been learning your patterns and I'm here to keep you safe. What's on your mind?`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const data = await aiServicesApi.companionChat(
        useAuthStore.getState().user?.id || "test_user_123",
        text
      );
      const aiMsg: Message = {
        role: "ai",
        text: data.message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        emotion: data.pattern_detected ? "pattern matching" : "mindful",
        intent: data.suggestion || "chat",
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (e) {
      console.error("Failed companion chat request:", e);
      const aiMsg: Message = {
        role: "ai",
        text: "I'm having a hard time reaching the neural systems right now, but I'm still keeping watch for you. What else do you need?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((m) => [...m, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">AI Companion</div>
          <h1 className="text-3xl font-black">Personal AI Safety Assistant</h1>
          <p className="text-slate-400 text-sm mt-1">AI that knows you, remembers you, protects you</p>
        </div>
        <Pill tone="cyan"><Brain className="w-3 h-3" /> RAG + Embeddings</Pill>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Chat area */}
        <div className="lg:col-span-3 glass-strong rounded-3xl overflow-hidden flex flex-col" style={{ height: "70vh" }}>
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0a0d1f] blink" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Vasudra Companion</div>
              <div className="text-[11px] text-emerald-300">● Online • Knows 127 things about you</div>
            </div>
            <Pill tone="emerald">Memory Active</Pill>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                    msg.role === "ai" ? "bg-gradient-to-br from-cyan-500 to-blue-600" : "bg-gradient-to-br from-pink-500 to-rose-600"
                  }`}>
                    {msg.role === "ai" ? "AI" : "ME"}
                  </div>
                  <div className={`max-w-[75%] ${msg.role === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user" ? "bg-pink-500/15 border border-pink-400/20" : "glass"
                    }`}>
                      <div>{msg.text}</div>
                      {msg.role === "ai" && msg.intent === "navigate_safest" && (
                        <div className="mt-3">
                          <Link
                            to="/app/dashboard"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-200 text-xs font-bold border border-cyan-400/30 hover:bg-cyan-500/30 transition animate-bounce"
                          >
                            🧭 Open Safest Route Map
                          </Link>
                        </div>
                      )}
                      {msg.role === "ai" && msg.intent === "trigger_sos" && (
                        <div className="mt-3">
                          <Link
                            to="/app/sos"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 text-red-200 text-xs font-bold border border-red-400/30 hover:bg-red-500/30 transition animate-pulse"
                          >
                            🚨 Open Emergency SOS Center
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 px-1 justify-end">
                      <span>{msg.time}</span>
                      {msg.emotion && msg.emotion !== "neutral" && <Pill tone="pink">{msg.emotion}</Pill>}
                      {msg.intent && <Pill tone="cyan">{msg.intent}</Pill>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center text-xs font-bold">AI</div>
                <div className="glass p-3 rounded-2xl">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-cyan-400"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Quick prompts */}
          <div className="px-4 pt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="shrink-0 text-xs glass-chip px-3 py-1.5 hover:bg-white/10"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="p-4 border-t border-white/10 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your safety..."
              className="flex-1 glass px-4 py-2.5 rounded-full text-sm outline-none border border-transparent focus:border-cyan-400/40"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-bold">What I Remember</span>
            </div>
            <div className="space-y-2">
              {MEMORY_ITEMS.map((m) => (
                <div key={m.k} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <m.i className="w-3.5 h-3.5 text-cyan-300 mt-0.5 shrink-0" />
                  <div className="text-xs text-slate-300 flex-1">{m.v}</div>
                  <CheckCircle2 className="w-3 h-3 text-emerald-300 shrink-0" />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-bold">Emotional State</span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { label: "Current mood", value: "Calm", tone: "emerald" },
                { label: "Stress level", value: "Low (22%)", tone: "emerald" },
                { label: "Confidence", value: "High (89%)", tone: "cyan" },
                { label: "Last check-in", value: "2h ago", tone: "amber" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between glass p-2 rounded-lg">
                  <span className="text-slate-400">{s.label}</span>
                  <Pill tone={s.tone as any}>{s.value}</Pill>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-bold">Capabilities</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              {[
                "Pattern recognition (routes, times)",
                "Emotion detection (7 emotions)",
                "Personalized responses",
                "Proactive safety warnings",
                "Memory recall for context",
                "Crisis escalation when needed",
              ].map((c) => (
                <div key={c} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300 mt-0.5 shrink-0" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
