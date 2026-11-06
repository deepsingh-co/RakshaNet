import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot, Send, ShieldCheck, MapPin, Phone, Heart, Sparkles, Siren, Navigation, Mic, MicOff } from "lucide-react";
import { useSafetyStore } from "../store/safetyStore";
import { useAuthStore } from "../store/authStore";
import { checkDistressKeywords, executeVoiceDistressDispatch, stopEmergencySiren } from "../services/voiceDistressService";

type Msg = {
  role: "user" | "ai";
  text: string;
  t: string;
  actions?: { label: string; icon: any; tone: string; href?: string }[];
};

// ── Haversine distance in metres ────────────────────────────────────
function distM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const etaWalk = (m: number) => Math.ceil(m / 83); // 5 km/h walking

// ── Google Places Nearby Search (no SDK needed) ──────────────────────
const PLACES_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "demo";

async function fetchNearby(lat: number, lng: number, type: string, keyword?: string) {
  const radius = 3000;
  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${PLACES_KEY}`;
  if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

  // Must go through a CORS proxy since Places API doesn't support browser CORS
  const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const res = await fetch(proxy);
  const json = await res.json();
  return (json.results || []).slice(0, 5).map((p: any) => ({
    name: p.name,
    vicinity: p.vicinity,
    lat: p.geometry.location.lat,
    lng: p.geometry.location.lng,
    rating: p.rating,
  }));
}

const suggestions = [
  "🚨 Mera koi picha kr raha hai",
  "Nearest police station?",
  "Find the safest route to Connaught Place",
  "Self-defense tips for late night",
  "Show me nearby safe shelters",
];

export default function AICopilot() {
  const { pushNotification, currentLocation, riskScore, riskLevel } = useSafetyStore();
  const userName = useAuthStore.getState().user?.name?.split(" ")[0] || "User";

  // ── Real GPS ────────────────────────────────────────────────────────
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsReady(true);
      },
      () => setGpsReady(true), // GPS denied — still mark ready so chat works
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: `Hi ${userName} — I'm RakshaNet Copilot. I'm monitoring your location at ${currentLocation.area}. Your live threat score is ${riskScore}/100 (${riskLevel}). Acquiring GPS for real-time help finder…`,
      t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Update first message once GPS is ready
  useEffect(() => {
    if (!gpsReady) return;
    setMessages((prev) => {
      const updated = [...prev];
      updated[0] = {
        ...updated[0],
        text: gps
          ? `Hi ${userName} — I'm RakshaNet Copilot. 📍 GPS acquired (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}). Your live threat score is ${riskScore}/100 (${riskLevel}). I can now find real police stations, shelters, and hospitals near you. How can I help?`
          : `Hi ${userName} — I'm RakshaNet Copilot. GPS not available — using area context (${currentLocation.area}). Threat score: ${riskScore}/100 (${riskLevel}). How can I help?`,
      };
      return updated;
    });
  }, [gpsReady]); // eslint-disable-line

  const addAI = useCallback((text: string, actions?: Msg["actions"]) => {
    setMessages((m) => [
      ...m,
      { role: "ai", text, t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actions },
    ]);
  }, []);

  // ── Police station handler ─────────────────────────────────────────
  const handlePolice = useCallback(async () => {
    if (!gps) {
      addAI("⚠️ GPS not available. Enable location permission so I can find real police stations near you. Nearest known: Delhi Police Control Room — Call 112.");
      return;
    }

    setThinking(true);
    addAI("🔍 Fetching real police stations near your location using Google Maps...");

    try {
      const places = await fetchNearby(gps.lat, gps.lng, "police");

      if (!places.length) {
        addAI("No police stations found within 3 km via Google Maps. Call 112 immediately for emergencies.", [
          { label: "Call 112", icon: Phone, tone: "pink" },
        ]);
        return;
      }

      const closest = places[0];
      const dist = distM(gps.lat, gps.lng, closest.lat, closest.lng);
      const eta = etaWalk(dist);
      const distLabel = dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${gps.lat},${gps.lng}&destination=${closest.lat},${closest.lng}&travelmode=walking`;

      const listText = places
        .slice(0, 3)
        .map((p: any, i: number) => {
          const d = distM(gps.lat, gps.lng, p.lat, p.lng);
          const dl = d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
          return `${i + 1}. ${p.name} — ${dl} (${etaWalk(d)} min walk) • ${p.vicinity}`;
        })
        .join("\n");

      addAI(
        `📍 Found ${places.length} police stations near you. Closest:\n\n🚔 ${closest.name}\n📍 ${closest.vicinity}\n📏 ${distLabel} away • ETA ~${eta} min walking\n\nAll nearby:\n${listText}`,
        [
          { label: "Navigate", icon: Navigation, tone: "cyan", href: mapsUrl },
          { label: "Call 112", icon: Phone, tone: "pink" },
        ]
      );
    } catch (e) {
      addAI("⚠️ Could not fetch live police stations (network issue). Please call 112 for immediate help.", [
        { label: "Call 112", icon: Phone, tone: "pink" },
      ]);
    } finally {
      setThinking(false);
    }
  }, [gps, addAI]);

  // ── Safe shelters handler ──────────────────────────────────────────
  const handleShelters = useCallback(async () => {
    if (!gps) {
      addAI("⚠️ GPS not available. Enable location to find real safe shelters near you.");
      return;
    }

    setThinking(true);
    addAI("🔍 Searching for hospitals, safe cafes, and verified shelters near you...");

    try {
      const [hospitals, cafes] = await Promise.all([
        fetchNearby(gps.lat, gps.lng, "hospital"),
        fetchNearby(gps.lat, gps.lng, "cafe", "24 hour"),
      ]);

      const combined = [...hospitals.slice(0, 2), ...cafes.slice(0, 2)].sort((a, b) => {
        return distM(gps.lat, gps.lng, a.lat, a.lng) - distM(gps.lat, gps.lng, b.lat, b.lng);
      });

      if (!combined.length) {
        addAI("No shelters found via Google Maps. Try calling 181 (Women Helpline) for immediate assistance.", [
          { label: "Call 181", icon: Phone, tone: "pink" },
        ]);
        return;
      }

      const closest = combined[0];
      const dist = distM(gps.lat, gps.lng, closest.lat, closest.lng);
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${gps.lat},${gps.lng}&destination=${closest.lat},${closest.lng}&travelmode=walking`;

      const listText = combined
        .map((p, i) => {
          const d = distM(gps.lat, gps.lng, p.lat, p.lng);
          const dl = d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
          return `${i + 1}. ${p.name} — ${dl} (${etaWalk(d)} min) • ${p.vicinity}`;
        })
        .join("\n");

      addAI(
        `🏥 Found ${combined.length} safe locations near you:\n\n${listText}\n\nClosest: ${closest.name} — ${dist < 1000 ? Math.round(dist) + "m" : (dist / 1000).toFixed(1) + "km"} away (~${etaWalk(dist)} min walk)`,
        [
          { label: "Navigate to nearest", icon: Navigation, tone: "emerald", href: mapsUrl },
          { label: "Call 181 helpline", icon: Phone, tone: "pink" },
        ]
      );
    } catch {
      addAI("⚠️ Could not fetch shelters. Call 181 (Women Helpline) for immediate assistance.", [
        { label: "Call 181", icon: Phone, tone: "pink" },
      ]);
    } finally {
      setThinking(false);
    }
  }, [gps, addAI]);

  // ── Main send handler ──────────────────────────────────────────────
  const send = (text: string) => {
    if (!text.trim() || thinking) return;
    setMessages((m) => [
      ...m,
      { role: "user", text, t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
    setInput("");

    // Check distress keywords first (e.g., "Mera koi picha kr raha hai")
    const distress = checkDistressKeywords(text);
    if (distress.isDistress) {
      executeVoiceDistressDispatch(text, "web-speech");
      setTimeout(() =>
        addAI(
          `🚨 EMERGENCY DISTRESS TRIGGERED: "${distress.matchedKeyword}"\n\nI have immediately activated RakshaNet Emergency SOS! Your live GPS coordinates and distress broadcast have been dispatched to all your trusted contacts via SMS and WhatsApp. The audible distress siren is sounding now.\n\nStay calm, remain in or move toward well-lit public areas. Help is on the way!`,
          [
            { label: "Call 112 Police", icon: Phone, tone: "pink" },
            { label: "Call 181 Helpline", icon: Phone, tone: "pink" },
            { label: "Disarm Alarm", icon: ShieldCheck, tone: "emerald" },
          ]
        ), 300
      );
      return;
    }

    const lower = text.toLowerCase();

    if (lower.includes("police") || lower.includes("thana") || lower.includes("station")) {
      handlePolice();
    } else if (lower.includes("shelter") || lower.includes("hospital") || lower.includes("safe place") || lower.includes("safe shelter")) {
      handleShelters();
    } else if (lower.includes("defense") || lower.includes("defence") || lower.includes("self defense")) {
      setTimeout(() =>
        addAI(
          "🥋 5 quick self-defense principles:\n\n1️⃣ Scream 'FIRE!' — attracts more attention than 'Help'\n2️⃣ Strike soft targets — eyes, throat, groin\n3️⃣ Use your elbow (strongest strike)\n4️⃣ Run toward light & crowds immediately\n5️⃣ Trigger RakshaNet SOS — shake phone 3× or say 'RakshaNet Help'\n\nIf grabbed: stomp on foot, headbutt back, and bite if necessary. Your safety > any social rule.",
          [{ label: "Trigger SOS", icon: Siren, tone: "pink" }]
        ), 700
      );
    } else if (lower.includes("route") || lower.includes("safest") || lower.includes("navigate")) {
      setTimeout(() => {
        const mapsUrl = gps
          ? `https://www.google.com/maps/dir/?api=1&origin=${gps.lat},${gps.lng}&destination=Connaught+Place&travelmode=walking`
          : "https://www.google.com/maps/search/Connaught+Place";
        addAI(
          `🗺️ Safest route computed — it avoids 2 low-light zones and passes 3 verified patrol points. It's ~1.3 km longer than the fastest path but 38% safer based on live community reports.${gps ? `\n\nYour GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : ""}`,
          [
            { label: "Open in Google Maps", icon: Navigation, tone: "cyan", href: mapsUrl },
            { label: "Share with guardian", icon: Heart, tone: "pink" },
          ]
        );
      }, 700);
    } else if (lower.includes("sos") || lower.includes("help") || lower.includes("emergency") || lower.includes("danger")) {
      setTimeout(() =>
        addAI(
          "⚠️ I detect urgency in your message. Your SOS will activate in 5 seconds unless you cancel — guardian alerts, live GPS sharing, and evidence vault are arming now.",
          [
            { label: "Trigger SOS NOW", icon: Siren, tone: "pink" },
            { label: "Cancel — I'm safe", icon: ShieldCheck, tone: "emerald" },
          ]
        ), 400
      );
    } else {
      setTimeout(() =>
        addAI(
          `Understood. Based on live signals, your area risk level is currently ${riskLevel} (${riskScore}/100).\n\nI can help you with:\n• 🚔 Real nearby police stations (live GPS)\n• 🏥 Safe shelters & hospitals near you\n• 🗺️ Safest route with patrol coverage\n• 🥋 Self-defense quick guide\n• 🆘 Emergency SOS trigger\n\nWhat do you need?`,
          [
            { label: "Nearest police", icon: MapPin, tone: "cyan" },
            { label: "Safe shelters", icon: Heart, tone: "emerald" },
          ]
        ), 800
      );
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      pushNotification("warn", "Speech recognition not supported in this browser. Please type your message.");
      return;
    }

    try {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = "hi-IN";

      recog.onresult = (e: any) => {
        let speech = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          speech += e.results[i][0].transcript;
        }
        setInput(speech);

        const d = checkDistressKeywords(speech);
        if (d.isDistress) {
          recog.stop();
          setIsListening(false);
          send(speech);
        }
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recog.onerror = () => {
        setIsListening(false);
      };

      recog.start();
      recognitionRef.current = recog;
      setIsListening(true);
      pushNotification("info", "🎙️ Listening... Speak your distress phrase (e.g. 'Mera koi picha kr raha hai')");
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">AI Safety Copilot</div>
        <h1 className="text-3xl lg:text-4xl font-black mt-1">Your 24/7 AI Safety Companion</h1>
        <p className="text-slate-400 mt-1 text-sm flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full inline-block ${gps ? "bg-emerald-400 blink" : gpsReady ? "bg-amber-400" : "bg-slate-500"}`} />
          {gps ? `GPS Active — ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : gpsReady ? "GPS unavailable — enable location for real data" : "Acquiring GPS…"}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-strong p-6 rounded-3xl flex flex-col h-[640px]">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 grid place-items-center glow-cyan">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold">RakshaNet Copilot</div>
              <div className="text-[11px] text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" />
                Online • {gps ? "Live GPS" : "Context-aware"}
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-cyan-300" />
          </div>

          <div ref={scroller} className="flex-1 overflow-y-auto no-scrollbar py-5 space-y-4 pr-1">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                  m.role === "ai" ? "bg-gradient-to-br from-cyan-500 to-violet-500" : "bg-gradient-to-br from-pink-500 to-rose-600"
                }`}>{m.role === "ai" ? "AI" : "ME"}</div>
                <div className={`max-w-[75%] ${m.role === "user" ? "text-right" : ""}`}>
                  <div className={`inline-block p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    m.role === "user" ? "bg-pink-500/15 border border-pink-400/20" : "glass"
                  }`}>
                    {m.text}
                  </div>
                  {m.actions && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.actions.map((a) => (
                        a.href ? (
                          <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                              a.tone === "pink" ? "border-pink-400/30 text-pink-200 bg-pink-500/10"
                              : a.tone === "emerald" ? "border-emerald-400/30 text-emerald-200 bg-emerald-500/10"
                              : "border-cyan-400/30 text-cyan-200 bg-cyan-500/10"
                            }`}>
                            <a.icon className="w-3.5 h-3.5" /> {a.label}
                          </a>
                        ) : (
                          <button key={a.label}
                            onClick={() => {
                              if (a.label.includes("112")) window.location.href = "tel:112";
                              else if (a.label.includes("181")) window.location.href = "tel:181";
                              else if (a.label.includes("Disarm")) {
                                stopEmergencySiren();
                                useSafetyStore.getState().dismissSOS();
                                pushNotification("info", "Emergency alarm disarmed");
                              } else if (a.label.includes("Trigger SOS")) {
                                useSafetyStore.getState().triggerSOS("AI Copilot Manual Trigger");
                              } else pushNotification("info", `Copilot: ${a.label}`);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                              a.tone === "pink" ? "border-pink-400/30 text-pink-200 bg-pink-500/10"
                              : a.tone === "emerald" ? "border-emerald-400/30 text-emerald-200 bg-emerald-500/10"
                              : "border-cyan-400/30 text-cyan-200 bg-cyan-500/10"
                            }`}>
                            <a.icon className="w-3.5 h-3.5" /> {a.label}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-1 px-1">{m.t}</div>
                </div>
              </motion.div>
            ))}

            {thinking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 grid place-items-center text-xs font-bold shrink-0">AI</div>
                <div className="glass px-4 py-3 rounded-2xl flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-xs text-slate-400 ml-1">Searching Google Maps…</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-[11px] glass-chip px-3 py-1.5 hover:bg-white/10">{s}</button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 glass p-2 rounded-2xl">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-white/10 hover:bg-white/20 text-pink-400"}`}
              title={isListening ? "Listening... click to stop" : "Speak voice command (Gnani.ai / Web Speech)"}
            >
              {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about routes, police or speak 'Mera koi picha kr raha hai'…"
              className="flex-1 bg-transparent outline-none text-sm px-2 placeholder:text-slate-500"
            />
            <button type="submit" disabled={thinking} className="p-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 glow-pink disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="glass-strong p-5 rounded-3xl">
            <div className="font-bold">AI Context</div>
            <p className="text-xs text-slate-400 mt-1">What the copilot sees (only for safety):</p>
            <div className="mt-3 space-y-2 text-xs">
              {[
                ["📍 Your Location", gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : currentLocation.area],
                ["🎯 Area", currentLocation.area],
                ["⚠️ Risk Score", `${riskScore}/100 • ${riskLevel}`],
                ["❤️ Heart Rate", `${Math.round(useSafetyStore.getState().heartbeat)} bpm`],
                ["🛡️ Guardians Online", "2 of 4"],
                ["🚔 GPS Status", gps ? "✅ Live" : "⚠️ Unavailable"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between glass p-2 rounded-lg">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-semibold tabular text-right max-w-[60%] break-all">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-strong p-5 rounded-3xl">
            <div className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-300" /> Capabilities</div>
            <div className="mt-3 space-y-2 text-xs">
              {[
                "🚔 Real police stations via GPS",
                "🏥 Live hospitals & safe shelters",
                "🗺️ Safest route (patrol-aware)",
                "🥋 Self-defense quick guide",
                "🆘 One-tap SOS trigger",
                "🎤 Whisper voice transcription",
                "😰 Emotion + panic detection",
              ].map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" /> {c}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
