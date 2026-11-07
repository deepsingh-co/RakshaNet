import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Siren, Mic, Smartphone, Watch, Calculator, Volume2, Video, ShieldCheck,
  Phone, MessageSquare, Send, Flashlight, Camera, Radio, Trash2, Plus, UserPlus,
  Settings2,
} from "lucide-react";
import SOSButton from "../components/SOSButton";
import { useSafetyStore } from "../store/safetyStore";
import { PageHeader, Pill } from "../components/ui";
import { IntegratedVoiceGuard } from "../components/IntegratedVoiceGuard";
import { executeVoiceDistressDispatch } from "../services/voiceDistressService";

const triggers = [
  { icon: Mic, label: "Voice Guard", sub: "Auto-detects fixed trigger words", action: "voice-trigger" },
  { icon: Smartphone, label: "Shake Phone", sub: "Accelerometer + AI validation", action: "Shake Detection" },
  { icon: Watch, label: "Smartwatch", sub: "Heart-rate spike + tap", action: "Smartwatch Trigger" },
  { icon: Calculator, label: "Stealth PIN", sub: "Fake calculator • 999=", action: "Stealth PIN" },
  { icon: Volume2, label: "Volume Pattern", sub: "Triple-press volume", action: "Volume Pattern" },
  { icon: Camera, label: "Panic Face", sub: "Emotion AI • fear detected", action: "Panic Emotion AI" },
];

export default function SOSDashboard() {
  const {
    sosActive, dismissSOS, pushNotification, activeAlerts,
    contacts, addContact, deleteContact, fetchContacts, startTrackingLocation
  } = useSafetyStore();

  const [fakeCall, setFakeCall] = useState<{ caller: string; on: boolean }>({ caller: "", on: false });
  const [stealth, setStealth] = useState("");
  const [showVoiceGuard, setShowVoiceGuard] = useState(false);

  // State for Add Guardian Form
  const [gName, setGName] = useState("");
  const [gRelation, setGRelation] = useState("Guardian");
  const [gPhone, setGPhone] = useState("");

  useEffect(() => {
    fetchContacts();
    if (startTrackingLocation) {
      startTrackingLocation();
    }
  }, [fetchContacts, startTrackingLocation]);

  const startFakeCall = (caller: string) => {
    setFakeCall({ caller, on: true });
    pushNotification("info", `Fake incoming call from ${caller} — tap to dismiss`);
  };

  const stealthKey = (k: string) => {
    if (k === "C") { setStealth(""); return; }
    const next = (stealth + k).slice(-4);
    setStealth(next);
    if (next === "9999") {
      useSafetyStore.getState().triggerSOS("Stealth PIN 999=");
      setStealth("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SOS Center"
        title={<>Multi-vector <em>emergency</em> activation</>}
        description="6 redundant ways to trigger SOS — even under duress."
        actions={
          <>
            <Pill tone="emerald">
              <span className="rn-dot" aria-hidden="true" /> Armed &amp; listening
            </Pill>
            <Pill tone="pink">
              <Siren className="h-3 w-3" aria-hidden="true" /> 6 triggers live
            </Pill>
          </>
        }
      />

      {/* Ambient zero-click Voice Guard status */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--rn-border)] bg-[var(--rn-surface)] p-3.5 shadow-[var(--rn-shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--rn-border)] bg-[var(--rn-accent-soft)] text-[var(--rn-accent)]">
            <Mic className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-wide text-[var(--rn-ink)]">AI Voice Guard</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--rn-border)] bg-[var(--rn-emerald-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--rn-emerald)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--rn-emerald)] animate-ping" aria-hidden="true" /> Always listening
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--rn-ink-soft)]">
              Say <span className="font-semibold italic text-[var(--rn-accent-strong)]">“Mera koi picha kr raha hai”</span> to trigger SMS, WhatsApp and a demo call automatically.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => executeVoiceDistressDispatch("Mera koi picha kr raha hai", "manual-test")}
            className="flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--rn-accent)] bg-[var(--rn-accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            title="Instant one-click test simulation"
          >
            <Siren className="h-3.5 w-3.5" aria-hidden="true" />
            Test trigger
          </button>
          <button
            type="button"
            onClick={() => setShowVoiceGuard(!showVoiceGuard)}
            aria-expanded={showVoiceGuard}
            aria-controls="voice-guard-panel"
            className="flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--rn-border-strong)] bg-[var(--rn-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--rn-ink)] transition hover:bg-[var(--rn-bg-soft)]"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            {showVoiceGuard ? "Hide phrases" : "Edit phrases"}
          </button>
        </div>
      </div>

      {/* Expandable Voice Guard & Custom Words Panel */}
      <AnimatePresence>
        {showVoiceGuard && (
          <motion.div
            id="voice-guard-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <IntegratedVoiceGuard />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sosActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-strong p-6 rounded-3xl glow-pink relative overflow-hidden"
          >
            <div className="absolute inset-0 scan-line opacity-30" />
            <div className="relative grid md:grid-cols-2 gap-6 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-pink-200 bg-pink-500/20 border border-pink-400/30 px-3 py-1 rounded-full blink">
                  <Siren className="w-3.5 h-3.5" /> SOS ACTIVE — ALL CHANNELS ARMED
                </div>
                <h2 className="text-3xl font-black mt-3 text-gradient-pink text-glow-pink">Your guardians have been alerted</h2>
                <p className="text-slate-300 text-sm mt-2">
                  Live GPS, hidden audio, and video recording are now streaming to your trusted circle and the RakshaNet Command Center. Police escalation will begin in 90 seconds if unacknowledged.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill tone="pink"><Send className="w-3 h-3" /> Twilio SMS × 4</Pill>
                  <Pill tone="amber"><Phone className="w-3 h-3" /> Auto-call queued</Pill>
                  <Pill tone="cyan"><MessageSquare className="w-3 h-3" /> WhatsApp sent</Pill>
                  <Pill tone="emerald"><Video className="w-3 h-3" /> Evidence recording</Pill>
                  <Pill tone="violet"><Flashlight className="w-3 h-3" /> Flashlight SOS Morse</Pill>
                </div>
              </div>
              <div className="grid place-items-center">
                <SOSButton size="md" label="DISARM" />
              </div>
            </div>
            <button
              onClick={dismissSOS}
              className="mt-5 w-full py-3 rounded-xl border border-white/10 text-sm font-semibold hover:bg-white/5"
            >
              False alarm — Disarm SOS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* SOS core */}
        <div className="rn-sos-stage lg:col-span-2 p-8">
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-slate-400">Press & hold to activate</div>
            <div className="mt-6 grid place-items-center">
              <SOSButton size="lg" />
            </div>
            <div className="mt-6 text-sm text-slate-400">
              Hold for <span className="text-white font-bold">0.8s</span> to trigger. Requires AI confirmation to prevent false positives.
            </div>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {triggers.map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  if (t.action === "voice-trigger") {
                    setShowVoiceGuard((prev) => !prev);
                  } else {
                    useSafetyStore.getState().triggerSOS(t.action);
                  }
                }}
                className={`group text-left rounded-2xl border p-4 transition ${
                  t.action === "voice-trigger" && showVoiceGuard
                    ? "border-[var(--rn-accent)] bg-[var(--rn-accent-soft)]"
                    : "border-[var(--rn-border)] bg-[var(--rn-surface)] hover:border-[var(--rn-primary)]"
                }`}
              >
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[var(--rn-accent-soft)] text-[var(--rn-accent)] transition group-hover:scale-110">
                  <t.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="text-sm font-semibold text-[var(--rn-ink)]">{t.label}</div>
                <div className="text-xs text-[var(--rn-ink-faint)]">{t.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Side */}
        <div className="space-y-4">
          {/* Fake call */}
          <div className="rounded-3xl border border-[var(--rn-border)] bg-[var(--rn-surface)] p-5 shadow-[var(--rn-shadow-sm)]">
            <div className="flex items-start gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--rn-primary-soft)] text-[var(--rn-primary-strong)]">
                <Phone className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <div className="text-sm font-bold text-[var(--rn-ink)]">Fake call escape</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--rn-ink-faint)]">
                  Realistic ringtone to exit uncomfortable situations.
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: "Mom", caller: "Mom • Sunita" },
                { label: "Brother", caller: "Rahul • Brother" },
                { label: "Police", caller: "Delhi Police" },
                { label: "Unknown", caller: "Unknown" },
              ].map((person) => (
                <button
                  key={person.label}
                  type="button"
                  onClick={() => startFakeCall(person.caller)}
                  className="min-h-10 rounded-xl border border-[var(--rn-border-strong)] bg-[var(--rn-bg-soft)] px-3 text-xs font-semibold text-[var(--rn-ink)] transition hover:border-[var(--rn-primary)] hover:bg-[var(--rn-primary-soft)]"
                >
                  {person.label}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {fakeCall.on && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--rn-emerald)_28%,var(--rn-border))] bg-[var(--rn-emerald-soft)] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rn-emerald)]">
                      Incoming call
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--rn-emerald)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--rn-emerald)] animate-pulse" aria-hidden="true" />
                      Ringing
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-bold text-[var(--rn-ink)]">{fakeCall.caller}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFakeCall({ caller: "", on: false })}
                      className="min-h-10 rounded-xl bg-[var(--rn-emerald)] text-xs font-bold text-white transition hover:opacity-90"
                    >
                      Answer
                    </button>
                    <button
                      type="button"
                      onClick={() => setFakeCall({ caller: "", on: false })}
                      className="min-h-10 rounded-xl border border-[var(--rn-accent)] bg-[var(--rn-surface)] text-xs font-bold text-[var(--rn-accent-strong)] transition hover:bg-[var(--rn-accent-soft)]"
                    >
                      Decline
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stealth calculator */}
          <div className="glass-strong p-5 rounded-3xl">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-300" />
              <div className="font-bold">Stealth Calculator</div>
            </div>
            <p className="text-xs text-slate-400 mt-1">Enter <span className="text-white font-semibold">9999</span> on the keypad to trigger silent SOS.</p>
            <div className="mt-3 glass p-3 rounded-xl text-right text-2xl font-mono tabular min-h-[48px]">
              {stealth || <span className="text-slate-500">0</span>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "="].map((k) => (
                <button key={k} onClick={() => stealthKey(k)} className="py-2 glass-chip hover:bg-white/10 text-sm font-semibold">
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Emergency Contacts Management */}
          <div className="glass-strong p-5 rounded-3xl border border-pink-400/10">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-pink-300" />
              <div className="font-bold text-gradient-pink">Emergency Guardians</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Configure who gets real-time Twilio SMS, WhatsApp, and Voice Calls.</p>

            {/* List existing contacts */}
            <div className="mt-3 space-y-2 max-h-48 overflow-auto no-scrollbar">
              {contacts.length === 0 ? (
                <div className="text-[11px] text-slate-500 text-center py-2 italic">
                  No guardians configured. Fallback to your own number.
                </div>
              ) : (
                contacts.map((c) => (
                  <div key={c.id} className="glass p-2.5 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.relation} • {c.phone}</div>
                    </div>
                    <button
                      onClick={() => deleteContact(c.id)}
                      className="p-1.5 rounded-lg bg-pink-500/10 text-pink-300 hover:bg-pink-500/25 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add contact form */}
            <div className="mt-4 border-t border-white/5 pt-3 space-y-2">
              <input
                type="text"
                placeholder="Guardian Name"
                value={gName}
                onChange={(e) => setGName(e.target.value)}
                className="w-full text-xs bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-pink-500/40"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Relation (e.g. Mom, Friend)"
                  value={gRelation}
                  onChange={(e) => setGRelation(e.target.value)}
                  className="w-full text-xs bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-pink-500/40"
                />
                <input
                  type="text"
                  placeholder="Phone (e.g. +91XXX)"
                  value={gPhone}
                  onChange={(e) => setGPhone(e.target.value)}
                  className="w-full text-xs bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-pink-500/40"
                />
              </div>
              <button
                onClick={async () => {
                  if (!gName || !gPhone) return;
                  await addContact(gName, gRelation, gPhone);
                  setGName("");
                  setGPhone("");
                }}
                disabled={!gName || !gPhone}
                className="w-full py-2 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Guardian
              </button>
            </div>
          </div>

          {/* Live alerts */}
          <div className="glass-strong p-5 rounded-3xl">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-pink-300 blink" />
              <div className="font-bold">Live SOS Feed</div>
            </div>
            <div className="mt-3 space-y-2 max-h-56 overflow-auto no-scrollbar">
              {activeAlerts.map((a) => (
                <div key={a.id} className="glass p-3 rounded-xl text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{a.user}</span>
                    <Pill tone={a.level === "CRITICAL" ? "pink" : a.level === "HIGH" ? "amber" : "cyan"}>{a.level}</Pill>
                  </div>
                  <div className="text-slate-400 mt-0.5">{a.trigger}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Escalation ladder */}
      <div className="glass-strong p-6 rounded-3xl">
        <div className="text-sm font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300" /> Emergency Escalation Engine
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          {[
            { n: "01", t: "SOS Triggered", d: "Live location + audio recorded to vault", tone: "pink" },
            { n: "02", t: "Guardian Alert", d: "Twilio SMS + WhatsApp to all contacts", tone: "amber" },
            { n: "03", t: "Auto Voice Call", d: "30s no response → automated voice call", tone: "cyan" },
            { n: "04", t: "Police Dispatch", d: "WebSocket push + GPS + evidence link", tone: "emerald" },
          ].map((s) => (
            <div key={s.n} className="glass p-4 rounded-2xl border border-white/5">
              <div className={`text-3xl font-black ${s.tone === "pink" ? "text-pink-300" : s.tone === "amber" ? "text-amber-300" : s.tone === "cyan" ? "text-cyan-300" : "text-emerald-300"
                }`}>{s.n}</div>
              <div className="font-bold mt-1">{s.t}</div>
              <div className="text-xs text-slate-400 mt-1">{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
