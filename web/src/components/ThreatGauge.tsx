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
    if (score >= 80) return { a: "#ff3d7f", b: "#ff8a3d" };
    if (score >= 60) return { a: "#ff8a3d", b: "#ffb020" };
    if (score >= 35) return { a: "#ffb020", b: "#38e8ff" };
    return { a: "#2ee6a6", b: "#38e8ff" };
  }, [score]);

  const gradId = `tg-${score}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradient.a} />
            <stop offset="100%" stopColor={gradient.b} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={12} fill="none" />
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
          <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Threat</div>
          <div className="text-4xl font-bold tabular text-glow-pink">{score}</div>
          <div className="text-[11px] text-slate-400">/ 100</div>
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" />
            AI {Math.round(confidence)}%
          </div>
        </div>
      </div>
    </div>
  );
}
