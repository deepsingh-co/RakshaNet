import type { CSSProperties, ReactNode } from "react";

/* ── Shared app primitives · Calm signal ─────────────────────────────
   These read the .rn-shell design tokens so the shell, dashboard and
   feature pages stay in one visual language: warm paper, evergreen,
   rose accents and Fraunces display type. */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "primary",
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: "primary" | "rose" | "amber" | "violet" | "emerald";
}) {
  return (
    <header className={`rn-page-head is-${tone}`}>
      <div>
        <span className="rn-eyebrow">{eyebrow}</span>
        <h1 className="rn-display rn-page-title">{title}</h1>
        {description && <p className="rn-page-lede">{description}</p>}
      </div>
      {actions && <div className="rn-page-actions">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  meter,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "pink" | "cyan" | "amber" | "emerald" | "violet" | "primary" | "rose";
  meter?: number;
}) {
  const tones: Record<string, string> = {
    pink: "var(--rn-accent)",
    rose: "var(--rn-accent)",
    cyan: "var(--rn-primary)",
    primary: "var(--rn-primary)",
    amber: "var(--rn-amber)",
    emerald: "var(--rn-emerald)",
    violet: "var(--rn-violet)",
  };
  const toneColor = tones[tone] || tones.primary;
  return (
    <div className="rn-kpi" style={{ "--tone": toneColor } as CSSProperties}>
      <div className="rn-kpi-top">
        <div>
          <div className="rn-kpi-label">{label}</div>
          <div className="rn-kpi-value">{value}</div>
          {hint && <div className="rn-kpi-hint">{hint}</div>}
        </div>
        {icon && <span className="rn-kpi-icon">{icon}</span>}
      </div>
      {typeof meter === "number" && (
        <div
          className="rn-kpi-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.max(0, Math.min(100, Math.round(meter)))}
          aria-label={label}
        >
          <span style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
        </div>
      )}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="rn-panel-head" style={{ marginBottom: "1rem" }}>
      <div>
        <h2 className="rn-panel-title" style={{ fontSize: "1.2rem" }}>{title}</h2>
        {subtitle && <p className="rn-panel-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, glow, className = "" }: { children: ReactNode; glow?: "pink" | "cyan" | "amber" | "emerald"; className?: string }) {
  return (
    <div className={`rn-card p-5 ${glow ? `glow-${glow}` : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "pink" | "cyan" | "amber" | "emerald" | "violet" | "slate" }) {
  const toneMap: Record<string, string> = {
    pink: "is-rose",
    cyan: "is-emerald",
    amber: "is-amber",
    emerald: "is-emerald",
    violet: "is-violet",
    slate: "",
  };
  return <span className={`rn-pill ${toneMap[tone] || ""}`.trim()}>{children}</span>;
}
