'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { SensorReadingAgg } from '@/lib/types';
import { COLORS } from '@/lib/constants';

type SensorKey = 'vibration_mean' | 'discharge_temp_mean' | 'suction_pressure_mean' | 'discharge_pressure_mean';

interface TrendChartProps {
  data: SensorReadingAgg[];
  sensorKey: SensorKey;
  label: string;
  unit: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  color?: string;
}

function formatTime(timestamp: string) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function TrendChart({
  data,
  sensorKey,
  label,
  unit,
  warningThreshold,
  criticalThreshold,
  color = COLORS.primary,
}: TrendChartProps) {
  const chartData = data.map(d => ({
    time: d.agg_timestamp,
    value: d[sensorKey],
  }));

  return (
    <div className="bg-surface border border-border rounded-[--radius-card] p-6">
      <h3 className="text-sm font-semibold mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${sensorKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            stroke="var(--muted)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="var(--muted)"
            fontSize={11}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border-color)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(l: any) => formatTime(String(l))}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => [`${Number(v)?.toFixed(2)} ${unit}`, label]}
          />
          {warningThreshold != null && (
            <ReferenceLine
              y={warningThreshold}
              stroke={COLORS.warning}
              strokeDasharray="6 3"
              label={{ value: 'Warning', position: 'right', fill: COLORS.warning, fontSize: 10 }}
            />
          )}
          {criticalThreshold != null && (
            <ReferenceLine
              y={criticalThreshold}
              stroke={COLORS.critical}
              strokeDasharray="6 3"
              label={{ value: 'Critical', position: 'right', fill: COLORS.critical, fontSize: 10 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${sensorKey})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
