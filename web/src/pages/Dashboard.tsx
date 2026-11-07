import { useEffect } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Battery,
  CheckCircle2,
  Flame,
  Heart,
  MapPin,
  Minus,
  Navigation,
  Radio,
  Route,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Users,
} from "lucide-react";
import { useSafetyStore } from "../store/safetyStore";
import { useAuthStore } from "../store/authStore";
import ThreatGauge from "../components/ThreatGauge";
import MapView from "../components/MapView";
import { StatCard } from "../components/ui";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const riskSeries = Array.from({ length: 32 }, (_, i) => ({
  t: `${i * 2}m`,
  risk: Math.round(30 + Math.sin(i / 3) * 18 + Math.random() * 10),
  safe: Math.round(65 - Math.sin(i / 3) * 12 + Math.random() * 6),
}));

const insights = [
  {
    tone: "rose",
    title: "Reroute recommended",
    body: "Your current route passes a flagged zone. Switch to Ring Road for +31% safety.",
  },
  {
    tone: "amber",
    title: "Battery-aware mode",
    body: "At 73% battery, RakshaNet will auto-send your last location if it drops below 10%.",
  },
  {
    tone: "primary",
    title: "Companion nearby",
    body: "Your guardian Rahul is 1.8 km away and actively tracking.",
  },
  {
    tone: "violet",
    title: "Safe shelter ahead",
    body: "A verified, 24/7 staffed shelter is 240 m to your right.",
  },
];

const readiness = [
  ["SOS pipeline", "Armed"],
  ["Guardian relay", "4 online"],
  ["Voice guard", "Listening"],
  ["Offline mesh", "12 peers"],
  ["Location fix", "8 m"],
];

const health = [
  ["Spring Boot", "OK"],
  ["PostgreSQL", "OK"],
  ["FastAPI AI", "OK"],
  ["Twilio", "ARMED"],
  ["WebSocket", "14.2k/s"],
  ["Google Maps", "OK"],
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const {
    riskScore,
    riskLevel,
    confidence,
    currentLocation,
    battery,
    heartbeat,
    speed,
    threatFactors,
    activeAlerts,
    tick,
    startTrackingLocation,
  } = useSafetyStore();

  useEffect(() => {
    if (startTrackingLocation) {
      startTrackingLocation();
    }
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [tick, startTrackingLocation]);

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="rn-dash">
      {/* ── Command hero ─────────────────────────────────────────── */}
      <motion.section
        className="rn-command-hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rn-command-copy">
          <span className="rn-eyebrow">Command deck · live safety intelligence</span>
          <h1 className="rn-display rn-command-title">
            {greeting()}, <em>{firstName}</em>.
          </h1>
          <p className="rn-command-sub">
            Your safety copilot is watching 48 live signals. Everything below starts
            on this device first — the network is a bonus, never a dependency.
          </p>

          <div className="rn-command-actions">
            <Link to="/app/journey" className="rn-btn rn-btn-primary rn-btn-sm">
              <Route className="h-4 w-4" aria-hidden="true" />
              Start a journey
            </Link>
            <Link to="/app/sos" className="rn-btn rn-btn-accent rn-btn-sm">
              <Siren className="h-4 w-4" aria-hidden="true" />
              Open SOS
            </Link>
            <Link to="/app/ai" className="rn-btn rn-btn-ghost rn-btn-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Ask copilot
            </Link>
          </div>

          <div className="rn-command-chips">
            <span className="rn-command-chip">
              <span className="rn-dot" aria-hidden="true" />
              GPS lock · {currentLocation.area}
            </span>
            <span className="rn-command-chip">
              <span className="rn-dot" aria-hidden="true" />
              {riskLevel} risk
            </span>
            <span className="rn-command-chip">
              <ShieldCheck className="h-3 w-3 text-[var(--rn-primary)]" aria-hidden="true" />
              AI confidence {Math.round(confidence)}%
            </span>
            <span className="rn-command-chip">
              <Battery className="h-3 w-3 text-[var(--rn-primary)]" aria-hidden="true" />
              {battery}% device
            </span>
          </div>
        </div>

        <div className="rn-command-radar">
          <div className="rn-radar-shell">
            <ThreatGauge score={riskScore} confidence={confidence} size={176} />
          </div>
          <div className="rn-radar-meta">
            <div className="rn-radar-line is-accent">
              <span>Threat index</span>
              <strong>{riskScore}/100</strong>
            </div>
            <div className="rn-radar-line is-primary">
              <span>Confidence</span>
              <strong>{Math.round(confidence)}%</strong>
            </div>
            <div className="rn-radar-line">
              <span>Active alerts</span>
              <strong>{activeAlerts.length}</strong>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Vitals ───────────────────────────────────────────────── */}
      <section className="rn-kpi-grid" aria-label="Live telemetry">
        <StatCard
          label="Threat index"
          value={
            <>
              {riskScore}
              <small>/100</small>
            </>
          }
          hint={`${riskLevel} risk · ${activeAlerts.length} alerts`}
          icon={<ShieldAlert className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          tone="rose"
          meter={riskScore}
        />
        <StatCard
          label="Heart rate"
          value={
            <>
              {Math.round(heartbeat)}
              <small>bpm</small>
            </>
          }
          hint="Wrist sensor · live"
          icon={<Heart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          tone="rose"
        />
        <StatCard
          label="Movement"
          value={
            <>
              {speed.toFixed(1)}
              <small>m/s</small>
            </>
          }
          hint={speed > 5 ? "Running detected" : "Walking pace"}
          icon={<Activity className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          tone="amber"
        />
        <StatCard
          label="Battery"
          value={
            <>
              {battery}
              <small>%</small>
            </>
          }
          hint={battery < 20 ? "Low power mode" : "Normal"}
          icon={<Battery className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          tone="emerald"
          meter={battery}
        />
      </section>

      {/* ── Bento: map + signals ─────────────────────────────────── */}
      <motion.section
        className="rn-bento"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rn-card rn-span-8">
          <div className="rn-panel-head">
            <div>
              <div className="rn-kicker">Live position</div>
              <h2 className="rn-panel-title flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--rn-primary)]" aria-hidden="true" />
                {currentLocation.area}
              </h2>
              <p className="rn-panel-sub">Last fix just now · accuracy 8 m</p>
            </div>
            <span className="rn-pill is-emerald">
              <span className="rn-dot" aria-hidden="true" />
              GPS lock
            </span>
          </div>

          <div className="rn-panel-body">
            <MapView
              center={[currentLocation.lat, currentLocation.lng]}
              zoom={14}
              height={326}
              markers={[
                {
                  position: [currentLocation.lat, currentLocation.lng],
                  label: "You",
                  kind: "user",
                },
                {
                  position: [currentLocation.lat + 0.008, currentLocation.lng + 0.005],
                  label: "Police Chowki",
                  kind: "police",
                  meta: "ETA 6 min",
                },
                {
                  position: [currentLocation.lat - 0.006, currentLocation.lng + 0.009],
                  label: "Apollo Hospital",
                  kind: "hospital",
                  meta: "1.2 km",
                },
                {
                  position: [currentLocation.lat + 0.004, currentLocation.lng - 0.007],
                  label: "Safe Shelter",
                  kind: "shelter",
                  meta: "Verified",
                },
              ]}
              dangerZones={[
                {
                  center: [currentLocation.lat + 0.009, currentLocation.lng - 0.01],
                  radius: 320,
                  color: "#c23e56",
                  label: "High incident zone",
                },
                {
                  center: [currentLocation.lat - 0.008, currentLocation.lng - 0.012],
                  radius: 220,
                  color: "#c9752a",
                  label: "Poor lighting",
                },
              ]}
            />
          </div>

          <div className="rn-command-chips" style={{ marginTop: "0.8rem" }}>
            <span className="rn-command-chip">
              <Navigation className="h-3 w-3" aria-hidden="true" />
              Heading north · 32 m
            </span>
            <span className="rn-command-chip">
              <Radio className="h-3 w-3" aria-hidden="true" />
              Guardian relay online
            </span>
            <span className="rn-command-chip">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              3 safe points nearby
            </span>
          </div>
        </div>

        <div className="rn-card rn-span-4">
          <div className="rn-panel-head">
            <div>
              <div className="rn-kicker">Six predictors</div>
              <h2 className="rn-panel-title">Threat signals</h2>
              <p className="rn-panel-sub">Higher means more risk right now</p>
            </div>
            <span className="rn-pill is-amber">{threatFactors.length} active</span>
          </div>

          <div className="rn-panel-body">
            {threatFactors.map((factor) => (
              <div key={factor.label} className="rn-factor">
                <div className="rn-factor-top">
                  <span className="rn-factor-label">{factor.label}</span>
                  <span className="rn-factor-value">
                    {factor.value}
                    {factor.trend === "up" ? (
                      <ArrowUpRight
                        className="h-3.5 w-3.5 text-[var(--rn-accent)]"
                        aria-label="trending up"
                      />
                    ) : factor.trend === "down" ? (
                      <ArrowDownRight
                        className="h-3.5 w-3.5 text-[var(--rn-primary)]"
                        aria-label="trending down"
                      />
                    ) : (
                      <Minus
                        className="h-3.5 w-3.5 text-[var(--rn-ink-faint)]"
                        aria-label="steady"
                      />
                    )}
                  </span>
                </div>
                <div
                  className="rn-factor-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={factor.value}
                  aria-label={factor.label}
                >
                  <div className="rn-factor-fill" style={{ width: `${factor.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bento: timeline + alerts ───────────────────────────── */}
        <div className="rn-card rn-span-8">
          <div className="rn-panel-head">
            <div>
              <div className="rn-kicker">Last hour</div>
              <h2 className="rn-panel-title">Risk timeline</h2>
              <p className="rn-panel-sub">AI predictions alongside observed safety</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rn-pill is-rose">
                <span className="rn-dot" aria-hidden="true" />
                Risk
              </span>
              <span className="rn-pill is-emerald">
                <span className="rn-dot" aria-hidden="true" />
                Safety
              </span>
              <span className="rn-pill">
                <span className="rn-dot" aria-hidden="true" />
                Live
              </span>
            </div>
          </div>

          <div className="rn-chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskSeries} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rn-risk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c23e56" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="#c23e56" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rn-safe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0b6b5d" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0b6b5d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(20,34,31,0.1)" vertical={false} />
                <XAxis
                  dataKey="t"
                  stroke="#5c6864"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={7}
                />
                <YAxis
                  stroke="#5c6864"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  cursor={{ stroke: "#d5cbba", strokeDasharray: "4 4" }}
                  contentStyle={{
                    background: "#fffdf8",
                    border: "1px solid #e5ded1",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#14221f",
                    boxShadow: "0 14px 34px -24px rgba(16,43,39,0.35)",
                  }}
                  labelStyle={{ color: "#5c6864", fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  name="Risk"
                  stroke="#c23e56"
                  strokeWidth={2.2}
                  fill="url(#rn-risk)"
                />
                <Area
                  type="monotone"
                  dataKey="safe"
                  name="Safety"
                  stroke="#0b6b5d"
                  strokeWidth={2}
                  fill="url(#rn-safe)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rn-card rn-span-4 flex flex-col">
          <div className="rn-panel-head">
            <div>
              <div className="rn-kicker">Citywide network</div>
              <h2 className="rn-panel-title">Active alerts</h2>
              <p className="rn-panel-sub">{activeAlerts.length} live alerts · newest first</p>
            </div>
            <span className="rn-pill is-rose">
              <span className="rn-dot" aria-hidden="true" />
              Live
            </span>
          </div>

          <div className="rn-panel-body">
            {activeAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="rn-alert-row">
                <span
                  className={`rn-alert-avatar ${
                    alert.level === "CRITICAL"
                      ? "is-critical"
                      : alert.level === "HIGH"
                        ? "is-amber"
                        : ""
                  }`}
                  aria-hidden="true"
                >
                  {alert.avatar}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rn-alert-name">{alert.user}</span>
                    <span
                      className={`rn-pill ${
                        alert.level === "CRITICAL"
                          ? "is-rose"
                          : alert.level === "HIGH"
                            ? "is-amber"
                            : "is-emerald"
                      }`}
                    >
                      {alert.level}
                    </span>
                  </div>
                  <div className="rn-alert-meta">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {alert.area} · {alert.trigger}
                    </span>
                  </div>
                </div>

                <div className="rn-alert-stats">
                  <div className="rn-alert-confidence">{alert.confidence}%</div>
                  <div>{alert.time}</div>
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/app/community"
            className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-[var(--rn-primary-strong)] hover:underline"
          >
            Open community intel
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* ── Bento: copilot + readiness ─────────────────────────── */}
        <div className="rn-card rn-span-7 flex flex-col">
          <div className="rn-panel-head">
            <div>
              <div className="rn-kicker">Personalized</div>
              <h2 className="rn-panel-title">AI safety copilot</h2>
              <p className="rn-panel-sub">What matters in the next 10 minutes</p>
            </div>
            <span className="rn-kpi-icon" style={{ "--tone": "var(--rn-primary)" } as CSSProperties}>
              <Sparkles className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </span>
          </div>

          <div className="rn-panel-body">
            {insights.map((insight) => (
              <div key={insight.title} className="rn-insight">
                <span
                  className={`rn-insight-dot ${
                    insight.tone === "primary" ? "" : `is-${insight.tone}`
                  }`.trim()}
                  aria-hidden="true"
                />
                <div>
                  <div className="rn-insight-title">{insight.title}</div>
                  <p className="rn-insight-body">{insight.body}</p>
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/app/ai"
            className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-[var(--rn-primary-strong)] hover:underline"
          >
            Ask the copilot
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="rn-card rn-span-5 flex flex-col">
          <div className="rn-panel-head">
            <div>
              <div className="rn-kicker">Operational readiness</div>
              <h2 className="rn-panel-title">Everything armed</h2>
              <p className="rn-panel-sub">Checked every 1.5 seconds on this device</p>
            </div>
            <span className="rn-pill is-emerald">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              All clear
            </span>
          </div>

          <div className="rn-readiness mt-3">
            {readiness.map(([label, value]) => (
              <div key={label} className="rn-ready-row">
                <span>{label}</span>
                <strong>
                  <span className="rn-dot" aria-hidden="true" />
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="rn-kicker" style={{ marginBottom: "0.45rem" }}>
              Service mesh
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {health.map(([name, value]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-[var(--rn-border)] bg-[var(--rn-bg-soft)] px-2 py-1.5"
                >
                  <span className="text-[10px] text-[var(--rn-ink-faint)]">{name}</span>
                  <span className="text-[10px] font-semibold text-[var(--rn-primary-strong)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-[10px] text-[var(--rn-ink-faint)]">
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-[var(--rn-accent)]" aria-hidden="true" />
              No critical incidents
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[var(--rn-violet)]" aria-hidden="true" />
              <strong className="text-[var(--rn-primary-strong)]">2,417</strong> guardians
            </span>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
