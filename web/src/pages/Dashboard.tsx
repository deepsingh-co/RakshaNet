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
  Flame,
  Heart,
  MapPin,
  Minus,
  Route,
  ShieldAlert,
  Siren,
  Sparkles,
  Users,
} from "lucide-react";
import { useSafetyStore } from "../store/safetyStore";
import { useAuthStore } from "../store/authStore";
import ThreatGauge from "../components/ThreatGauge";
import MapView from "../components/MapView";
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

const metricColor = (color: string) => ({ "--rn-metric-color": color } as CSSProperties);

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

const health = [
  ["Spring Boot", "OK"],
  ["PostgreSQL", "OK"],
  ["FastAPI AI", "OK"],
  ["Twilio", "ARMED"],
  ["WebSocket", "14.2k msgs/s"],
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
  const trendTone =
    riskLevel === "CRITICAL" || riskLevel === "HIGH"
      ? "is-rose"
      : riskLevel === "MEDIUM"
        ? "is-amber"
        : "is-emerald";

  return (
    <div className="rn-page">
      <div className="space-y-5">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="rn-dash-head">
          <div>
            <span className="rn-eyebrow">Command deck</span>
            <h1 className="rn-display rn-dash-title">
              {greeting()}, <em>{firstName}</em>
            </h1>
            <p className="rn-dash-sub">
              Your safety copilot is watching 48 live signals. Everything below is
              aggregated from this device first — the network is a bonus, not a
              dependency.
            </p>
          </div>

          <div className="rn-dash-actions">
            <span className={`rn-pill ${trendTone}`}>
              <span className="rn-dot" aria-hidden="true" />
              {riskLevel} risk
            </span>
            <span className="rn-pill is-emerald">
              <span className="rn-dot" aria-hidden="true" />
              AI active
            </span>
            <Link to="/app/journey" className="rn-btn rn-btn-ghost rn-btn-sm">
              <Route className="h-4 w-4" aria-hidden="true" />
              Start a journey
            </Link>
            <Link to="/app/sos" className="rn-btn rn-btn-accent rn-btn-sm">
              <Siren className="h-4 w-4" aria-hidden="true" />
              Open SOS
            </Link>
          </div>
        </div>

        {/* ── Metrics ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rn-metric" style={metricColor("#c23e56")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="rn-metric-label">Threat score</div>
                <div className="rn-metric-value">
                  {riskScore}
                  <span className="ml-1 text-sm font-medium text-[var(--rn-ink-faint)]">/100</span>
                </div>
                <div className="rn-metric-hint">Confidence {Math.round(confidence)}%</div>
              </div>
              <span className="rn-metric-icon">
                <ShieldAlert className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="rn-metric" style={metricColor("#0b6b5d")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="rn-metric-label">Heart rate</div>
                <div className="rn-metric-value">
                  {Math.round(heartbeat)}
                  <span className="ml-1 text-sm font-medium text-[var(--rn-ink-faint)]">bpm</span>
                </div>
                <div className="rn-metric-hint">Wrist sensor</div>
              </div>
              <span className="rn-metric-icon">
                <Heart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="rn-metric" style={metricColor("#c58a25")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="rn-metric-label">Speed</div>
                <div className="rn-metric-value">
                  {speed.toFixed(1)}
                  <span className="ml-1 text-sm font-medium text-[var(--rn-ink-faint)]">m/s</span>
                </div>
                <div className="rn-metric-hint">{speed > 5 ? "Running detected" : "Walking pace"}</div>
              </div>
              <span className="rn-metric-icon">
                <Activity className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="rn-metric" style={metricColor("#6d5a8a")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="rn-metric-label">Battery</div>
                <div className="rn-metric-value">
                  {battery}
                  <span className="ml-1 text-sm font-medium text-[var(--rn-ink-faint)]">%</span>
                </div>
                <div className="rn-metric-hint">{battery < 20 ? "Low power mode" : "Normal"}</div>
              </div>
              <span className="rn-metric-icon">
                <Battery className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>

        {/* ── Hero: gauge + map ──────────────────────────────────── */}
        <div className="rn-hero-grid">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rn-card"
          >
            <div className="rn-card-head">
              <div>
                <div className="rn-kicker">Real-time risk</div>
                <div className="rn-card-title">{riskLevel} risk</div>
                <div className="rn-card-sub">Aggregated from six live predictors</div>
              </div>
              <span className={`rn-pill ${trendTone}`}>{riskLevel}</span>
            </div>

            <div className="rn-risk-shell mt-3">
              <ThreatGauge score={riskScore} confidence={confidence} size={212} light />
            </div>

            <p className="rn-risk-note">
              Crime density, lighting, crowd, time, route deviation and community
              intel — recomputed every 1.5 seconds.
            </p>
          </motion.div>

          <div className="rn-card">
            <div className="rn-card-head mb-3">
              <div>
                <div className="rn-kicker">Live position</div>
                <div className="rn-card-title flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--rn-primary)]" aria-hidden="true" />
                  {currentLocation.area}
                </div>
                <div className="rn-card-sub">Last fix just now · accuracy 8 m</div>
              </div>
              <span className="rn-pill is-emerald">
                <span className="rn-dot" aria-hidden="true" />
                GPS lock
              </span>
            </div>

            <MapView
              center={[currentLocation.lat, currentLocation.lng]}
              zoom={14}
              height={340}
              light
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
                  color: "#c58a25",
                  label: "Poor lighting",
                },
              ]}
            />
          </div>
        </div>

        {/* ── Mid: timeline + factors ────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rn-card lg:col-span-2">
            <div className="rn-card-head">
              <div>
                <div className="rn-kicker">Last hour</div>
                <div className="rn-card-title">Risk timeline</div>
                <div className="rn-card-sub">AI predictions alongside observed safety</div>
              </div>
              <span className="rn-pill is-emerald">
                <span className="rn-dot" aria-hidden="true" />
                Live
              </span>
            </div>

            <div className="rn-chart-frame">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskSeries} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rn-risk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c23e56" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#c23e56" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rn-safe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0b6b5d" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#0b6b5d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="#e5ded1" vertical={false} />
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

          <div className="rn-card">
            <div className="rn-card-head">
              <div>
                <div className="rn-kicker">Six predictors</div>
                <div className="rn-card-title">Threat signals</div>
                <div className="rn-card-sub">Higher means more risk right now</div>
              </div>
              <span className="rn-pill is-amber">{threatFactors.length} active</span>
            </div>

            <div className="mt-3">
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
        </div>

        {/* ── Bottom: alerts + insights ──────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rn-card lg:col-span-2">
            <div className="rn-card-head">
              <div>
                <div className="rn-kicker">Citywide network</div>
                <div className="rn-card-title">Active alerts</div>
                <div className="rn-card-sub">
                  {activeAlerts.length} live alerts · newest first
                </div>
              </div>
              <span className="rn-pill is-rose">
                <span className="rn-dot" aria-hidden="true" />
                Escalating
              </span>
            </div>

            <div className="mt-3">
              {activeAlerts.slice(0, 4).map((alert) => (
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

                  <div className="min-w-0">
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
                      {alert.status === "ESCALATED" && (
                        <span className="rn-pill is-rose">Escalated</span>
                      )}
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
                    <div>confidence</div>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <span className="inline-flex items-center gap-0.5">
                        <Heart className="h-3 w-3 text-[var(--rn-accent)]" aria-hidden="true" />
                        {alert.heartbeat}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Battery className="h-3 w-3" aria-hidden="true" />
                        {alert.battery}%
                      </span>
                    </div>
                  </div>

                  <span className="hidden shrink-0 self-start text-[11px] text-[var(--rn-ink-faint)] sm:block">
                    {alert.time}
                  </span>
                </div>
              ))}
            </div>

            <Link
              to="/app/community"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--rn-primary-strong)] hover:underline"
            >
              Open community intel
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="rn-card">
            <div className="rn-card-head">
              <div>
                <div className="rn-kicker">Personalized</div>
                <div className="rn-card-title">AI safety copilot</div>
                <div className="rn-card-sub">What matters in the next 10 minutes</div>
              </div>
              <span className="rn-metric-icon" style={metricColor("#0b6b5d")}>
                <Sparkles className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>

            <div className="mt-3">
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
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--rn-primary-strong)] hover:underline"
            >
              Ask the copilot
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ── System health ──────────────────────────────────────── */}
        <div className="rn-health">
          <span className="rn-health-item">
            <Route className="h-3.5 w-3.5 text-[var(--rn-primary)]" aria-hidden="true" />
            <strong>System health</strong>
          </span>
          {health.map(([name, value]) => (
            <span key={name} className="rn-health-item">
              {name}
              <strong>{value}</strong>
            </span>
          ))}
          <span className="rn-health-item ml-auto">
            <Flame className="h-3.5 w-3.5 text-[var(--rn-accent)]" aria-hidden="true" />
            <strong>All clear</strong>
          </span>
          <span className="rn-health-item">
            <Users className="h-3.5 w-3.5 text-[var(--rn-violet)]" aria-hidden="true" />
            <strong>2,417</strong> guardians
          </span>
        </div>
      </div>
    </div>
  );
}
