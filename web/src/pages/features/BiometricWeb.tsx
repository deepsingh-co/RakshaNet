import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Fingerprint, Lock, Unlock, Shield, AlertTriangle,
  CheckCircle2, KeyRound, Eye, EyeOff, Cpu,
} from "lucide-react";
import { Card } from "../../components/ui";

export default function BiometricWeb() {
  const [duressPin, setDuressPin] = useState("");
  const [testPin, setTestPin] = useState("");
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [testResult, setTestResult] = useState<"duress" | "normal" | null>(null);

  const enroll = () => {
    setEnrolling(true);
    setTimeout(() => {
      setBiometricEnrolled(true);
      setEnrolling(false);
    }, 2000);
  };

  const testUnlock = () => {
    if (testPin === duressPin && duressPin.length >= 4) {
      setTestResult("duress");
    } else {
      setTestResult("normal");
    }
    setTimeout(() => setTestResult(null), 4000);
    setTestPin("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/app/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Covert Safety</div>
          <h1 className="text-3xl font-black">Biometric Panic Profile</h1>
          <p className="text-slate-400 text-sm mt-1">Duress authentication triggers silent SOS</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card glow="cyan">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-semibold">WebAuthn API + Duress Pattern</span>
            </div>
            <p className="text-sm text-slate-400">
              When forced to unlock phone, use special fingerprint or duress PIN. Phone unlocks normally BUT silent SOS is triggered. Attacker sees nothing unusual.
            </p>
          </Card>

          <div className="grid md:grid-cols-4 gap-3">
            {[
              { n: "1", t: "Enroll", d: "Register duress biometric" },
              { n: "2", t: "Set PIN", d: "Alternative duress code" },
              { n: "3", t: "Coerced", d: "Attacker forces unlock" },
              { n: "4", t: "Silent SOS", d: "Guardians notified" },
            ].map((s) => (
              <div key={s.n} className="glass p-3 rounded-xl">
                <div className="text-2xl font-black text-gradient-cyan">{s.n}</div>
                <div className="text-sm font-bold mt-1">{s.t}</div>
                <div className="text-xs text-slate-400">{s.d}</div>
              </div>
            ))}
          </div>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="w-5 h-5 text-cyan-300" />
              <h3 className="text-lg font-bold">1. Enroll Duress Biometric</h3>
            </div>
            {biometricEnrolled ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div>
                  <div className="font-bold text-emerald-200">Duress Biometric Enrolled</div>
                  <div className="text-xs text-emerald-300/70">Use special finger when forced to unlock</div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-400 mb-4">
                  Register a specific finger as your "duress finger". When you use this finger to unlock under coercion, it silently triggers SOS.
                </p>
                <button
                  onClick={enroll}
                  disabled={enrolling}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {enrolling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5" /> Enroll Fingerprint
                    </>
                  )}
                </button>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-5 h-5 text-cyan-300" />
              <h3 className="text-lg font-bold">2. Set Duress PIN</h3>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Alternative to biometric. Enter this PIN when forced to unlock your phone.
            </p>
            <div className="relative mb-3">
              <input
                type={showPin ? "text" : "password"}
                value={duressPin}
                onChange={(e) => setDuressPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4-6 digit duress PIN (e.g., 9119)"
                className="w-full glass px-4 py-3 rounded-xl text-sm outline-none border border-transparent focus:border-cyan-400/40 pr-12 tracking-widest font-mono"
              />
              <button
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {duressPin.length >= 4 && (
              <div className="text-xs text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Duress PIN set
              </div>
            )}
          </Card>

          <Card glow={testResult === "duress" ? "pink" : testResult === "normal" ? "emerald" : undefined}>
            <div className="flex items-center gap-2 mb-3">
              <Unlock className="w-5 h-5 text-cyan-300" />
              <h3 className="text-lg font-bold">3. Test Duress Mode</h3>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Try unlocking with your duress PIN to see silent SOS trigger.
            </p>
            <input
              type="password"
              value={testPin}
              onChange={(e) => setTestPin(e.target.value)}
              placeholder="Enter PIN to unlock"
              className="w-full glass px-4 py-3 rounded-xl text-sm outline-none border border-transparent focus:border-cyan-400/40 mb-3 tracking-widest font-mono"
            />
            <button
              onClick={testUnlock}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold flex items-center justify-center gap-2"
            >
              <Unlock className="w-5 h-5" /> Unlock Phone
            </button>

            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-xl border ${
                  testResult === "duress"
                    ? "bg-red-500/10 border-red-400/30"
                    : "bg-emerald-500/10 border-emerald-400/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  {testResult === "duress" ? (
                    <>
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                      <div>
                        <div className="font-bold text-red-200">🚨 DURESS ACTIVATED</div>
                        <div className="text-xs text-red-300/80 mt-1">
                          Phone unlocked normally BUT silent SOS triggered. Guardians alerted.
                          Attacker sees nothing unusual.
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-emerald-200">Normal Unlock</div>
                        <div className="text-xs text-emerald-300/80 mt-1">
                          Phone unlocked normally (not duress PIN). No SOS triggered.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="text-sm font-bold mb-3">Real-World Scenario</div>
            <div className="space-y-3 text-xs">
              {[
                { t: "Attacker demands phone", d: "Forces you to unlock", i: "🔓" },
                { t: "Use duress finger/PIN", d: "Looks like normal unlock", i: "👆" },
                { t: "Phone unlocks normally", d: "Attacker is satisfied", i: "✅" },
                { t: "Silent SOS triggered", d: "Guardians + police alerted", i: "🚨" },
                { t: "Live tracking active", d: "Location shared covertly", i: "📍" },
                { t: "Help arrives", d: "Attacker caught off-guard", i: "🚓" },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 glass p-2 rounded-lg">
                  <div className="text-2xl">{s.i}</div>
                  <div>
                    <div className="font-semibold">{s.t}</div>
                    <div className="text-slate-400">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-bold">Covert by Design</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Duress mode is visually identical to normal unlock. No sounds, no notifications, no visible alerts. Only backend logs the event.
            </p>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Best Practices</div>
            <div className="space-y-2 text-xs text-slate-300">
              {[
                "Practice in safe environment first",
                "Choose PIN easy to remember under stress",
                "Use different finger than normal unlock",
                "Tell trusted guardians about duress mode",
                "Test monthly to build muscle memory",
              ].map((tip) => (
                <div key={tip} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300 mt-0.5 shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-bold">Duress Patterns</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div>• Special fingerprint</div>
              <div>• Reverse PIN (e.g., 9119 vs 1234)</div>
              <div>• Pattern drawn backwards</div>
              <div>• Long-press on unlock</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
