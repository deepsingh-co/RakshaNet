import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flag, ShieldCheck, ThumbsUp, MapPin, Plus, AlertTriangle, Eye, Moon, Users } from "lucide-react";
import { useSafetyStore, type CommunityReport } from "../store/safetyStore";
import { PageHeader, Pill, StatCard } from "../components/ui";

const types = ["Harassment", "Stalking", "Poor Lighting", "Suspicious", "Crowd"] as const;

export default function CommunityReports() {
  const { communityReports, reportIncident, pushNotification, fetchIncidents } = useSafetyStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ area: "", type: "Harassment" as CommunityReport["type"], severity: 3 as 1 | 2 | 3 | 4 | 5, reporter: "Anonymous" });

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.area.trim()) return;
    reportIncident(form);
    setOpen(false);
    setForm({ area: "", type: "Harassment", severity: 3, reporter: "Anonymous" });
  };

  const verified = communityReports.filter((r) => r.verified).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community intelligence"
        title={<>Citizen-powered <em>safety</em> network</>}
        description="Anonymous verified reports — making cities safer, together."
        actions={
          <button onClick={() => setOpen(true)} className="rn-btn rn-btn-accent rn-btn-sm">
            <Plus className="h-4 w-4" aria-hidden="true" /> File a report
          </button>
        }
      />

      <div className="rn-kpi-grid">
        <StatCard
          label="Total reports"
          value={communityReports.length}
          hint="Across your city"
          icon={<Flag className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          tone="rose"
        />
        <StatCard
          label="Verified"
          value={verified}
          hint="Peer + AI confirmed"
          icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          tone="emerald"
        />
        <StatCard
          label="Active contributors"
          value="12.4k"
          hint="Community watch"
          icon={<Users className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          tone="primary"
        />
        <StatCard
          label="Verification rate"
          value="87%"
          hint="Cross-validated"
          icon={<Eye className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          tone="amber"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {communityReports.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rn-card p-5 flex items-start gap-4"
            >
              <div className={`w-11 h-11 rounded-xl grid place-items-center ${
                r.severity >= 4 ? "bg-pink-500/20 text-pink-300" : r.severity === 3 ? "bg-amber-500/20 text-amber-300" : "bg-cyan-500/20 text-cyan-300"
              }`}>
                {r.type === "Poor Lighting" ? <Moon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{r.area}</span>
                  <Pill tone={r.severity >= 4 ? "pink" : r.severity === 3 ? "amber" : "cyan"}>{r.type}</Pill>
                  {r.verified && <Pill tone="emerald"><ShieldCheck className="w-3 h-3" /> Verified</Pill>}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.reporter}</span>
                  <span>• {r.time}</span>
                  <span>• Severity {r.severity}/5</span>
                </div>
              </div>
              <button
                onClick={() => pushNotification("info", `Upvoted report • ${r.area}`)}
                className="flex items-center gap-1.5 glass-chip px-3 py-2 text-xs hover:bg-white/10"
              >
                <ThumbsUp className="w-3.5 h-3.5" /> {r.votes}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="rn-card p-6">
          <div className="font-bold">Report Integrity</div>
          <p className="text-xs text-slate-400 mt-1">All reports are cross-validated using AI, geolocation patterns, and peer confirmation.</p>
          <div className="mt-4 space-y-3">
            {[
              ["AI pattern match", "92%"],
              ["Geolocation verified", "88%"],
              ["Peer upvotes", "≥ 5 reqd"],
              ["Admin review", "within 2h"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-400">{k}</span>
                <span className="font-semibold tabular">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 glass rounded-xl text-xs text-slate-400 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-300 inline mr-1" />
            Your identity is protected with end-to-end encryption. Reports are anonymized before reaching the public heatmap.
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur p-4" onClick={() => setOpen(false)}>
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="glass-strong p-6 rounded-3xl w-full max-w-md glow-pink"
          >
            <div className="text-xs uppercase tracking-widest text-pink-300">File Incident Report</div>
            <h3 className="text-xl font-bold mt-1">Anonymous • Encrypted</h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs text-slate-400">Area / Location</span>
                <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Nehru Place Flyover" className="mt-1 w-full glass px-3 py-2 rounded-xl outline-none text-sm" />
              </label>
              <div>
                <span className="text-xs text-slate-400">Type</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {types.map((t) => (
                    <button type="button" key={t} onClick={() => setForm({ ...form, type: t })}
                      className={`px-3 py-1.5 rounded-full text-xs border ${form.type === t ? "bg-pink-500/20 text-pink-200 border-pink-400/30" : "border-white/10 text-slate-400"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400">Severity ({form.severity}/5)</span>
                <div className="mt-1 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button type="button" key={s} onClick={() => setForm({ ...form, severity: s as any })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold ${s <= form.severity ? "bg-pink-500/30 text-pink-200" : "bg-white/5 text-slate-500"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400">Reporter</span>
                <div className="mt-1 flex gap-2">
                  {["Anonymous", "Verified User"].map((r) => (
                    <button type="button" key={r} onClick={() => setForm({ ...form, reporter: r })}
                      className={`flex-1 py-2 rounded-xl text-xs border ${form.reporter === r ? "bg-white/10 border-white/20" : "border-white/10 text-slate-400"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-sm font-semibold">Submit Report</button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}
