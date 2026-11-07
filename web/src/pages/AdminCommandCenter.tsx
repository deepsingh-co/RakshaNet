import { useEffect, useState } from "react";
import {
  Command, Siren, Users, MapPin, ShieldCheck, Activity, Flame, Radio,
  PhoneCall, MessageSquare, Video, ChevronRight,
} from "lucide-react";
import { useSafetyStore } from "../store/safetyStore";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import MapView from "../components/MapView";
import { PageHeader, Pill, StatCard } from "../components/ui";

const hourData = Array.from({ length: 24 }, (_, i) => ({
  h: `${i}:00`, sos: Math.round(2 + Math.random() * 14 + (i >= 18 && i <= 23 ? 12 : 0)),
  reports: Math.round(5 + Math.random() * 22 + (i >= 18 ? 10 : 0)),
}));

const weekData = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => ({
  d, resolved: Math.round(40 + Math.random() * 30), escalated: Math.round(8 + Math.random() * 12),
}));

const typeData = [
  { name: "Harassment", value: 38, color: "#c23e56" },
  { name: "Stalking", value: 22, color: "#b4741a" },
  { name: "Poor lighting", value: 18, color: "#c58a25" },
  { name: "Suspicious", value: 14, color: "#0b6b5d" },
  { name: "Other", value: 8, color: "#6d5a8a" },
];

const cityData = [
  { c: "Delhi NCR", active: 148, resolved: 1204 },
  { c: "Mumbai", active: 112, resolved: 987 },
  { c: "Bengaluru", active: 86, resolved: 743 },
  { c: "Hyderabad", active: 62, resolved: 512 },
  { c: "Chennai", active: 54, resolved: 421 },
  { c: "Kolkata", active: 41, resolved: 298 },
];

export default function AdminCommandCenter() {
  const { activeAlerts, resolveSOS, tick } = useSafetyStore();
  const [selected, setSelected] = useState<string | null>(activeAlerts[0]?.id ?? null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => { const t = setInterval(tick, 2000); return () => clearInterval(t); }, [tick]);
  useEffect(() => { const p = setInterval(() => setPulse((x) => x + 1), 1800); return () => clearInterval(p); }, []);

  const totalActive = activeAlerts.length + 23;
  const resolvedToday = 287;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin command center"
        title={<>City-wide <em>safety</em> operations</>}
        description="Real-time visibility across 14 cities • Police & admin dispatch"
        actions={
          <>
            <Pill tone="pink">
              <span className="rn-dot" aria-hidden="true" /> {totalActive} active SOS
            </Pill>
            <Pill tone="emerald">
              <ShieldCheck className="w-3 h-3" aria-hidden="true" /> {resolvedToday} resolved today
            </Pill>
          </>
        }
      />

      <div className="rn-kpi-grid">
        <StatCard label="Active SOS" value={totalActive} hint="+12% vs yesterday" icon={<Siren className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} tone="rose" meter={Math.min(100, totalActive * 3)} />
        <StatCard label="Avg response" value={<>2.4 <small>min</small></>} hint="Target under 3 min" icon={<Activity className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} tone="primary" />
        <StatCard label="Guardians online" value="2,417" hint="Live watchers" icon={<Users className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} tone="violet" />
        <StatCard label="AI predictions/s" value="14.2k" hint="FastAPI cluster" icon={<Radio className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-strong p-4 rounded-3xl">
          <div className="flex items-center justify-between mb-3 px-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400">Live Operations Map</div>
              <div className="text-sm font-semibold">Delhi NCR • All active incidents</div>
            </div>
            <Pill tone="pink">REAL-TIME</Pill>
          </div>
          <MapView
            center={[28.6139, 77.209]}
            zoom={12}
            height={480}
            markers={activeAlerts.map((a) => ({
              position: [a.lat, a.lng] as [number, number],
              label: `${a.id} • ${a.user}`,
              kind: "alert",
              severity: a.level,
              meta: a.trigger,
            }))}
            dangerZones={[
              { center: [28.6203, 77.2107], radius: 380, color: "#c23e56", label: "SOS-4821 • Paharganj" },
              { center: [28.6352, 77.2249], radius: 280, color: "#b4741a", label: "SOS-4819 • Kashmere Gate" },
              { center: [28.5921, 77.2281], radius: 240, color: "#c58a25", label: "SOS-4815 • Saket" },
            ]}
          />
        </div>

        <div className="space-y-3 max-h-[508px] overflow-auto no-scrollbar">
          <div className="text-sm font-bold">Active SOS Alerts</div>
          {activeAlerts.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a.id)}
              className={`w-full text-left glass p-4 rounded-2xl border transition ${selected === a.id ? "border-pink-400/40 glow-pink" : "border-transparent hover:border-white/10"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${a.level === "CRITICAL" ? "bg-pink-400 blink" : "bg-amber-400"}`} />
                  <span className="font-bold text-sm">{a.id}</span>
                  <Pill tone={a.level === "CRITICAL" ? "pink" : a.level === "HIGH" ? "amber" : "cyan"}>{a.level}</Pill>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
              <div className="mt-2 text-xs">
                <div className="font-semibold">{a.user}</div>
                <div className="text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {a.area}</div>
                <div className="text-slate-400 mt-0.5">{a.trigger} • {a.time}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-strong p-6 rounded-3xl">
          <div className="font-bold">SOS by Hour</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Today • 24h</div>
          <div className="h-56 mt-3">
            <ResponsiveContainer>
              <AreaChart data={hourData}>
                <defs>
                  <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c23e56" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#c23e56" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,34,31,0.1)" />
                <XAxis dataKey="h" stroke="#5c6864" fontSize={10} interval={3} />
                <YAxis stroke="#5c6864" fontSize={10} />
                <Tooltip contentStyle={{ background: "#fffdf8", border: "1px solid #e5ded1", borderRadius: 12, fontSize: 12, color: "#14221f" }} />
                <Area type="monotone" dataKey="sos" stroke="#c23e56" strokeWidth={2} fill="url(#gH)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-strong p-6 rounded-3xl">
          <div className="font-bold">Weekly Resolution</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Resolved vs Escalated</div>
          <div className="h-56 mt-3">
            <ResponsiveContainer>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,34,31,0.1)" />
                <XAxis dataKey="d" stroke="#5c6864" fontSize={11} />
                <YAxis stroke="#5c6864" fontSize={11} />
                <Tooltip contentStyle={{ background: "#fffdf8", border: "1px solid #e5ded1", borderRadius: 12, fontSize: 12, color: "#14221f" }} />
                <Bar dataKey="resolved" fill="#1c7a58" radius={[6, 6, 0, 0]} />
                <Bar dataKey="escalated" fill="#c23e56" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-strong p-6 rounded-3xl">
          <div className="font-bold">Incident Types</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Last 30 days</div>
          <div className="h-56 mt-3 relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={typeData} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {typeData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#fffdf8", border: "1px solid #e5ded1", borderRadius: 12, fontSize: 12, color: "#14221f" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-black tabular">100%</div>
                <div className="text-[10px] text-slate-400">coverage</div>
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {typeData.map((t) => (
              <div key={t.name} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                <span className="flex-1 text-slate-300">{t.name}</span>
                <span className="tabular font-semibold">{t.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-strong p-6 rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">City-wise Operations</div>
              <div className="text-[11px] text-slate-400">Active incidents & resolved today</div>
            </div>
            <Pill tone="cyan">6 Cities</Pill>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={cityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,34,31,0.1)" />
                <XAxis dataKey="c" stroke="#5c6864" fontSize={11} />
                <YAxis stroke="#5c6864" fontSize={11} />
                <Tooltip contentStyle={{ background: "#fffdf8", border: "1px solid #e5ded1", borderRadius: 12, fontSize: 12, color: "#14221f" }} />
                <Line type="monotone" dataKey="active" stroke="#c23e56" strokeWidth={2.5} dot={{ fill: "#c23e56", r: 4 }} />
                <Line type="monotone" dataKey="resolved" stroke="#0b6b5d" strokeWidth={2} dot={{ fill: "#0b6b5d", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-strong p-6 rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">Dispatch Actions</div>
              <div className="text-[11px] text-slate-400">One-click response for command center</div>
            </div>
            <Flame className="w-4 h-4 text-amber-300" />
          </div>
          <div className="mt-4 space-y-3">
            {activeAlerts.map((a) => (
              <div key={a.id} className="glass p-3 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold">{a.id} • {a.user}</div>
                  <Pill tone={a.level === "CRITICAL" ? "pink" : "amber"}>{a.level}</Pill>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button onClick={() => resolveSOS(a.id)} className="text-[10px] py-2 glass-chip hover:bg-white/10 flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Resolve</button>
                  <button className="text-[10px] py-2 glass-chip hover:bg-white/10 flex items-center justify-center gap-1"><PhoneCall className="w-3 h-3" /> Call</button>
                  <button className="text-[10px] py-2 glass-chip hover:bg-white/10 flex items-center justify-center gap-1"><MessageSquare className="w-3 h-3" /> SMS</button>
                  <button className="text-[10px] py-2 rounded-full border border-[var(--rn-accent)]/25 bg-[var(--rn-accent-soft)] text-[var(--rn-accent-strong)] flex items-center justify-center gap-1"><Video className="w-3 h-3" /> CCTV</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-strong p-6 rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">Infrastructure Pulse</div>
            <div className="text-[11px] text-slate-400">System health across microservices</div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" />
            <span className="text-emerald-300">All systems nominal</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            ["API Gateway", "98.9%", "emerald"],
            ["Auth Service", "100%", "emerald"],
            ["SOS Service", "99.7%", "emerald"],
            ["Tracking WS", "14.2k/s", "cyan"],
            ["FastAPI AI", "42ms p95", "cyan"],
            ["PostgreSQL", "8ms p95", "emerald"],
            ["Twilio SMS", "Armed", "amber"],
            ["Evidence Vault", "2.4 TB", "violet"],
          ].map(([k, v, t]: any) => (
            <div key={k} className="glass p-3 rounded-xl">
              <div className="text-[10px] uppercase text-slate-400">{k}</div>
              <div className={`font-bold tabular mt-1 ${t === "pink" ? "text-pink-300" : t === "cyan" ? "text-cyan-300" : t === "amber" ? "text-amber-300" : t === "violet" ? "text-violet-300" : "text-emerald-300"}`}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500 py-4">
        <Command className="w-4 h-4 inline mr-1" /> RakshaNet Command Center v4.2 • Pulse #{pulse}
      </div>
    </div>
  );
}
