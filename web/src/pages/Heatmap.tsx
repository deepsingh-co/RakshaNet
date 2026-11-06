import { useMemo, useState, useEffect } from "react";
import { Flame, Filter, MapPin } from "lucide-react";
import MapView from "../components/MapView";
import { Pill } from "../components/ui";
import { useSafetyStore } from "../store/safetyStore";

type Zone = { id: string; name: string; center: [number, number]; radius: number; level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; reports: number; desc: string };

const zones: Zone[] = [
  { id: "Z1", name: "Paharganj Market", center: [28.6203, 77.2107], radius: 380, level: "CRITICAL", reports: 86, desc: "Persistent stalking + harassment reports" },
  { id: "Z2", name: "Chandni Chowk North", center: [28.655, 77.230], radius: 420, level: "HIGH", reports: 62, desc: "Crowd incidents peak 18:00–21:00" },
  { id: "Z3", name: "Nehru Place Flyover", center: [28.549, 77.250], radius: 260, level: "HIGH", reports: 44, desc: "Poor lighting verified by community" },
  { id: "Z4", name: "Rohini Sector 7 Park", center: [28.719, 77.117], radius: 220, level: "MEDIUM", reports: 19, desc: "Suspicious activity after sunset" },
  { id: "Z5", name: "Lajpat Nagar Metro", center: [28.570, 77.237], radius: 300, level: "CRITICAL", reports: 91, desc: "Multiple verified harassment cases" },
  { id: "Z6", name: "Dwarka Sector 21", center: [28.589, 77.056], radius: 240, level: "LOW", reports: 11, desc: "Low-traffic nights" },
  { id: "Z7", name: "Kashmere Gate", center: [28.6352, 77.2249], radius: 320, level: "HIGH", reports: 58, desc: "Late-night bus stand risk" },
  { id: "Z8", name: "Saket District Centre", center: [28.524, 77.213], radius: 260, level: "MEDIUM", reports: 27, desc: "Cinema exits after 22:00" },
];

const colorFor = (l: string) => l === "CRITICAL" ? "#ff3d7f" : l === "HIGH" ? "#ff8a3d" : l === "MEDIUM" ? "#ffb020" : "#2ee6a6";

export default function Heatmap() {
  const [filter, setFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Zone | null>(null);

  const { communityReports, currentLocation, fetchIncidents } = useSafetyStore();

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const allZones = useMemo(() => {
    const dynamicZones: Zone[] = communityReports.map((r) => ({
      id: r.id,
      name: r.area,
      center: r.lat && r.lng ? [r.lat, r.lng] : [currentLocation.lat, currentLocation.lng],
      radius: r.severity * 80 + 100,
      level: r.severity >= 4 ? "CRITICAL" : r.severity === 3 ? "HIGH" : r.severity === 2 ? "MEDIUM" : "LOW",
      reports: r.votes,
      desc: `${r.type} reported by ${r.reporter}.`
    }));
    return [...dynamicZones, ...zones];
  }, [communityReports, currentLocation]);

  const filtered = useMemo(() => filter === "ALL" ? allZones : allZones.filter((z) => z.level === filter), [filter, allZones]);

  const totalReports = allZones.reduce((s, z) => s + z.reports, 0);
  const critical = allZones.filter((z) => z.level === "CRITICAL").length;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-amber-300">Threat Heatmap</div>
        <h1 className="text-3xl lg:text-4xl font-black mt-1">City-wide Safety Intelligence</h1>
        <p className="text-slate-400 mt-1 text-sm">AI-fused heat map from crime data + {totalReports} community reports.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-2xl">
          <div className="text-[11px] uppercase text-slate-400">Total Reports</div>
          <div className="text-3xl font-black tabular mt-1">{totalReports.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-300 mt-1">+12% this week</div>
        </div>
        <div className="glass p-5 rounded-2xl">
          <div className="text-[11px] uppercase text-slate-400">Critical Zones</div>
          <div className="text-3xl font-black tabular mt-1 text-pink-300">{critical}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active monitoring</div>
        </div>
        <div className="glass p-5 rounded-2xl">
          <div className="text-[11px] uppercase text-slate-400">Verified Reports</div>
          <div className="text-3xl font-black tabular mt-1 text-cyan-300">87%</div>
          <div className="text-[11px] text-slate-400 mt-1">Cross-validated</div>
        </div>
        <div className="glass p-5 rounded-2xl">
          <div className="text-[11px] uppercase text-slate-400">Cities Covered</div>
          <div className="text-3xl font-black tabular mt-1 text-amber-300">14</div>
          <div className="text-[11px] text-slate-400 mt-1">Pan-India network</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              filter === f ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-strong p-4 rounded-3xl">
          <MapView
            center={[currentLocation.lat, currentLocation.lng]}
            zoom={13}
            height={600}
            dangerZones={filtered.map((z) => ({ center: z.center, radius: z.radius, color: colorFor(z.level), label: z.name }))}
            markers={filtered.map((z) => ({ position: z.center, label: z.name, kind: "report" as const, severity: z.level, meta: `${z.reports} reports • ${z.level}` }))}
          />
        </div>

        <div className="space-y-3 max-h-[620px] overflow-auto no-scrollbar">
          {filtered.map((z) => (
            <button
              key={z.id}
              onClick={() => setSelected(z)}
              className={`w-full text-left glass p-4 rounded-2xl border transition ${selected?.id === z.id ? "border-pink-400/40" : "border-transparent hover:border-white/10"}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: `${colorFor(z.level)}22`, color: colorFor(z.level) }}>
                  <Flame className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{z.name}</span>
                    <Pill tone={z.level === "CRITICAL" ? "pink" : z.level === "HIGH" ? "amber" : z.level === "MEDIUM" ? "amber" : "emerald"}>{z.level}</Pill>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {z.reports} reports</div>
                  <div className="text-xs text-slate-400 mt-1">{z.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="glass-strong p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-slate-400 tracking-widest">Zone Intel</div>
              <h2 className="text-2xl font-black mt-1">{selected.name}</h2>
              <p className="text-sm text-slate-400 mt-1">{selected.desc}</p>
            </div>
            <Pill tone={selected.level === "CRITICAL" ? "pink" : selected.level === "HIGH" ? "amber" : "emerald"}>{selected.level}</Pill>
          </div>
          <div className="grid md:grid-cols-4 gap-3 mt-5">
            {[
              ["Reports", selected.reports],
              ["Radius", `${selected.radius}m`],
              ["Peak hours", "18:00–22:00"],
              ["Police ETA", "6 min"],
            ].map(([k, v]) => (
              <div key={k as string} className="glass p-4 rounded-2xl">
                <div className="text-[11px] uppercase text-slate-400">{k}</div>
                <div className="text-xl font-bold mt-1 tabular">{v as any}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
