import React, { useState, useEffect } from 'react';

const ActivityRing = ({ percentage = 0, size = 160, strokeWidth = 14, color = '#10b981', bgColor = '#f1f5f9', label = 'Steps', value = '0', subtitle = 'of 10,000' }) => {
  const [animatedPct, setAnimatedPct] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPct / 100) * circumference;
  const center = size / 2;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(Math.min(percentage, 100)), 300);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} opacity={0.3} />
        {/* Progress ring */}
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 6px ${color}50)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>{subtitle}</span>
        <span style={{ fontSize: '0.65rem', color: color, fontWeight: 600, marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );
};

export default ActivityRing;
