'use client';

import { COLORS } from '@/lib/constants';

interface GaugeChartProps {
  value: number | null;
  min: number;
  max: number;
  warningThreshold: number;
  criticalThreshold: number;
  label: string;
  unit: string;
  inverted?: boolean;
}

export default function GaugeChart({
  value,
  min,
  max,
  warningThreshold,
  criticalThreshold,
  label,
  unit,
  inverted = false,
}: GaugeChartProps) {
  const range = max - min;
  const normalizedValue = value != null ? Math.max(min, Math.min(max, value)) : min;
  const pct = ((normalizedValue - min) / range) * 100;

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (value != null) {
    if (inverted) {
      if (value <= criticalThreshold) status = 'critical';
      else if (value <= warningThreshold) status = 'warning';
    } else {
      if (value >= criticalThreshold) status = 'critical';
      else if (value >= warningThreshold) status = 'warning';
    }
  }

  const statusColor = status === 'critical' ? COLORS.critical
    : status === 'warning' ? COLORS.warning
    : COLORS.healthy;

  // SVG arc gauge (180 degrees)
  const cx = 80;
  const cy = 75;
  const r = 60;
  const startAngle = Math.PI;
  const endAngle = 0;
  const sweepAngle = startAngle - endAngle;
  const valueAngle = startAngle - (pct / 100) * sweepAngle;

  const arcPath = (startA: number, endA: number) => {
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy - r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy - r * Math.sin(endA);
    const largeArc = Math.abs(endA - startA) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const needleX = cx + (r - 8) * Math.cos(valueAngle);
  const needleY = cy - (r - 8) * Math.sin(valueAngle);

  return (
    <div className="bg-surface border border-border rounded-[--radius-card] p-4 flex flex-col items-center">
      <p className="text-xs text-muted-foreground mb-2 font-medium">{label}</p>
      <svg viewBox="0 0 160 95" className="w-full max-w-[180px]">
        {/* Background arc */}
        <path
          d={arcPath(startAngle, endAngle)}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {value != null && (
          <path
            d={arcPath(startAngle, valueAngle)}
            fill="none"
            stroke={statusColor}
            strokeWidth="10"
            strokeLinecap="round"
          />
        )}
        {/* Needle dot */}
        {value != null && (
          <circle cx={needleX} cy={needleY} r="4" fill={statusColor} />
        )}
        {/* Center value */}
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground" fontSize="18" fontWeight="700" fontFamily="var(--font-mono)">
          {value != null ? value.toFixed(1) : '--'}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
          {unit}
        </text>
      </svg>
      <span className={`text-xs font-medium capitalize mt-1 ${
        status === 'critical' ? 'text-critical' :
        status === 'warning' ? 'text-warning' :
        'text-healthy'
      }`}>
        {status}
      </span>
    </div>
  );
}
