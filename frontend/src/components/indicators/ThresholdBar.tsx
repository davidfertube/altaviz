interface ThresholdBarProps {
  value: number | null;
  min: number;
  max: number;
  warningThreshold: number;
  criticalThreshold: number;
  unit?: string;
  inverted?: boolean;
}

export default function ThresholdBar({
  value,
  min,
  max,
  warningThreshold,
  criticalThreshold,
  unit = '',
  inverted = false,
}: ThresholdBarProps) {
  if (value == null) return <span className="text-xs text-muted-foreground">--</span>;

  const range = max - min;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const warnPct = ((warningThreshold - min) / range) * 100;
  const critPct = ((criticalThreshold - min) / range) * 100;

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (inverted) {
    if (value <= criticalThreshold) status = 'critical';
    else if (value <= warningThreshold) status = 'warning';
  } else {
    if (value >= criticalThreshold) status = 'critical';
    else if (value >= warningThreshold) status = 'warning';
  }

  const markerColor =
    status === 'critical' ? 'bg-critical' :
    status === 'warning' ? 'bg-warning' :
    'bg-healthy';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{value.toFixed(1)} {unit}</span>
        <span className={`font-medium ${
          status === 'critical' ? 'text-critical' :
          status === 'warning' ? 'text-warning' :
          'text-healthy'
        }`}>
          {status}
        </span>
      </div>
      <div className="relative h-2 bg-border rounded-full overflow-hidden">
        {/* Normal zone */}
        <div
          className="absolute h-full bg-healthy/30"
          style={{ left: 0, width: `${inverted ? critPct : warnPct}%` }}
        />
        {/* Warning zone */}
        <div
          className="absolute h-full bg-warning/30"
          style={inverted
            ? { left: 0, width: `${warnPct}%` }
            : { left: `${warnPct}%`, width: `${critPct - warnPct}%` }
          }
        />
        {/* Critical zone */}
        <div
          className="absolute h-full bg-critical/30"
          style={inverted
            ? { left: 0, width: `${critPct}%` }
            : { left: `${critPct}%`, right: 0 }
          }
        />
        {/* Value marker */}
        <div
          className={`absolute top-0 w-1 h-full ${markerColor} rounded-full`}
          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  );
}
