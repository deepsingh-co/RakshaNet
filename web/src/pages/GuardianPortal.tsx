import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, MapPin, Heart, Battery, Route, Bell, Phone } from "lucide-react";
import { useSafetyStore } from "../store/safetyStore";
import MapView from "../components/MapView";
import { PageHeader, Pill } from "../components/ui";
import { useAuthStore } from "../store/authStore";
import { journeyApi } from "../api/journeyApi";

const wards = [
  { name: "Aanya Kapoor", rel: "Sister", loc: "Connaught Place", status: "Safe", score: 42, lat: 28.6139, lng: 77.209, eta: "14 min", battery: 73, hr: 82 },
  { name: "Isha Verma", rel: "Daughter", loc: "Hauz Khas", status: "Walking", score: 58, lat: 28.5496, lng: 77.2001, eta: "22 min", battery: 61, hr: 91 },
  { name: "Riya Menon", rel: "Friend", loc: "Saket", status: "⚠ Elevated", score: 71, lat: 28.5244, lng: 77.213, eta: "—", battery: 28, hr: 108 },
];

export default function GuardianPortal() {
  const { tick } = useSafetyStore();
  const { user } = useAuthStore();
  const [ackLoading, setAckLoading] = useState(false);
  const [activeEscalation, setActiveEscalation] = useState<any | null>({
    id: "e9f8d7c6-b5a4-4321-9876-000000000000",
    travelerName: "Riya Menon",
    reason: "MISSED_CHECKPOINT",
    status: "UNACKNOWLEDGED"
  });

  useEffect(() => { const t = setInterval(tick, 2000); return () => clearInterval(t); }, [tick]);

  const handleAcknowledge = async () => {
    if (!activeEscalation) return;
    setAckLoading(true);
    try {
      await journeyApi.acknowledgeEscalation(
        activeEscalation.id,
        user?.id || "guardian-uuid",
        "SMS_RECEIVED"
      );
      setActiveEscalation(null);
    } catch (error) {
      console.error("Failed to acknowledge escalation:", error);
      // fallback in demo mode
      setActiveEscalation(null);
    } finally {
      setAckLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Guardian portal"
        title={<>Watch over the people you <em>love</em></>}
        description="3 wards currently sharing live location with you."
        actions={
          <span className="rn-pill is-emerald">
            <span className="rn-dot" aria-hidden="true" /> Guardian link encrypted
          </span>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-strong p-4 rounded-3xl">
          <MapView
            center={[28.59, 77.21]}
            zoom={12}
            height={560}
            markers={wards.map((w) => ({
              position: [w.lat, w.lng] as [number, number],
              label: w.name,
              kind: "user",
              meta: `${w.rel} • Score ${w.score}`,
            }))}
            dangerZones={[
              { center: [28.524, 77.213], radius: 300, color: "#ffb020", label: "Elevated risk • Saket" },
            ]}
          />
        </div>

        <div className="space-y-3">
          {/* ── Active Escalation Panel ── */}
          <div className="glass-strong p-5 rounded-3xl border border-red-500/30 bg-red-500/5 space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 blink" />
              🚨 Active Escalation Alerts
            </div>
            
            {activeEscalation ? (
              <div className="space-y-3 text-xs">
                <div className="glass p-3 rounded-xl space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Escalation ID</span>
                    <span className="font-mono text-slate-300">{activeEscalation.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Traveler</span>
                    <span className="font-semibold text-slate-200">{activeEscalation.travelerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trigger Reason</span>
                    <span className="text-amber-400 font-bold">{activeEscalation.reason}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className="text-red-400 font-bold">{activeEscalation.status}</span>
                  </div>
                </div>

                <button
                  onClick={handleAcknowledge}
                  disabled={ackLoading}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-xl font-bold text-xs transition"
                >
                  {ackLoading ? "Acknowledging..." : "Acknowledge Escalation"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No active escalations requiring attention.</p>
            )}
          </div>
          {wards.map((w, i) => (
            <motion.div
              key={w.name}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="glass-strong p-4 rounded-3xl"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-cyan-400 grid place-items-center text-xs font-bold">
                    {w.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--rn-surface)] ${
                    w.status.includes("Elevated") ? "bg-amber-400 blink" : "bg-emerald-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{w.name}</div>
                  <div className="text-[11px] text-slate-400">{w.rel} • {w.loc}</div>
                </div>
                <Pill tone={w.status.includes("Elevated") ? "amber" : "emerald"}>{w.status}</Pill>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
                <div className="glass p-2 rounded-lg">
                  <div className="text-slate-400 flex items-center gap-1"><Heart className="w-3 h-3" /> HR</div>
                  <div className="font-bold tabular">{w.hr}</div>
                </div>
                <div className="glass p-2 rounded-lg">
                  <div className="text-slate-400 flex items-center gap-1"><Battery className="w-3 h-3" /> Bat</div>
                  <div className="font-bold tabular">{w.battery}%</div>
                </div>
                <div className="glass p-2 rounded-lg">
                  <div className="text-slate-400 flex items-center gap-1"><Route className="w-3 h-3" /> ETA</div>
                  <div className="font-bold tabular">{w.eta}</div>
                </div>
                <div className="glass p-2 rounded-lg">
                  <div className="text-slate-400">Score</div>
                  <div className={`font-bold tabular ${w.score >= 70 ? "text-amber-300" : w.score >= 50 ? "text-cyan-300" : "text-emerald-300"}`}>{w.score}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <button className="text-[11px] py-2 glass-chip hover:bg-white/10 flex items-center justify-center gap-1"><MapPin className="w-3 h-3" /> Track</button>
                <button className="text-[11px] py-2 glass-chip hover:bg-white/10 flex items-center justify-center gap-1"><Phone className="w-3 h-3" /> Call</button>
                <button className="text-[11px] py-2 rounded-full border border-[var(--rn-accent)]/25 bg-[var(--rn-accent-soft)] text-[var(--rn-accent-strong)] flex items-center justify-center gap-1"><Bell className="w-3 h-3" /> Alert</button>
              </div>
            </motion.div>
          ))}

          <div className="glass p-4 rounded-2xl text-xs text-slate-400 leading-relaxed">
            <Eye className="w-4 h-4 text-emerald-300 inline mr-1" />
            Guardian access is cryptographically scoped. Wards can revoke your visibility at any time from their Safety settings.
          </div>
        </div>
      </div>
    </div>
  );
}
