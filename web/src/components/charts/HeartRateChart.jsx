import React, { useState, useEffect } from 'react';

const HeartRateChart = ({ data = [], width = 700, height = 220 }) => {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!data.length) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map(d => d.value);
  const minVal = Math.max(40, Math.min(...values) - 5);
  const maxVal = Math.min(180, Math.max(...values) + 10);

  const getX = (i) => padding.left + (i / (data.length - 1)) * chartW;
  const getY = (val) => padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  // Build the path
  let linePath = `M ${getX(0)} ${getY(data[0].value)}`;
  for (let i = 1; i < data.length; i++) {
    linePath += ` L ${getX(i)} ${getY(data[i].value)}`;
  }

  // Area path for gradient fill
  const areaPath = linePath + ` L ${getX(data.length - 1)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`;

  // Zone colors
  const getZoneColor = (val) => {
    if (val < 60) return '#6366f1';
    if (val < 100) return '#10b981';
    if (val < 140) return '#f59e0b';
    return '#ef4444';
  };

  // Y-axis labels
  const yLabels = [];
  const step = Math.ceil((maxVal - minVal) / 5);
  for (let v = minVal; v <= maxVal; v += step) {
    yLabels.push(v);
  }

  // X-axis: show every 4th hour label
  const xLabels = data.filter((_, i) => i % 16 === 0 || i === data.length - 1);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="hrLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="30%" stopColor="#10b981" />
            <stop offset="70%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map(v => (
          <g key={v}>
            <line x1={padding.left} y1={getY(v)} x2={padding.left + chartW} y2={getY(v)} stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
            <text x={padding.left - 8} y={getY(v) + 4} fontSize={10} fill="#94a3b8" textAnchor="end">{v}</text>
          </g>
        ))}

        {/* Zone bands */}
        <rect x={padding.left} y={getY(100)} width={chartW} height={getY(60) - getY(100)} fill="#10b981" opacity={0.05} rx={4} />
        <rect x={padding.left} y={getY(140)} width={chartW} height={getY(100) - getY(140)} fill="#f59e0b" opacity={0.05} rx={4} />

        {/* Area fill */}
        <path d={areaPath} fill="url(#hrGradient)" style={{ opacity: animated ? 1 : 0, transition: 'opacity 1s ease' }} />

        {/* Line */}
        <path
          d={linePath} fill="none" stroke="url(#hrLineGrad)" strokeWidth={2}
          style={{
            strokeDasharray: animated ? 'none' : chartW * 5,
            strokeDashoffset: animated ? 0 : chartW * 5,
            transition: 'stroke-dashoffset 2s ease'
          }}
        />

        {/* Current value dot */}
        {animated && data.length > 0 && (
          <g>
            <circle
              cx={getX(data.length - 1)} cy={getY(data[data.length - 1].value)} r={5}
              fill={getZoneColor(data[data.length - 1].value)} stroke="#ffffff" strokeWidth={2}
            >
              <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
            </circle>
            <text x={getX(data.length - 1)} y={getY(data[data.length - 1].value) - 12} fontSize={11} fill="#ffffff" textAnchor="middle" fontWeight={700}>
              {data[data.length - 1].value} bpm
            </text>
          </g>
        )}

        {/* X-axis labels */}
        {xLabels.map((d, idx) => {
          const i = data.indexOf(d);
          return (
            <text key={idx} x={getX(i)} y={height - 5} fontSize={10} fill="#94a3b8" textAnchor="middle">{d.hour}</text>
          );
        })}
      </svg>
    </div>
  );
};

export default HeartRateChart;
