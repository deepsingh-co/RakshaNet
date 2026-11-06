import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity, MapPin, Heart, Battery, Route, ShieldAlert, Users, Flame,
  ArrowUpRight, ArrowDownRight, Minus, Sparkles,
} from "lucide-react";
import { useSafetyStore } from "../store/safetyStore";
import ThreatGauge from "../components/ThreatGauge";
import MapView from "../components/MapView";
import { StatCard, SectionHeader, Pill } from "../components/ui";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";

import { useAuthStore } from "../store/authStore";

const riskSeries = Array.from({ length: 32 }, (_, i) => ({
  t: `${i * 2}m`,
  risk: Math.round(30 + Math.sin(i / 3) * 18 + Math.random() * 10),
  safe: Math.round(65 - Math.sin(i / 3) * 12 + Math.random() * 6),
}));

export default function Dashboard() {
  const { user } = useAuthStore();
  const {
    riskScore, riskLevel, confidence, currentLocation, battery, heartbeat, speed,
    threatFactors, activeAlerts, tick, startTrackingLocation
  } = useSafetyStore();

  useEffect(() => {
    if (startTrackingLocation) {
      startTrackingLocation();
    }
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [tick, startTrackingLocation]);

  const radial = threatFactors.map((f, i) => ({
    name: f.label,
    value: f.value,
    fill: ["#ff3d7f", "#38e8ff", "#ffb020", "#ff8a3d", "#2ee6a6", "#a78bfa"][i % 6],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-pink-300">Command Deck</div>
          <h1 className="text-3xl lg:text-4xl font-black mt-1">Welcome back, {user?.name?.split(" ")[0] || "User"}</h1>
          <p className="text-slate-400 mt-1 text-sm">Your AI safety copilot is actively monitoring 48 signals.</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="emerald"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" /> AI Active</Pill>
          <Pill tone="cyan"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 blink" /> WebSocket</Pill>
        </div>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Threat Score" value={riskScore} hint={`Confidence ${Math.round(confidence)}%`} tone="pink"
          icon={<ShieldAlert className="w-6 h-6" />} />
        <StatCard label="Heart Rate" value={`${Math.round(heartbeat)} bpm`} hint="Wrist sensor" tone="cyan"
          icon={<Heart className="w-6 h-6" />} />
        <StatCard label="Speed" value={`${speed.toFixed(1)} m/s`} hint={speed > 5 ? "⚠ Running" : "Walking"} tone={speed > 5 ? "amber" : "emerald"}
          icon={<Activity className="w-6 h-6" />} />
        <StatCard label="Battery" value={`${battery}%`} hint={battery < 20 ? "Low power mode" : "Normal"} tone={battery < 20 ? "amber" : "violet"}
          icon={<Battery className="w-6 h-6" />} />
      </div>

      {/* Hero row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Threat gauge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-strong p-6 rounded-3xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400">Real-time Risk</div>
              <div className="text-lg font-bold">{riskLevel} RISK</div>
            </div>
            <Pill tone={riskLevel === "CRITICAL" ? "pink" : riskLevel === "HIGH" ? "amber" : riskLevel === "MEDIUM" ? "amber" : "emerald"}>
              {riskLevel}
            </Pill>
          </div>
          <div className="mt-4 grid place-items-center">
            <ThreatGauge score={riskScore} confidence={confidence} size={220} />
          </div>
          <div className="mt-4 text-[11px] text-slate-400 text-center">
            Aggregated from crime density, lighting, crowd, time & community intel
          </div>
        </motion.div>

        {/* Live map */}
        <div className="lg:col-span-2 glass-strong p-4 rounded-3xl">
          <div className="flex items-center justify-between mb-3 px-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400">Live Position</div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pink-300" /> {currentLocation.area}
              </div>
            </div>
            <Pill tone="cyan">GPS LOCK</Pill>
          </div>
          <MapView
            center={[currentLocation.lat, currentLocation.lng]}
            zoom={14}
            height={340}
            markers={[
              { position: [currentLocation.lat, currentLocation.lng], label: "You", kind: "user" },
              { position: [currentLocation.lat + 0.008, currentLocation.lng + 0.005], label: "Police Chowki", kind: "police", meta: "ETA 6 min" },
              { position: [currentLocation.lat - 0.006, currentLocation.lng + 0.009], label: "Apollo Hospital", kind: "hospital", meta: "1.2 km" },
              { position: [currentLocation.lat + 0.004, currentLocation.lng - 0.007], label: "Safe Shelter", kind: "shelter", meta: "Verified" },
            ]}
            dangerZones={[
              { center: [currentLocation.lat + 0.009, currentLocation.lng - 0.01], radius: 320, color: "#ff3d7f", label: "High incident zone" },
              { center: [currentLocation.lat - 0.008, currentLocation.lng - 0.012], radius: 220, color: "#ffb020", label: "Poor lighting" },
            ]}
          />
        </div>
      </div>

      {/* Mid row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Risk timeline */}
        <div className="lg:col-span-2 glass-strong p-6 rounded-3xl">
          <SectionHeader
            title="Risk Timeline"
            subtitle="AI predictions over the last hour"
            action={<Pill tone="cyan">Live</Pill>}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskSeries}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff3d7f" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#ff3d7f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38e8ff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#38e8ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="t" stroke="#5b607a" fontSize={11} />
                <YAxis stroke="#5b607a" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "rgba(10,13,31,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#e6e9f5" }}
                />
                <Area type="monotone" dataKey="risk" stroke="#ff3d7f" strokeWidth={2.5} fill="url(#g1)" />
                <Area type="monotone" dataKey="safe" stroke="#38e8ff" strokeWidth={2} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat factors radial */}
        <div className="glass-strong p-6 rounded-3xl">
          <SectionHeader title="Threat Signals" subtitle="6 active predictors" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="20%" outerRadius="100%" data={radial} startAngle={180} endAngle={-180}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "rgba(255,255,255,0.04)" }} dataKey="value" cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {threatFactors.map((f) => (
              <div key={f.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{f.label}</span>
                <span className="flex items-center gap-2 tabular">
                  <span className="font-semibold">{f.value}</span>
                  {f.trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5 text-pink-300" />
                    : f.trend === "down" ? <ArrowDownRight className="w-3.5 h-3.5 text-emerald-300" />
                    : <Minus className="w-3.5 h-3.5 text-slate-500" />}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-strong p-6 rounded-3xl">
          <SectionHeader
            title="Active Alerts Network"
            subtitle={`${activeAlerts.length} live alerts across the city`}
            action={<Pill tone="pink">Citywide</Pill>}
          />
          <div className="space-y-3">
            {activeAlerts.slice(0, 4).map((a) => (
              <motion.div
                key={a.id}
                whileHover={{ scale: 1.005 }}
                className="flex items-center gap-4 glass p-4 rounded-2xl border border-white/5"
              >
                <div className={`w-12 h-12 rounded-2xl grid place-items-center font-bold ${
                  a.level === "CRITICAL" ? "bg-pink-500/20 text-pink-200" : a.level === "HIGH" ? "bg-orange-500/20 text-orange-200" : "bg-amber-500/20 text-amber-200"
                }`}>{a.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.user}</span>
                    <Pill tone={a.level === "CRITICAL" ? "pink" : a.level === "HIGH" ? "amber" : "cyan"}>{a.level}</Pill>
                    {a.status === "ESCALATED" && <Pill tone="pink">ESCALATED</Pill>}
                  </div>
                  <div className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                    <MapPin className="w-3 h-3" /> {a.area} • {a.trigger}
                  </div>
                </div>
                <div className="text-right text-xs tabular">
                  <div className="text-white font-semibold">{a.confidence}%</div>
                  <div className="text-slate-400">confidence</div>
                  <div className="mt-1 flex items-center gap-2 text-slate-400">
                    <Heart className="w-3 h-3 text-pink-300" /> {a.heartbeat}
                    <Battery className="w-3 h-3" /> {a.battery}%
                  </div>
                </div>
                <div className="text-xs text-slate-500">{a.time}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="glass-strong p-6 rounded-3xl">
          <SectionHeader
            title="AI Safety Copilot"
            subtitle="Personalized insights"
            action={<Sparkles className="w-4 h-4 text-cyan-300" />}
          />
          <div className="space-y-3">
            {[
              { tone: "pink", title: "Reroute recommended", d: "Your current route passes a flagged zone. Switch to Ring Road for +31% safety." },
              { tone: "amber", title: "Battery-aware mode", d: "At 73% battery, RakshaNet will auto-send last location if below 10%." },
              { tone: "cyan", title: "Companion nearby", d: "Your guardian Rahul is 1.8 km away and actively tracking." },
              { tone: "emerald", title: "Safe shelter ahead", d: "Verified shelter 240m to your right — 24/7 staffed." },
            ].map((m, i) => (
              <div key={i} className="glass p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    m.tone === "pink" ? "bg-pink-400" : m.tone === "amber" ? "bg-amber-400" : m.tone === "cyan" ? "bg-cyan-400" : "bg-emerald-400"
                  }`} />
                  <div className="text-sm font-semibold">{m.title}</div>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-snug">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Marquee trust */}
      <div className="glass p-4 rounded-2xl flex items-center gap-4 text-xs text-slate-400">
        <Route className="w-4 h-4 text-cyan-300" />
        <span className="text-white font-semibold">System Health</span>
        <div className="flex-1" />
        {[
          ["Spring Boot", "OK"], ["PostgreSQL", "OK"], ["FastAPI AI", "OK"],
          ["Twilio", "ARMED"], ["WebSocket", "14.2k msgs/s"], ["Google Maps", "OK"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="text-slate-500">{k}</span>
            <span className="text-emerald-300 font-semibold">{v}</span>
          </div>
        ))}
        <Flame className="w-4 h-4 text-amber-300" />
        <Users className="w-4 h-4 text-violet-300" />
      </div>
    </div>
  );
}
