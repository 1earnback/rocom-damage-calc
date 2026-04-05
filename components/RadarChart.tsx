'use client';

import React from 'react';

interface RadarChartProps {
  stats: {
    hp: number;
    atk: number;
    def: number;
    spatk: number;
    spdef: number;
    speed: number;
  };
  statsNames?: {
    hp?: string;
    atk?: string;
    def?: string;
    spatk?: string;
    spdef?: string;
    speed?: string;
  };
  size?: number;
  className?: string;
}

const RadarChart: React.FC<RadarChartProps> = ({
  stats,
  statsNames = {
    hp: '生命',
    atk: '物攻',
    def: '物防',
    spatk: '特攻',
    spdef: '特防',
    speed: '速度',
  },
  size = 220,
  className = '',
}) => {
  const center = size / 2;
  const radius = (size / 2) * 0.8;
  const angleStep = Math.PI / 3;

  const allStats = [stats.hp, stats.atk, stats.def, stats.spatk, stats.spdef, stats.speed];
  const maxStat = Math.max(...allStats);
  const scaleFactor = maxStat > 0 ? radius / maxStat : 1;

  const getPoint = (statIndex: number, value: number | null) => {
    const angle = angleStep * statIndex - Math.PI / 2;
    const r = value !== null ? value * scaleFactor : radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const generateHexagonPath = (scale: number) => {
    let path = '';
    for (let i = 0; i < 6; i++) {
      const point = getPoint(i, null);
      const scaledX = center + (point.x - center) * scale;
      const scaledY = center + (point.y - center) * scale;
      if (i === 0) {
        path += `M ${scaledX} ${scaledY}`;
      } else {
        path += ` L ${scaledX} ${scaledY}`;
      }
    }
    path += ' Z';
    return path;
  };

  const statsArray = [stats.hp, stats.spatk, stats.spdef, stats.speed, stats.def, stats.atk];
  const dataPath = statsArray.reduce((path, stat, i) => {
    const point = getPoint(i, stat);
    if (i === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${path} L ${point.x} ${point.y}`;
  }, '') + ' Z';

  const labelPositions = [
    { x: center, y: center - radius - 16, text: statsNames.hp || '生命', value: stats.hp },
    { x: center + radius * 0.866, y: center - radius * 0.5 - 12, text: statsNames.spatk || '特攻', value: stats.spatk },
    { x: center + radius * 0.866, y: center + radius * 0.5 - 4, text: statsNames.spdef || '特防', value: stats.spdef },
    { x: center, y: center + radius - 8, text: statsNames.speed || '速度', value: stats.speed },
    { x: center - radius * 0.866, y: center + radius * 0.5 - 4, text: statsNames.def || '物防', value: stats.def },
    { x: center - radius * 0.866, y: center - radius * 0.5 - 12, text: statsNames.atk || '物攻', value: stats.atk },
  ];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
        {[0.33, 0.66, 1].map((scale, i) => (
          <path
            key={`grid-${i}`}
            d={generateHexagonPath(scale)}
            fill="none"
            stroke="#ffffff"
            strokeWidth={i === 2 ? 2 : 1}
            opacity={i === 2 ? 0.6 : 0.3}
          />
        ))}

        {Array.from({ length: 6 }).map((_, i) => {
          const point = getPoint(i, null);
          return (
            <line
              key={`ray-${i}`}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="#ffffff"
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}

        <path
          d={dataPath}
          fill="rgba(59, 130, 246, 0.4)"
          stroke="#3b82f6"
          strokeWidth={2}
        />

        {statsArray.map((stat, i) => {
          const point = getPoint(i, stat);
          return (
            <circle
              key={`point-${i}`}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={2}
            />
          );
        })}

        {labelPositions.map((label, i) => (
          <g key={`label-${i}`}>
            <text
              x={label.x}
              y={label.text.includes('生命') || label.text.includes('特防') ? label.y + 14 : label.y}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={10}
              fontWeight="bold"
              className="drop-shadow"
            >
              {label.text}
            </text>
            {label.value > 0 && (
              <text
                x={label.x}
                y={(label.text.includes('生命') || label.text.includes('特防') ? label.y + 14 : label.y) + 11}
                textAnchor="middle"
                fill="#ffd700"
                fontSize={9}
                fontWeight="bold"
                className="drop-shadow"
              >
                {label.value}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default RadarChart;
