import type { CSSProperties, ReactNode } from "react";

export function StatCard({
  label, value, hint, icon, tone = "cyan",
}: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: "pink" | "cyan" | "amber" | "emerald" | "violet" }) {
  const tones: Record<string, string> = {
    pink: "var(--aegis-primary)",
    cyan: "var(--aegis-accent)",
    amber: "var(--aegis-warning)",
    emerald: "var(--aegis-secondary)",
    violet: "var(--aegis-violet)",
  };
  const toneColor = tones[tone];
  return (
    <div className="glass relative overflow-hidden p-5 rounded-2xl" style={{ color: toneColor, borderColor: `color-mix(in srgb, ${toneColor} 28%, transparent)`, background: `linear-gradient(135deg, color-mix(in srgb, ${toneColor} 14%, var(--aegis-card)), var(--aegis-card))` }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "var(--aegis-text-secondary)" }}>{label}</div>
          <div className="mt-1 text-3xl font-bold tabular" style={{ color: "var(--aegis-text-primary)" }}>{value}</div>
          {hint && <div className="mt-1 text-[11px]" style={{ color: "var(--aegis-text-secondary)" }}>{hint}</div>}
        </div>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-2xl" style={{ background: `color-mix(in srgb, ${toneColor} 10%, transparent)` }} />
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold tracking-tight" style={{ color: "var(--aegis-text-primary)" }}>{title}</h2>
        {subtitle && <p className="text-sm mt-1" style={{ color: "var(--aegis-text-secondary)" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, glow, className = "" }: { children: ReactNode; glow?: "pink" | "cyan" | "amber" | "emerald" | "red" | "blue"; className?: string }) {
  const glowMap: Record<string, string> = {
    pink: "glow-pink",
    cyan: "glow-cyan",
    amber: "glow-amber",
    emerald: "glow-cyan",
    red: "glow-pink",
    blue: "glow-cyan",
  };
  return (
    <div className={`glass-strong p-5 rounded-2xl ${glow ? glowMap[glow] : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "pink" | "cyan" | "amber" | "emerald" | "violet" | "slate" }) {
  const tones: Record<string, CSSProperties> = {
    pink: { color: "var(--aegis-primary)", background: "color-mix(in srgb, var(--aegis-primary) 12%, transparent)", borderColor: "color-mix(in srgb, var(--aegis-primary) 32%, transparent)" },
    cyan: { color: "var(--aegis-accent)", background: "color-mix(in srgb, var(--aegis-accent) 12%, transparent)", borderColor: "color-mix(in srgb, var(--aegis-accent) 32%, transparent)" },
    amber: { color: "var(--aegis-warning)", background: "color-mix(in srgb, var(--aegis-warning) 12%, transparent)", borderColor: "color-mix(in srgb, var(--aegis-warning) 32%, transparent)" },
    emerald: { color: "var(--aegis-secondary)", background: "color-mix(in srgb, var(--aegis-secondary) 12%, transparent)", borderColor: "color-mix(in srgb, var(--aegis-secondary) 32%, transparent)" },
    violet: { color: "var(--aegis-violet)", background: "color-mix(in srgb, var(--aegis-violet) 12%, transparent)", borderColor: "color-mix(in srgb, var(--aegis-violet) 32%, transparent)" },
    slate: { color: "var(--aegis-text-secondary)", background: "var(--aegis-surface)", borderColor: "var(--aegis-border)" },
  };
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border" style={tones[tone]}>{children}</span>;
}
