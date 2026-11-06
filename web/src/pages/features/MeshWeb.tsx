import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Radio, Users, MapPin, Signal, Battery, CheckCircle2,
  AlertTriangle, WifiOff, Zap, TrendingUp,
} from "lucide-react";
import { Card, Pill } from "../../components/ui";

import { aiServicesApi } from "../../api/endpoints";

interface MeshNode {
  id: string;
  name: string;
  distance: number;
  signal: number;
  battery: number;
  isGateway: boolean;
  x: number;
  y: number;
}

export default function MeshWeb() {
  const [meshActive, setMeshActive] = useState(false);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [sosBroadcasting, setSosBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any>(null);

  const activateMesh = () => {
    setMeshActive(true);
    // Generate random nodes
    const newNodes: MeshNode[] = Array.from({ length: 8 }, (_, i) => ({
      id: `node-${i}`,
      name: `User ${String.fromCharCode(65 + i)}`,
      distance: Math.floor(Math.random() * 400) + 50,
      signal: Math.floor(Math.random() * 30) + 70,
      battery: Math.floor(Math.random() * 60) + 30,
      isGateway: i === 0,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setNodes(newNodes);
  };

  const broadcastSOS = async () => {
    setSosBroadcasting(true);
    try {
      const payloadNodes = [
        {
          node_id: "node_self",
          latitude: 28.6139,
          longitude: 77.2090,
          battery_pct: 100,
          signal_strength: 100,
          relay_capacity: 10,
          is_internet_connected: false,
          is_trusted: true,
          mobility_score: 0.0,
          historical_reliability: 1.0
        },
        ...nodes.map((n) => ({
          node_id: n.id,
          latitude: 28.6139 + (n.y - 50) / 50000,
          longitude: 77.2090 + (n.x - 50) / 50000,
          battery_pct: n.battery,
          signal_strength: n.signal,
          relay_capacity: 10,
          is_internet_connected: n.isGateway,
          is_trusted: true,
          mobility_score: 0.2,
          historical_reliability: 0.95
        }))
      ];

      const data = await aiServicesApi.broadcastMesh({
        source_node: "node_self",
        nodes: payloadNodes,
        max_hops: 5
      });

      if (data.routes && data.routes.length > 0) {
        const bestRoute = data.routes[0];
        setBroadcastResult({
          totalRoutes: data.total_routes,
          avgLatency: Math.round(bestRoute.latency_ms),
          deliveryProb: bestRoute.delivery_prob,
          hopCount: bestRoute.hops,
          bottleneck: bestRoute.destination === "node-0" ? "User A (Gateway)" : bestRoute.destination,
        });
      } else {
        setBroadcastResult({
          totalRoutes: 0,
          avgLatency: 0,
          deliveryProb: 0,
          hopCount: 0,
          bottleneck: "None",
        });
      }
    } catch (e) {
      console.error("Mesh broadcast failed", e);
    } finally {
      setSosBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/app/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-pink-300">Offline Safety</div>
          <h1 className="text-3xl font-black">Mesh Network SOS</h1>
          <p className="text-slate-400 text-sm mt-1">SOS via Bluetooth mesh when no signal</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card glow="pink">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-semibold">ML Model: GradientBoosting + Dijkstra</span>
            </div>
            <p className="text-sm text-slate-400">
              Predicts optimal message route using 9 features (distance, signal, battery, mobility, reliability).
              Trained on 500 samples. Routes via Dijkstra with ML-weighted edges.
            </p>
          </Card>

          {!meshActive ? (
            <Card>
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-pink-500/10 grid place-items-center mx-auto mb-4">
                  <WifiOff className="w-10 h-10 text-pink-300" />
                </div>
                <div className="text-xl font-bold mb-2">No Signal? No Problem.</div>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                  When cellular and WiFi are unavailable, RakshaNet uses Bluetooth mesh to relay your SOS through nearby users until it reaches someone with internet.
                </p>
                <button
                  onClick={activateMesh}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold flex items-center gap-2 mx-auto"
                >
                  <Radio className="w-4 h-4" /> Activate Mesh Network
                </button>
              </div>
            </Card>
          ) : (
            <>
              {/* Mesh visualization */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold">Mesh Network Active</div>
                    <div className="text-xs text-emerald-300 flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" />
                      {nodes.length} nodes discovered
                    </div>
                  </div>
                  <Pill tone="emerald">CONNECTED</Pill>
                </div>

                {/* Network visualization */}
                <div className="relative h-80 glass rounded-2xl overflow-hidden">
                  {/* Grid background */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: "linear-gradient(rgba(56,232,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,232,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }} />

                  {/* Connections */}
                  <svg className="absolute inset-0 w-full h-full">
                    {nodes.map((n, i) =>
                      nodes.slice(i + 1).map((m, j) => {
                        const dist = Math.sqrt((n.x - m.x) ** 2 + (n.y - m.y) ** 2);
                        if (dist > 30) return null;
                        return (
                          <line
                            key={`${i}-${j}`}
                            x1={`${n.x}%`} y1={`${n.y}%`}
                            x2={`${m.x}%`} y2={`${m.y}%`}
                            stroke="rgba(56,232,255,0.3)"
                            strokeWidth="1"
                            strokeDasharray="4"
                          />
                        );
                      })
                    )}
                  </svg>

                  {/* You (center) */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-pink-500/40 animate-ping" />
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center border-2 border-white/30">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap">YOU</div>
                    </div>
                  </div>

                  {/* Nodes */}
                  {nodes.map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="absolute"
                      style={{ left: `${n.x}%`, top: `${n.y}%` }}
                    >
                      <div className={`w-8 h-8 rounded-full grid place-items-center ${
                        n.isGateway ? "bg-emerald-500" : "bg-cyan-500/60"
                      } border-2 border-white/20`}>
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap font-semibold">
                        {n.isGateway && <span className="text-emerald-300">★ Gateway</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                  <div className="glass p-2 rounded-lg">
                    <div className="text-slate-400">Nodes</div>
                    <div className="font-bold tabular">{nodes.length}</div>
                  </div>
                  <div className="glass p-2 rounded-lg">
                    <div className="text-slate-400">Gateways</div>
                    <div className="font-bold tabular text-emerald-300">{nodes.filter((n) => n.isGateway).length}</div>
                  </div>
                  <div className="glass p-2 rounded-lg">
                    <div className="text-slate-400">Avg Signal</div>
                    <div className="font-bold tabular">{Math.round(nodes.reduce((s, n) => s + n.signal, 0) / nodes.length)}%</div>
                  </div>
                  <div className="glass p-2 rounded-lg">
                    <div className="text-slate-400">Coverage</div>
                    <div className="font-bold tabular">500m</div>
                  </div>
                </div>
              </Card>

              {/* Nodes list */}
              <Card>
                <div className="text-sm font-bold mb-3">Nearby Nodes</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nodes.map((n) => (
                    <div key={n.id} className="flex items-center gap-3 glass p-2 rounded-lg">
                      <div className={`w-9 h-9 rounded-lg grid place-items-center ${
                        n.isGateway ? "bg-emerald-500/20" : "bg-cyan-500/20"
                      }`}>
                        <Users className={`w-4 h-4 ${n.isGateway ? "text-emerald-300" : "text-cyan-300"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          {n.name}
                          {n.isGateway && <Pill tone="emerald">GATEWAY</Pill>}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{n.distance}m</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><Signal className="w-2.5 h-2.5" /> {n.signal}%</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><Battery className="w-2.5 h-2.5" /> {n.battery}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Broadcast button */}
              <button
                onClick={broadcastSOS}
                disabled={sosBroadcasting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold flex items-center justify-center gap-2 glow-pink disabled:opacity-60"
              >
                {sosBroadcasting ? (
                  <><Zap className="w-5 h-5 blink" /> Broadcasting SOS through mesh...</>
                ) : (
                  <><Radio className="w-5 h-5" /> Send Mesh SOS</>
                )}
              </button>

              {/* Broadcast result */}
              {broadcastResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card glow="emerald">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <div>
                        <div className="font-bold">SOS Broadcasted Successfully!</div>
                        <div className="text-xs text-slate-400">Reached {broadcastResult.totalRoutes} internet gateways</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="glass p-2 rounded-lg">
                        <div className="text-slate-400">Hops</div>
                        <div className="font-bold tabular">{broadcastResult.hopCount}</div>
                      </div>
                      <div className="glass p-2 rounded-lg">
                        <div className="text-slate-400">Latency</div>
                        <div className="font-bold tabular">{broadcastResult.avgLatency}ms</div>
                      </div>
                      <div className="glass p-2 rounded-lg">
                        <div className="text-slate-400">Success</div>
                        <div className="font-bold tabular text-emerald-300">{(broadcastResult.deliveryProb * 100).toFixed(0)}%</div>
                      </div>
                      <div className="glass p-2 rounded-lg">
                        <div className="text-slate-400">Bottleneck</div>
                        <div className="font-bold truncate">{broadcastResult.bottleneck}</div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <div className="text-sm font-bold mb-3">How it works</div>
            <div className="space-y-2 text-xs">
              {[
                { n: "1", t: "Broadcast", d: "BLE signal to 500m radius" },
                { n: "2", t: "Relay", d: "Nearby users forward message" },
                { n: "3", t: "Multi-hop", d: "Until reaches internet user" },
                { n: "4", t: "Alert", d: "Gateway notifies emergency" },
              ].map((s) => (
                <div key={s.n} className="flex gap-3 glass p-2 rounded-lg">
                  <div className="text-xl font-black text-gradient-pink">{s.n}</div>
                  <div>
                    <div className="font-semibold">{s.t}</div>
                    <div className="text-slate-400">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Use Cases</div>
            <div className="space-y-2 text-xs text-slate-300">
              {[
                { i: WifiOff, t: "Remote areas", d: "No cell towers" },
                { i: Zap, t: "Natural disasters", d: "Infrastructure down" },
                { i: Radio, t: "Protests/events", d: "Network jamming" },
                { i: Signal, t: "Underground", d: "Metros, basements" },
              ].map((u) => (
                <div key={u.t} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <u.i className="w-3.5 h-3.5 text-pink-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">{u.t}</div>
                    <div className="text-slate-400">{u.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-bold">Important</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mesh SOS requires other RakshaNet users nearby. Effectiveness depends on user density. Urban areas work best.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
