import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Heart, Leaf, Play, Square, Phone, Video,
  Users, Shield, Sparkles, CheckCircle2,
} from "lucide-react";
import { Card } from "../../components/ui";

const MOODS = [
  { emoji: "😰", label: "Anxious", value: 1 },
  { emoji: "😢", label: "Sad", value: 2 },
  { emoji: "😐", label: "Numb", value: 3 },
  { emoji: "🙂", label: "Okay", value: 4 },
  { emoji: "😊", label: "Better", value: 5 },
];

const GROUNDING = [
  "5 things you can SEE right now",
  "4 things you can TOUCH",
  "3 things you can HEAR",
  "2 things you can SMELL",
  "1 thing you can TASTE",
];

const THERAPISTS = [
  { name: "Dr. Priya Mehta", spec: "Trauma & PTSD", avail: "Available now", rating: 4.9 },
  { name: "Dr. Arjun Kapoor", spec: "Anxiety Specialist", avail: "In 30 min", rating: 4.8 },
  { name: "Dr. Sneha Reddy", spec: "EMDR Therapy", avail: "Tomorrow", rating: 4.9 },
];
import { aiServicesApi } from "../../api/endpoints";

export default function TraumaWeb() {
  const [mood, setMood] = useState<number | null>(null);
  const [supportMsg, setSupportMsg] = useState("");
  const [therapistList, setTherapistList] = useState<any[]>(THERAPISTS);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [groundingStep, setGroundingStep] = useState(0);

  const phases = [
    { name: "Breathe In", duration: 4, color: "#38e8ff", scale: 1.2 },
    { name: "Hold", duration: 4, color: "#ffb020", scale: 1 },
    { name: "Breathe Out", duration: 6, color: "#2ee6a6", scale: 0.8 },
  ];

  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const data = await aiServicesApi.getTherapists("Delhi");
        if (data.therapists && data.therapists.length > 0) {
          setTherapistList(data.therapists.map((t: any) => ({
            name: t.name,
            spec: t.specialties?.join(" & ") || t.credentials,
            avail: t.availability,
            rating: t.rating
          })));
        }
      } catch (e) {
        console.error("Failed to load therapists:", e);
      }
    };
    fetchTherapists();
  }, []);

  useEffect(() => {
    if (!breathingActive) return;
    const phase = phases[breathPhase];
    const timeout = setTimeout(() => {
      setBreathPhase((p) => (p + 1) % 3);
      if (breathPhase === 2) setBreathCount((c) => c + 1);
    }, phase.duration * 1000);
    return () => clearTimeout(timeout);
  }, [breathingActive, breathPhase]);

  const handleMoodSelect = async (mVal: number, mLabel: string) => {
    setMood(mVal);
    setSupportMsg("Connecting to AI trauma coach...");
    try {
      const data = await aiServicesApi.traumaCoach(
        `I am feeling very ${mLabel.toLowerCase()}`,
        "friend"
      );
      setSupportMsg(data.message);
    } catch (e) {
      console.error("Failed to get trauma coach response:", e);
      setSupportMsg("I'm sorry you're feeling this way. You survived — that takes immense strength.");
    }
  };

  const startBreathing = () => {
    setBreathingActive(true);
    setBreathPhase(0);
    setBreathCount(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/app/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Healing</div>
          <h1 className="text-3xl font-black">Post-Incident Care</h1>
          <p className="text-slate-400 text-sm mt-1">Trauma healing with CBT-based exercises</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card glow="cyan">
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 text-cyan-300" />
              <div>
                <div className="font-bold">You're safe now</div>
                <div className="text-sm text-slate-400">
                  It's normal to feel shaken. Take your time. We're here to help you heal.
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold mb-4">How are you feeling?</h3>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleMoodSelect(m.value, m.label)}
                  className={`p-3 rounded-xl border transition ${
                    mood === m.value
                      ? "bg-cyan-500/20 border-cyan-400/40"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="text-3xl mb-1">{m.emoji}</div>
                  <div className={`text-xs font-semibold ${mood === m.value ? "text-cyan-300" : "text-slate-400"}`}>
                    {m.label}
                  </div>
                </button>
              ))}
            </div>
            {mood && supportMsg && (
              <div className="mt-4 p-3 rounded-xl bg-pink-500/10 border border-pink-400/30 text-xs text-pink-200">
                {supportMsg}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5 text-emerald-300" />
              <h3 className="text-lg font-bold">4-4-6 Breathing Exercise</h3>
            </div>
            {!breathingActive ? (
              <>
                <p className="text-sm text-slate-400 mb-4">
                  Calms your nervous system in 2-3 minutes. Follow the circle.
                </p>
                <button
                  onClick={startBreathing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" /> Start Breathing
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <motion.div
                  animate={{ scale: phases[breathPhase].scale }}
                  transition={{ duration: phases[breathPhase].duration, ease: "easeInOut" }}
                  className="w-48 h-48 rounded-full border-4 mx-auto grid place-items-center"
                  style={{ borderColor: phases[breathPhase].color }}
                >
                  <div className="text-center">
                    <div className="text-xl font-bold" style={{ color: phases[breathPhase].color }}>
                      {phases[breathPhase].name}
                    </div>
                    <div className="text-4xl font-black tabular mt-2">
                      {phases[breathPhase].duration}
                    </div>
                  </div>
                </motion.div>
                <div className="text-sm text-slate-400 mt-4">Cycle {breathCount + 1}</div>
                <button
                  onClick={() => setBreathingActive(false)}
                  className="mt-4 px-6 py-2 rounded-xl bg-white/5 text-sm hover:bg-white/10 flex items-center gap-2 mx-auto"
                >
                  <Square className="w-4 h-4" /> Stop
                </button>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-bold mb-3">5-4-3-2-1 Grounding</h3>
            <p className="text-sm text-slate-400 mb-4">Brings you back to the present moment.</p>
            <div className="space-y-2">
              {GROUNDING.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setGroundingStep(i + 1)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition ${
                    i < groundingStep
                      ? "bg-emerald-500/10 border-emerald-400/30"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  {i < groundingStep ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-500 shrink-0" />
                  )}
                  <span className={i < groundingStep ? "text-white" : "text-slate-400"}>{g}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card glow="emerald">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-bold">Professional Support</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Trauma-informed therapists (free for RakshaNet users)
            </p>
            <div className="space-y-2">
              {therapistList.map((t, i) => (
                <div key={i} className="glass p-3 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white font-bold text-xs">
                      {t.name ? t.name.split(" ").slice(1).map((s: string) => s[0]).join("") : "TH"}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.spec} • ⭐ {t.rating}</div>
                      <div className="text-[11px] text-emerald-300 mt-0.5">{t.avail}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/30 flex items-center justify-center gap-1">
                      <Video className="w-3 h-3" /> Video
                    </button>
                    <button className="flex-1 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/30 flex items-center justify-center gap-1">
                      <Phone className="w-3 h-3" /> Call
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">CBT Techniques</div>
            <div className="space-y-2 text-xs">
              {[
                { t: "Box Breathing", d: "4-4-4-4 pattern" },
                { t: "4-7-8 Relaxation", d: "Parasympathetic activation" },
                { t: "5-4-3-2-1", d: "Sensory grounding" },
                { t: "Body Scan", d: "Somatic awareness" },
                { t: "Safe Place", d: "Visualization" },
              ].map((tech) => (
                <div key={tech.t} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <Sparkles className="w-3 h-3 text-cyan-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">{tech.t}</div>
                    <div className="text-slate-400">{tech.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-bold">Crisis Hotlines</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                { n: "iCall (24/7)", p: "1800-599-0011" },
                { n: "Women Helpline", p: "181" },
                { n: "Vandrevala Foundation", p: "1860-2662-345" },
              ].map((h) => (
                <div key={h.n} className="flex justify-between glass p-2 rounded-lg">
                  <span className="text-slate-300">{h.n}</span>
                  <span className="text-pink-300 font-mono font-semibold">{h.p}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-bold">Your Rights</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              What happened was <strong className="text-white">NOT your fault</strong>. You have the right to free counseling, legal aid, and protection under Indian law.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
