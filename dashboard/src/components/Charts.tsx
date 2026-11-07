import { formatDay, percent, titleCase } from '../lib/format';
import type { Tone } from './ui';

const TONE_COLORS: Record<string, string> = {
  slate: '#8ea3bb',
  blue: '#5aa9ff',
  teal: '#2dd4bf',
  green: '#3ddc97',
  orange: '#ff9f5a',
  amber: '#f7c948',
  red: '#ff6b6b',
  purple: '#b197fc',
};

export function toneColor(tone?: string): string {
  return TONE_COLORS[tone ?? 'slate'] ?? TONE_COLORS.slate;
}

/* ------------------------------------------------------------------ */
/* Trend chart                                                        */
/* ------------------------------------------------------------------ */

export function TrendChart({
  data,
  height = 200,
  tone = 'blue',
  label = 'incidents',
}: {
  data: { date: string; count: number }[];
  height?: number;
  tone?: Tone;
  label?: string;
}) {
  if (data.length === 0) {
    return <p className="chart-empty">No {label} in this period.</p>;
  }

  const width = 640;
  const padding = { top: 18, right: 16, bottom: 28, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...data.map((point) => point.count));
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const x = (index: number) => padding.left + index * step;
  const y = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight;

  const linePoints = data.map((point, index) => `${x(index)},${y(point.count)}`).join(' ');
  const areaPoints = `${padding.left},${padding.top + plotHeight} ${linePoints} ${
    padding.left + plotWidth
  },${padding.top + plotHeight}`;
  const color = toneColor(tone);

  const grid = [0, 0.25, 0.5, 0.75, 1];
  const labelIndexes = new Set<number>([
    0,
    Math.floor((data.length - 1) / 2),
    data.length - 1,
  ]);

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} trend over ${data.length} days`}
      >
        <defs>
          <linearGradient id={`trend-fill-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.24" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {grid.map((fraction) => {
          const value = Math.round(maxValue * (1 - fraction));
          const gridY = padding.top + plotHeight * fraction;
          return (
            <g key={fraction}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={gridY}
                y2={gridY}
                className="chart-grid"
              />
              <text x={padding.left - 8} y={gridY + 3} textAnchor="end" className="chart-axis">
                {value}
              </text>
            </g>
          );
        })}
        <polygon points={areaPoints} fill={`url(#trend-fill-${tone})`} />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2.4" />
        {data.map((point, index) =>
          data.length <= 31 ? (
            <circle key={point.date} cx={x(index)} cy={y(point.count)} r="2.6" fill={color} />
          ) : null,
        )}
        {data.map((point, index) =>
          labelIndexes.has(index) ? (
            <text
              key={`label-${point.date}`}
              x={x(index)}
              y={height - 8}
              textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
              className="chart-axis"
            >
              {formatDay(point.date)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut                                                              */
/* ------------------------------------------------------------------ */

export function DonutChart({
  data,
  centerLabel = 'total',
}: {
  data: { label: string; value: number; tone?: string }[];
  centerLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return <p className="chart-empty">Nothing recorded yet.</p>;
  }

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 160 160" className="donut" role="img" aria-label="Status distribution">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#1c2c3f"
          strokeWidth="18"
          className="donut-track"
        />
        {data.map((item) => {
          const fraction = item.value / total;
          const dash = fraction * circumference;
          const offset = -accumulated * circumference;
          accumulated += fraction;
          return (
            <circle
              key={item.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={toneColor(item.tone)}
              strokeWidth="18"
              strokeDasharray={`${Math.max(0, dash - 1.5)} ${circumference}`}
              strokeDashoffset={offset}
              transform="rotate(-90 80 80)"
              strokeLinecap="butt"
            />
          );
        })}
        <text x="80" y="76" textAnchor="middle" className="donut-total">
          {total}
        </text>
        <text x="80" y="94" textAnchor="middle" className="donut-label">
          {centerLabel}
        </text>
      </svg>
      <ul className="donut-legend">
        {data.map((item) => (
          <li key={item.label}>
            <span
              className="legend-swatch"
              style={{ background: toneColor(item.tone) }}
              aria-hidden="true"
            />
            <span className="legend-label">{item.label}</span>
            <span className="legend-value">{item.value}</span>
            <span className="legend-pct">{percent(item.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bar list                                                           */
/* ------------------------------------------------------------------ */

export function BarList({
  data,
  tone = 'blue',
}: {
  data: { label: string; value: number; tone?: string }[];
  tone?: Tone;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <p className="chart-empty">Nothing recorded yet.</p>;
  return (
    <ul className="bar-list">
      {data.map((item) => (
        <li key={item.label}>
          <div className="bar-list-head">
            <span>{titleCase(item.label)}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${Math.max(2, percent(item.value, total))}%`,
                background: toneColor(item.tone ?? tone),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Delivery truth                                                     */
/* ------------------------------------------------------------------ */

export function DeliveryBar({
  delivered,
  sent,
  queued,
  failed,
  simulated = 0,
}: {
  delivered: number;
  sent: number;
  queued: number;
  failed: number;
  simulated?: number;
}) {
  const total = delivered + sent + queued + failed;
  if (total === 0) {
    return <p className="chart-empty">No notifications dispatched yet.</p>;
  }
  const segments = [
    { label: 'Delivered', value: delivered, color: TONE_COLORS.green },
    { label: 'Sent (accepted)', value: sent, color: TONE_COLORS.teal },
    { label: 'Queued', value: queued, color: TONE_COLORS.blue },
    { label: 'Failed', value: failed, color: TONE_COLORS.red },
  ];

  return (
    <div className="delivery">
      <div className="delivery-bar" role="img" aria-label="Notification delivery breakdown">
        {segments.map((segment) =>
          segment.value > 0 ? (
            <span
              key={segment.label}
              style={{
                width: `${(segment.value / total) * 100}%`,
                background: segment.color,
              }}
              title={`${segment.label}: ${segment.value}`}
            />
          ) : null,
        )}
      </div>
      <ul className="delivery-legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span className="legend-swatch" style={{ background: segment.color }} />
            {segment.label}
            <strong>{segment.value}</strong>
          </li>
        ))}
      </ul>
      {simulated > 0 ? (
        <p className="delivery-note">
          {simulated} of these were console-mode simulations. They were never sent to a real
          phone — do not read them as real-world delivery.
        </p>
      ) : null}
    </div>
  );
}
