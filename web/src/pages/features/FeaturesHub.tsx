import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, Shield, Cpu, Fingerprint, Radio, Users, HandHeart,
  Watch, Footprints, Heart, Brain, Zap, Mic,
} from "lucide-react";
import { Pill } from "../../components/ui";

const FEATURES = [
  /*
  {
    id: "deepfake",
    icon: Shield,
    title: "Deepfake Voice Defender",
    desc: "Detect AI-cloned voices in real-time using spectral analysis",
    ai: "FFT + Phase Analysis",
    tone: "pink",
    route: "/app/features/deepfake",
  },
  {
    id: "companion",
    icon: Brain,
    title: "AI Companion Memory",
    desc: "Personal AI that remembers your patterns & preferences",
    ai: "RAG + Embeddings",
    tone: "cyan",
    route: "/app/features/companion",
  },
  */
  {
    id: "stalker",
    icon: Cpu,
    title: "Digital Stalker Detector",
    desc: "Find hidden AirTags, Bluetooth trackers & spyware",
    ai: "Isolation Forest ML",
    tone: "amber",
    route: "/app/features/stalker",
  },
  {
    id: "mesh",
    icon: Radio,
    title: "Mesh Network SOS",
    desc: "Offline SOS via Bluetooth mesh when no signal",
    ai: "GradientBoosting Routing",
    tone: "pink",
    route: "/app/features/mesh",
  },
  {
    id: "pods",
    icon: Users,
    title: "Safety Pods",
    desc: "Group travel protection with shared live location",
    ai: "WebRTC P2P",
    tone: "cyan",
    route: "/app/features/pods",
  },
  {
    id: "bystander",
    icon: HandHeart,
    title: "Bystander Beacon",
    desc: "Alert nearby verified RakshaNet users for help",
    ai: "RandomForest Trust",
    tone: "amber",
    route: "/app/features/bystander",
  },
  /*
  {
    id: "blockchain",
    icon: Lock,
    title: "Blockchain Evidence",
    desc: "Court-admissible evidence with SHA-256 hash chain",
    ai: "Cryptography",
    tone: "pink",
    route: "/app/features/blockchain",
  },
  */
  {
    id: "biometric",
    icon: Fingerprint,
    title: "Biometric Panic",
    desc: "Duress fingerprint/PIN triggers silent SOS",
    ai: "WebAuthn API",
    tone: "cyan",
    route: "/app/features/biometric",
  },
  {
    id: "wearables",
    icon: Watch,
    title: "Child Safety Hub",
    desc: "Unified control for safety wearables",
    ai: "MLPClassifier Neural",
    tone: "amber",
    route: "/app/features/wearables",
  },
  /*
  {
    id: "walk",
    icon: Footprints,
    title: "Walk With Me AI",
    desc: "Virtual companion for late-night walks",
    ai: "DistilBERT + RoBERTa",
    tone: "pink",
    route: "/app/features/walk",
  },
  */
  {
    id: "trauma",
    icon: Heart,
    title: "Post-Incident Care",
    desc: "Trauma healing with CBT-based exercises",
    ai: "CBT Logic + TTS",
    tone: "cyan",
    route: "/app/features/trauma",
  },
  /*
  {
    id: "legal",
    icon: Scale,
    title: "One-Tap Legal Aid",
    desc: "Auto-FIR generation + lawyer matching",
    ai: "LLM + IPC DB",
    tone: "amber",
    route: "/app/features/legal",
  },
  */
  {
    id: "voicecode",
    icon: Mic,
    title: "Voice Secret Code",
    desc: "Say \"Call Mom\" → silently triggers SOS. Attacker never knows.",
    ai: "Web Speech API",
    tone: "pink",
    route: "/app/features/voicecode",
  },
  {
    id: "saferide",
    icon: Footprints, // Or Car if imported, but we'll use Lock/Radio for now
    title: "Safe Ride Verification",
    desc: "Vehicle photo, Number Plate & Driver verification with Live Tracking",
    ai: "Live Route Analysis",
    tone: "cyan",
    route: "/app/features/saferide",
  },
];

const toneColors: Record<string, { grad: string; bg: string; text: string; border: string }> = {
  pink: {
    grad: "from-pink-500 to-rose-600",
    bg: "bg-pink-500/10",
    text: "text-pink-300",
    border: "border-pink-400/30",
  },
  cyan: {
    grad: "from-cyan-500 to-blue-600",
    bg: "bg-cyan-500/10",
    text: "text-cyan-300",
    border: "border-cyan-400/30",
  },
  amber: {
    grad: "from-amber-500 to-orange-600",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-400/30",
  },
};

export default function FeaturesHub() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden glass-strong p-8 rounded-3xl">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-pink-300" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-pink-300">Next-Gen Features</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black mb-3">
            9 AI-Powered <span className="text-gradient-pink">Innovations</span>
          </h1>
          <p className="text-slate-400 max-w-2xl text-lg">
            Industry-first safety features powered by real machine learning models.
            Every feature has working backend code — not just UI mockups.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Pill tone="pink"><Zap className="w-3 h-3" /> 9 FEATURES</Pill>
            <Pill tone="cyan"><Brain className="w-3 h-3" /> 6 ML MODELS</Pill>
            <Pill tone="amber"><Shield className="w-3 h-3" /> 23 ENDPOINTS</Pill>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f, i) => {
          const c = toneColors[f.tone];
          const Icon = f.icon;
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={f.route} className="block group">
                <div className={`glass p-6 rounded-2xl border ${c.border} h-full transition-all hover:scale-[1.02] hover:glow-${f.tone}`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.grad} grid place-items-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">{f.desc}</p>
                  <div className="flex items-center gap-2">
                    <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
                      <Brain className="w-3 h-3" />
                      {f.ai}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* ML Stack Info */}
      <div className="glass-strong p-6 rounded-3xl">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-cyan-300" />
          <h2 className="text-xl font-bold">Machine Learning Stack</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "Isolation Forest", use: "Stalker anomaly detection", lib: "scikit-learn" },
            { name: "DistilBERT + RoBERTa", use: "Sentiment & emotion analysis", lib: "transformers" },
            { name: "RandomForest", use: "Bystander trust scoring", lib: "scikit-learn" },
            { name: "GradientBoosting", use: "Mesh routing optimization", lib: "scikit-learn" },
            { name: "MLPClassifier", use: "Gesture recognition neural net", lib: "scikit-learn" },
            { name: "Spectral Analysis", use: "Deepfake voice detection", lib: "numpy + FFT" },
          ].map((m) => (
            <div key={m.name} className="glass p-3 rounded-xl">
              <div className="text-sm font-bold text-white">{m.name}</div>
              <div className="text-xs text-slate-400 mt-1">{m.use}</div>
              <div className="text-[10px] text-cyan-300 mt-1 font-mono">{m.lib}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
