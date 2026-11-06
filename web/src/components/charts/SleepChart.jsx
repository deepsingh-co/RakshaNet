import React, { useState, useEffect } from 'react';

const SleepChart = ({ data }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 500);
    return () => clearTimeout(t);
  }, []);

  if (!data) return null;

  const stages = [
    { key: 'deep', label: 'Deep', color: '#6366f1', icon: '🟣' },
    { key: 'light', label: 'Light', color: '#22d3ee', icon: '🔵' },
    { key: 'rem', label: 'REM', color: '#a78bfa', icon: '🟢' },
    { key: 'awake', label: 'Awake', color: '#f59e0b', icon: '🟡' }
  ];

  const qualityColor = data.qualityScore >= 80 ? '#10b981' : data.qualityScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      {/* Sleep duration header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
            {data.totalHours}<span style={{ fontSize: '1rem', fontWeight: 400, color: '#94a3b8' }}> hrs</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {data.bedTime} → {data.wakeTime}
          </div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 20,
          background: `${qualityColor}20`, color: qualityColor,
          fontSize: '0.8rem', fontWeight: 700
        }}>
          {data.quality} ({data.qualityScore}%)
        </div>
      </div>

      {/* Stacked bar */}
      <div style={{
        display: 'flex', height: 32, borderRadius: 16, overflow: 'hidden',
        background: '#1e293b', marginBottom: 16
      }}>
        {stages.map(s => (
          <div
            key={s.key}
            style={{
              width: animated ? `${data.stages[s.key].percentage}%` : '0%',
              background: s.color,
              transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
              position: 'relative'
            }}
            title={`${s.label}: ${data.stages[s.key].minutes} min`}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {stages.map(s => (
          <div key={s.key} style={{
            background: '#0f172a', borderRadius: 12, padding: '10px 8px',
            textAlign: 'center', border: `1px solid ${s.color}25`
          }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: s.color }}>
              {data.stages[s.key].minutes}<span style={{ fontSize: '0.65rem', fontWeight: 400, color: '#94a3b8' }}> min</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{data.stages[s.key].percentage}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SleepChart;
