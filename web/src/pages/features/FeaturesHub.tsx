import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Cpu, Fingerprint, Radio, Users, HandHeart,
  Watch, Footprints, Heart, Brain, Zap, Mic,
} from "lucide-react";
import { PageHeader, Pill } from "../../components/ui";

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

/* Landing "Calm signal" tones — rose, evergreen, amber. */
const toneColors: Record<string, { grad: string; bg: string; text: string; border: string }> = {
  pink: {
    grad: "from-[#c23e56] to-[#a62f46]",
    bg: "bg-[#f8e7ea]",
    text: "text-[#a62f46]",
    border: "border-[#c23e56]/25",
  },
  cyan: {
    grad: "from-[#0f7f6e] to-[#085247]",
    bg: "bg-[#e3f1ed]",
    text: "text-[#085247]",
    border: "border-[#0b6b5d]/25",
  },
  amber: {
    grad: "from-[#b4741a] to-[#8a5310]",
    bg: "bg-[#f8eedb]",
    text: "text-[#8a5310]",
    border: "border-[#9a5d0f]/25",
  },
};

export default function FeaturesHub() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        eyebrow="Next-gen features"
        title={<>9 AI-powered <em>innovations</em></>}
        description="Industry-first safety features powered by real machine learning models. Every feature has working backend code — not just UI mockups."
        actions={
          <>
            <Pill tone="pink"><Zap className="w-3 h-3" /> 9 features</Pill>
            <Pill tone="cyan"><Brain className="w-3 h-3" /> 6 ML models</Pill>
            <Pill tone="amber"><Shield className="w-3 h-3" /> 23 endpoints</Pill>
          </>
        }
      />

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
                <div className={`glass p-6 rounded-2xl border ${c.border} h-full transition-all hover:scale-[1.02] hover:shadow-[0_18px_40px_-24px_rgba(16,43,39,0.35)]`}>
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
      <div className="rn-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-[var(--rn-primary)]" />
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
            <div key={m.name} className="rounded-xl border border-[var(--rn-border)] bg-[var(--rn-bg-soft)] p-3">
              <div className="text-sm font-bold text-[var(--rn-ink)]">{m.name}</div>
              <div className="text-xs text-[var(--rn-ink-soft)] mt-1">{m.use}</div>
              <div className="text-[10px] text-[var(--rn-primary-strong)] mt-1 font-mono">{m.lib}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
