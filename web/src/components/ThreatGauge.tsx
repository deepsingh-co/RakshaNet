import { useMemo } from "react";
import type { RiskLevel } from "../store/safetyStore";

export default function ThreatGauge({
  score,
  confidence,
  size = 220,
}: {
  score: number;
  level?: RiskLevel;
  confidence: number;
  size?: number;
}) {
  const radius = size / 2 - 18;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const gradient = useMemo(() => {
    if (score >= 80) return { a: "#c23e56", b: "#e0714f" };
    if (score >= 60) return { a: "#c9752a", b: "#c58a25" };
    if (score >= 35) return { a: "#c58a25", b: "#0b6b5d" };
    return { a: "#0b6b5d", b: "#17967f" };
  }, [score]);

  const gradId = `tg-${score}`;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Threat score ${score} out of 100, AI confidence ${Math.round(confidence)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradient.a} />
            <stop offset="100%" stopColor={gradient.b} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(20,34,31,0.08)"
          strokeWidth={12}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--rn-ink-faint)]">
            Threat
          </div>
          <div className="text-4xl font-bold tabular text-[var(--rn-ink)]">
            {score}
          </div>
          <div className="text-[11px] text-[var(--rn-ink-faint)]">
            / 100
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--rn-border)] bg-[var(--rn-bg-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--rn-ink-soft)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--rn-emerald)]" />
            AI {Math.round(confidence)}%
          </div>
        </div>
      </div>
    </div>
  );
}
