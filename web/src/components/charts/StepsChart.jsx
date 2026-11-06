import React, { useState, useEffect } from 'react';

const StepsChart = ({ data = [], height = 200 }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!data.length) return null;

  const maxSteps = Math.max(...data.map(d => d.steps), data[0]?.goal || 10000);
  const barWidth = 36;
  const gap = 14;
  const svgWidth = data.length * (barWidth + gap) + 40;
  const padding = { top: 20, bottom: 40, left: 10 };
  const chartH = height - padding.top - padding.bottom;

  const getBarH = (val) => animated ? (val / maxSteps) * chartH : 0;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width={svgWidth} height={height} viewBox={`0 0 ${svgWidth} ${height}`} style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="stepBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <linearGradient id="stepBarGoal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Goal line */}
        {data[0]?.goal && (
          <g>
            <line
              x1={0} y1={padding.top + chartH - (data[0].goal / maxSteps) * chartH}
              x2={svgWidth} y2={padding.top + chartH - (data[0].goal / maxSteps) * chartH}
              stroke="#f59e0b" strokeWidth={1} strokeDasharray="6,4" opacity={0.6}
            />
            <text x={svgWidth - 5} y={padding.top + chartH - (data[0].goal / maxSteps) * chartH - 5} fontSize={9} fill="#f59e0b" textAnchor="end" fontWeight={600}>
              Goal: {(data[0].goal / 1000).toFixed(0)}K
            </text>
          </g>
        )}

        {data.map((d, i) => {
          const x = padding.left + i * (barWidth + gap) + gap / 2;
          const barH = getBarH(d.steps);
          const y = padding.top + chartH - barH;
          const metGoal = d.steps >= (d.goal || 10000);

          return (
            <g key={i}>
              {/* Bar background */}
              <rect x={x} y={padding.top} width={barWidth} height={chartH} rx={8} fill="#1e293b" opacity={1} />
              {/* Bar */}
              <rect
                x={x} y={y} width={barWidth} height={barH} rx={8}
                fill={metGoal ? 'url(#stepBarGoal)' : 'url(#stepBarGrad)'}
                style={{ transition: 'height 1s cubic-bezier(0.4,0,0.2,1), y 1s cubic-bezier(0.4,0,0.2,1)' }}
              />
              {/* Value label */}
              {animated && (
                <text x={x + barWidth / 2} y={y - 6} fontSize={10} fill="#ffffff" textAnchor="middle" fontWeight={600}>
                  {(d.steps / 1000).toFixed(1)}K
                </text>
              )}
              {/* Day label */}
              <text x={x + barWidth / 2} y={height - 20} fontSize={11} fill="#94a3b8" textAnchor="middle" fontWeight={500}>
                {d.day}
              </text>
              <text x={x + barWidth / 2} y={height - 6} fontSize={8} fill="#64748b" textAnchor="middle">
                {d.date}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default StepsChart;
