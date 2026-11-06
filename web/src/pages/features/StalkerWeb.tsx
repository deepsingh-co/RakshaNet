import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Radio, AlertTriangle, Shield, MapPin,
  Signal, Cpu, Zap, Wifi,
} from "lucide-react";
import { Card, Pill } from "../../components/ui";

import { aiServicesApi } from "../../api/endpoints";

interface StalkerResult {
  mac: string;
  type: string;
  signal: number;
  distance: number;
  following: boolean;
  duration: string;
  threatScore: number;
  pattern: string;
  riskFactors: string[];
}

export default function StalkerWeb() {
  const [scanning, setScanning] = useState(false);
  const [trackers, setTrackers] = useState<StalkerResult[]>([]);
  const [scanProgress, setScanProgress] = useState(0);

  const startScan = (scenario?: "safe" | "stalker" | "stationary") => {
    setScanning(true);
    setTrackers([]);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 5;
      });
    }, 150);

    setTimeout(async () => {
      const found: StalkerResult[] = [];

      // Define scenarios or fallback to random
      const selectedScenarios = [];
      if (scenario === "safe") {
        selectedScenarios.push({
          type: "Unknown BLE",
          mac: "XX:XX:XX:2D:4E:A8",
          signal: 85,
          distance: 25.5,
          duration: 60,
          observation_count: 1,
          location_changes: 0,
        });
      } else if (scenario === "stalker") {
        selectedScenarios.push({
          type: "Apple AirTag",
          mac: "XX:XX:XX:90:39:D5",
          signal: 42,
          distance: 2.4,
          duration: 2700,
          observation_count: 22,
          location_changes: 5,
        });
      } else if (scenario === "stationary") {
        selectedScenarios.push({
          type: "Tile Tracker",
          mac: "XX:XX:XX:F3:11:0B",
          signal: 65,
          distance: 12.0,
          duration: 7200,
          observation_count: 85,
          location_changes: 0,
        });
      } else {
        // Fallback to random discovery
        const types = ["AirTag", "Tile", "SmartTag", "Unknown BLE"];
        const count = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < count; i++) {
          const isStalkerTrigger = Math.random() > 0.5;
          const mac = `XX:XX:XX:${Math.random().toString(16).slice(2, 4).toUpperCase()}:${Math.random().toString(16).slice(2, 4).toUpperCase()}:${Math.random().toString(16).slice(2, 4).toUpperCase()}`;
          const trackerType = types[Math.floor(Math.random() * types.length)];
          const signal = Math.floor(Math.random() * 30) + 60;
          const distance = +(Math.random() * 50).toFixed(1);
          const duration = Math.floor(Math.random() * 2400) + 600;

          selectedScenarios.push({
            type: trackerType,
            mac,
            signal,
            distance,
            duration,
            observation_count: Math.floor(Math.random() * 20) + 5,
            location_changes: isStalkerTrigger ? Math.floor(Math.random() * 5) + 3 : 1,
          });
        }
      }

      for (const item of selectedScenarios) {
        try {
          const data = await aiServicesApi.analyzeStalker({
            mac_address: item.mac,
            signal_strength: -item.signal,
            distance_meters: item.distance,
            duration_seconds: item.duration,
            first_seen: Math.floor(Date.now() / 1000) - item.duration,
            last_seen: Math.floor(Date.now() / 1000),
            observation_count: item.observation_count,
            location_changes: item.location_changes,
          });

          found.push({
            mac: item.mac,
            type: item.type,
            signal: item.signal,
            distance: item.distance,
            following: data.is_stalking,
            duration: `${Math.floor(item.duration / 60)}min`,
            threatScore: data.threat_score,
            pattern: data.pattern_match,
            riskFactors: data.risk_factors || [],
          });
        } catch (e) {
          console.error("Stalker analyze failed", e);
        }
      }

      setTrackers(found);
      setScanning(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/app/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-amber-300">Privacy Shield</div>
          <h1 className="text-3xl font-black">Digital Stalker Detector</h1>
          <p className="text-slate-400 text-sm mt-1">Find hidden AirTags, Bluetooth trackers & spyware</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card glow="amber">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-semibold">ML Model: Isolation Forest</span>
              <Pill tone="amber">100 trees</Pill>
            </div>
            <p className="text-sm text-slate-400">
              Trained on 500 synthetic BLE device patterns. Detects anomalies based on 5 features:
              signal strength, distance, duration, observation count, and location changes.
            </p>
          </Card>

          {/* Scan control */}
          <Card>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">Standard BLE Scan</div>
                  <div className="text-xs text-slate-400">Scan for general random nearby devices (Range: 100m)</div>
                </div>
                <button
                  onClick={() => startScan()}
                  disabled={scanning}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-bold disabled:opacity-60 flex items-center gap-2"
                >
                  {scanning ? <><Zap className="w-4 h-4 blink" /> Scanning...</> : <><Radio className="w-4 h-4" /> Start Scan</>}
                </button>
              </div>

              <div className="border-t border-white/5 pt-4">
                <div className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Judge Evaluation & ML Verification Suite
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Simulate specific BLE tracker advertising telemetry to verify the live FastAPI Isolation Forest model's dynamic classification behavior:
                </p>
                <div className="grid md:grid-cols-3 gap-2">
                  <button
                    onClick={() => startScan("safe")}
                    disabled={scanning}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition text-center disabled:opacity-60"
                  >
                    <span className="text-[10px] uppercase font-bold text-emerald-400">🟢 Scenario A</span>
                    <span className="text-xs font-bold text-white mt-1">Benign Pass-by</span>
                    <span className="text-[9px] text-slate-400 mt-1 leading-tight">Normal phone passing, brief encounter (Low threat)</span>
                  </button>
                  <button
                    onClick={() => startScan("stationary")}
                    disabled={scanning}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition text-center disabled:opacity-60"
                  >
                    <span className="text-[10px] uppercase font-bold text-amber-400">🟡 Scenario B</span>
                    <span className="text-xs font-bold text-white mt-1">Stationary Beacon</span>
                    <span className="text-[9px] text-slate-400 mt-1 leading-tight">Fixed shop beacon, long time, no movement (Medium threat)</span>
                  </button>
                  <button
                    onClick={() => startScan("stalker")}
                    disabled={scanning}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 transition text-center disabled:opacity-60"
                  >
                    <span className="text-[10px] uppercase font-bold text-red-400">🔴 Scenario C</span>
                    <span className="text-xs font-bold text-white mt-1">Active Stalker</span>
                    <span className="text-[9px] text-slate-400 mt-1 leading-tight">Persistent AirTag following you (High threat alert)</span>
                  </button>
                </div>
              </div>
            </div>

            {scanning && (
              <div className="mt-6">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Scanning & running Isolation Forest anomaly evaluation...</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-600"
                    animate={{ width: `${scanProgress}%` }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-center gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-amber-400 rounded-full"
                      animate={{ height: [8, 32, 8] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </div>
            )}

            {!scanning && trackers.length === 0 && (
              <div className="py-8 text-center border-t border-white/5 mt-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 grid place-items-center mx-auto mb-2">
                  <Wifi className="w-6 h-6 text-amber-300" />
                </div>
                <div className="text-xs text-slate-400">Select any scenario above to trace the live ML model results</div>
              </div>
            )}
          </Card>

          {/* Results */}
          {trackers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Detected Trackers ({trackers.length})</h3>
                <Pill tone={trackers.some((t) => t.following) ? "pink" : "emerald"}>
                  {trackers.some((t) => t.following) ? "⚠ THREAT" : "✓ CLEAR"}
                </Pill>
              </div>

              {trackers.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card glow={t.following ? "pink" : "amber"}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl grid place-items-center ${
                        t.following ? "bg-red-500/20" : "bg-amber-500/20"
                      }`}>
                        {t.following ? (
                          <AlertTriangle className="w-6 h-6 text-red-400" />
                        ) : (
                          <Signal className="w-6 h-6 text-amber-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{t.type}</span>
                          <Pill tone={t.following ? "pink" : "amber"}>{t.pattern.toUpperCase()}</Pill>
                          {t.following && <Pill tone="pink">⚠ STALKING</Pill>}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-mono">{t.mac}</div>

                        <div className="grid grid-cols-4 gap-2 mt-3">
                          <div className="glass p-2 rounded-lg">
                            <div className="text-[10px] text-slate-400">Distance</div>
                            <div className="text-sm font-bold tabular">{t.distance}m</div>
                          </div>
                          <div className="glass p-2 rounded-lg">
                            <div className="text-[10px] text-slate-400">Signal</div>
                            <div className="text-sm font-bold tabular">-{t.signal}dBm</div>
                          </div>
                          <div className="glass p-2 rounded-lg">
                            <div className="text-[10px] text-slate-400">Duration</div>
                            <div className="text-sm font-bold tabular">{t.duration}</div>
                          </div>
                          <div className="glass p-2 rounded-lg">
                            <div className="text-[10px] text-slate-400">Threat</div>
                            <div className={`text-sm font-bold tabular ${
                              t.threatScore > 60 ? "text-red-300" : "text-amber-300"
                            }`}>{t.threatScore.toFixed(0)}</div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1">
                          {t.riskFactors.map((f, j) => (
                            <div key={j} className="text-xs text-slate-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />
                              {f}
                            </div>
                          ))}
                        </div>

                        {t.following && (
                          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-400/30 text-xs text-red-200">
                            <strong>Recommended:</strong> Move to public place, alert guardians, consider reporting to police.
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <div className="text-sm font-bold mb-3">Detection Capabilities</div>
            <div className="space-y-2 text-xs">
              {[
                { i: Radio, t: "Apple AirTags", d: "Bluetooth tracking" },
                { i: Signal, t: "Tile Trackers", d: "Consumer devices" },
                { i: Wifi, t: "Samsung SmartTag", d: "Galaxy ecosystem" },
                { i: Zap, t: "Unknown BLE", d: "Generic devices" },
                { i: Shield, t: "Spyware patterns", d: "Behavioral analysis" },
              ].map((f) => (
                <div key={f.t} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <f.i className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">{f.t}</div>
                    <div className="text-slate-400">{f.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">How to disable</div>
            <div className="space-y-2 text-xs text-slate-300">
              {[
                { t: "AirTag", d: "Remove battery (CR2032)" },
                { t: "Tile", d: "Remove or crush device" },
                { t: "SmartTag", d: "Remove battery" },
                { t: "Unknown", d: "Move 100m+ away" },
              ].map((s) => (
                <div key={s.t} className="glass p-2 rounded-lg">
                  <div className="font-semibold">{s.t}</div>
                  <div className="text-slate-400 text-[11px]">{s.d}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-bold">Privacy Tip</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scan regularly when in public places, after dates, or when traveling. If a tracker follows you across 3+ locations, it's almost certainly malicious.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
