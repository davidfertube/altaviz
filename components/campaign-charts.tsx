"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyMetric } from "@/lib/data/types";

const AXIS = { fontSize: 10, fill: "#64748b" };
const GRID = "#1e293b";
const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

function shortDate(d: string) {
  return d.slice(5); // mm-dd
}

export function SpendLeadsChart({ daily }: { daily: DailyMetric[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} minTickGap={28} />
        <YAxis yAxisId="spend" tick={AXIS} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
        <YAxis yAxisId="leads" orientation="right" tick={AXIS} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) =>
            name === "spend"
              ? [`$${Number(value).toLocaleString()}`, "Spend"]
              : [Number(value).toLocaleString(), "Leads"]
          }
        />
        <Bar yAxisId="spend" dataKey="spend" fill="#0ea5e9" opacity={0.55} radius={[2, 2, 0, 0]} />
        <Line
          yAxisId="leads"
          type="monotone"
          dataKey="conversions"
          stroke="#34d399"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CpaChart({
  daily,
  payoutPerLead,
}: {
  daily: DailyMetric[];
  payoutPerLead: number;
}) {
  const rows = daily.map((m) => ({
    date: m.date,
    cpa: m.conversions > 0 ? +(m.spend / m.conversions).toFixed(2) : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} minTickGap={28} />
        <YAxis tick={AXIS} tickFormatter={(v) => `$${v}`} domain={[0, "auto"]} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`$${value}`, "CPA"]}
        />
        <ReferenceLine
          y={payoutPerLead}
          stroke="#f87171"
          strokeDasharray="4 4"
          label={{
            value: `payout $${payoutPerLead}`,
            fill: "#f87171",
            fontSize: 10,
            position: "insideTopRight",
          }}
        />
        <Line type="monotone" dataKey="cpa" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
