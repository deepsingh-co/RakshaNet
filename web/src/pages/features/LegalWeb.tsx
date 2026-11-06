import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, FileText, Shield, Phone, Video, MapPin,
  AlertTriangle, CheckCircle2, Sparkles, Cpu, Users,
} from "lucide-react";
import { Card, Pill } from "../../components/ui";
import { aiServicesApi } from "../../api/endpoints";

const IPC_SECTIONS: Record<string, string> = {
  stalking: "354D — Stalking",
  harassment: "354A — Sexual Harassment",
  assault: "354 — Outrage modesty",
  eveTeasing: "509 — Insult modesty",
  cyberStalking: "67 IT Act — Cyber stalking",
  threat: "506 — Criminal Intimidation",
  voyeurism: "354C — Voyeurism",
  acidAttack: "326A — Acid Attack",
};

const LAWYERS = [
  { name: "Adv. Meera Krishnan", spec: "Women's Safety & Criminal", exp: "12 yrs", rating: 4.9, proBono: true, avail: "Now" },
  { name: "Adv. Priya Sharma", spec: "Cyber Crimes", exp: "8 yrs", rating: 4.8, proBono: true, avail: "30 min" },
  { name: "Adv. Anjali Reddy", spec: "Sexual Harassment", exp: "15 yrs", rating: 4.9, proBono: false, avail: "Tomorrow" },
];

export default function LegalWeb() {
  const [step, setStep] = useState(1);
  const [incident, setIncident] = useState({
    type: "stalking",
    date: new Date().toISOString().split("T")[0],
    location: "",
    description: "",
    accused: "",
  });
  const [generating, setGenerating] = useState(false);
  const [firDraft, setFirDraft] = useState("");
  const [lawyerList, setLawyerList] = useState<any[]>(LAWYERS);

  const generateFIR = async () => {
    setGenerating(true);
    try {
      const data = await aiServicesApi.generateFir({
        user_name: "Rahul",
        user_phone: "9876543210",
        incident_type: incident.type,
        date: incident.date,
        location: incident.location || "Delhi",
        description: incident.description || "The user was followed/threatened near their location.",
        accused: incident.accused || "Unknown",
        witnesses: [],
        evidence: ["GPS Location Logs", "Timestamped Incident Chain"]
      });

      if (data.fir_draft) {
        setFirDraft(data.fir_draft);
      } else {
        throw new Error("No FIR draft returned from backend");
      }

      if (data.matched_lawyers && data.matched_lawyers.length > 0) {
        setLawyerList(data.matched_lawyers.map((l: any) => ({
          name: l.name,
          spec: l.specialty || "Criminal Defense",
          exp: `${l.experience} yrs`,
          rating: l.rating || 4.8,
          proBono: l.pro_bono !== undefined ? l.pro_bono : true,
          avail: l.availability || "Now"
        })));
      }
      setStep(2);
    } catch (e) {
      console.error("Failed to generate FIR draft:", e);
      // Fallback
      const fallbackDraft = `FIRST INFORMATION REPORT
═══════════════════════════════════════════════
Police Station: [Nearest PS to incident]
District: [Auto-detected]
Date & Time: ${new Date().toLocaleString()}
───────────────────────────────────────────────
COMPLAINANT
Name: Rahul
Contact: [Protected under Section 228A IPC]
───────────────────────────────────────────────
INCIDENT DETAILS
Type: ${IPC_SECTIONS[incident.type]}
Location: ${incident.location || "Delhi"}
Date: ${incident.date}
───────────────────────────────────────────────
DESCRIPTION
${incident.description || "Incident reported near Delhi"}
───────────────────────────────────────────────
ACCUSED
${incident.accused || "Unknown"}
═══════════════════════════════════════════════`;
      setFirDraft(fallbackDraft);
      setStep(2);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/app/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-amber-300">Legal Aid</div>
          <h1 className="text-3xl font-black">One-Tap Legal Aid</h1>
          <p className="text-slate-400 text-sm mt-1">Auto-FIR generation + lawyer matching</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card glow="amber">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-semibold">LLM + IPC Database + Evidence Chain</span>
            </div>
            <p className="text-sm text-slate-400">
              Auto-generates court-ready FIR drafts with relevant IPC sections, evidence checklist,
              and legal rights. Matches with pro-bono women safety lawyers.
            </p>
          </Card>

          {step === 1 && (
            <>
              <Card>
                <h3 className="text-lg font-bold mb-4">Incident Details</h3>

                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-2 font-semibold">TYPE OF INCIDENT</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(IPC_SECTIONS).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => setIncident({ ...incident, type: k })}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                          incident.type === k
                            ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                            : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                        }`}
                      >
                        {v.split("—")[1]?.trim() || v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold">DATE</label>
                    <input
                      type="date"
                      value={incident.date}
                      onChange={(e) => setIncident({ ...incident, date: e.target.value })}
                      className="w-full glass px-4 py-2.5 rounded-xl text-sm outline-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold">ACCUSED (if known)</label>
                    <input
                      value={incident.accused}
                      onChange={(e) => setIncident({ ...incident, accused: e.target.value })}
                      placeholder="Name or 'Unknown'"
                      className="w-full glass px-4 py-2.5 rounded-xl text-sm outline-none mt-1"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-xs text-slate-400 font-semibold">LOCATION</label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={incident.location}
                      onChange={(e) => setIncident({ ...incident, location: e.target.value })}
                      placeholder="e.g., Nehru Place, New Delhi"
                      className="w-full glass pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold">DESCRIPTION</label>
                  <textarea
                    value={incident.description}
                    onChange={(e) => setIncident({ ...incident, description: e.target.value })}
                    placeholder="Describe what happened in detail..."
                    rows={5}
                    className="w-full glass px-4 py-2.5 rounded-xl text-sm outline-none mt-1 resize-none"
                  />
                </div>
              </Card>

              <button
                onClick={generateFIR}
                disabled={generating}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating FIR with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Generate FIR Draft
                  </>
                )}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <Card glow="emerald">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <div>
                    <div className="font-bold text-emerald-200">FIR Draft Ready</div>
                    <div className="text-xs text-emerald-300/70">Review and edit before filing</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5" /> FIR Draft
                  </h3>
                  <Pill tone="amber">Auto-generated</Pill>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 bg-black/30 p-4 rounded-xl overflow-auto max-h-96 whitespace-pre-wrap">
                  {firDraft}
                </pre>
              </Card>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-xl border border-white/10 text-sm font-semibold hover:bg-white/5"
                >
                  ← Edit
                </button>
                <button
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" /> Connect to Lawyer
                </button>
              </div>

              <Card>
                <h3 className="text-lg font-bold mb-3">Matched Lawyers</h3>
                <div className="space-y-2">
                  {lawyerList.map((l, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass p-3 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center text-white font-bold text-xs">
                          {l.name ? l.name.split(" ").slice(1).map((s: string) => s[0]).join("") : "LW"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{l.name}</span>
                            {l.proBono && <Pill tone="emerald">PRO BONO</Pill>}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {l.spec} • {l.exp} • ⭐ {l.rating}
                          </div>
                          <div className="text-[11px] text-emerald-300 mt-0.5">Available {l.avail}</div>
                        </div>
                        <div className="flex gap-1.5">
                          <button className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30">
                            <Phone className="w-4 h-4 text-emerald-300" />
                          </button>
                          <button className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30">
                            <Video className="w-4 h-4 text-cyan-300" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="text-sm font-bold mb-3">How it works</div>
            <div className="space-y-2 text-xs">
              {[
                { n: "1", t: "Describe", d: "AI suggests IPC sections" },
                { n: "2", t: "Generate", d: "Auto-draft with evidence" },
                { n: "3", t: "Match", d: "Pro-bono lawyer assigned" },
                { n: "4", t: "File", d: "Digital or at PS" },
                { n: "5", t: "Track", d: "Case updates in app" },
              ].map((s) => (
                <div key={s.n} className="flex gap-3 glass p-2 rounded-lg">
                  <div className="text-xl font-black text-gradient-amber">{s.n}</div>
                  <div>
                    <div className="font-semibold">{s.t}</div>
                    <div className="text-slate-400">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Your Legal Rights</div>
            <div className="space-y-2 text-xs">
              {[
                { t: "Zero FIR", d: "File at any police station" },
                { t: "Free legal aid", d: "Legal Services Authority Act" },
                { t: "Identity protection", d: "Section 228A IPC" },
                { t: "Compensation", d: "Victim Compensation Scheme" },
                { t: "Police protection", d: "If threat persists" },
                { t: "Magistrate statement", d: "Section 164 CrPC" },
              ].map((r) => (
                <div key={r.t} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <Shield className="w-3 h-3 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">{r.t}</div>
                    <div className="text-slate-400">{r.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Emergency Contacts</div>
            <div className="space-y-1.5 text-xs">
              {[
                { n: "Women Helpline", p: "181" },
                { n: "Police", p: "112" },
                { n: "NCW", p: "7827-170-170" },
                { n: "Cyber Crime", p: "1930" },
              ].map((c) => (
                <div key={c.n} className="flex justify-between glass p-2 rounded-lg">
                  <span className="text-slate-300">{c.n}</span>
                  <span className="text-amber-300 font-mono font-semibold">{c.p}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-bold">Legal Notice</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Filing a false FIR is punishable under Section 182, 211 IPC. Ensure all information provided is accurate and truthful.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
