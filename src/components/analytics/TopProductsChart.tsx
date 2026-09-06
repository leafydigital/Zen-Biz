"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartCard } from "./ChartCard";
import { CHART_COLORS, formatInr, formatInrCompact } from "@/lib/chartColors";
import type { TopProductPoint } from "@/lib/analyticsData";

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-paper-fold bg-white px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-text">{p.payload.name}</p>
      <p style={{ color: CHART_COLORS.ink }}>{formatInr(p.value)}</p>
    </div>
  );
}

export function TopProductsChart({ data }: { data: TopProductPoint[] }) {
  const isEmpty = data.length === 0;
  // Taller for more items so horizontal bars stay legible rather than
  // cramming 10 thin bars into a fixed-height card.
  const height = Math.max(220, data.length * 34 + 40);

  return (
    <ChartCard
      title="Top Products"
      subtitle="By sales value in this period"
      isEmpty={isEmpty}
      emptyMessage="No item sales recorded yet for this period."
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.paperFold} horizontal={false} />
          <XAxis type="number" tickFormatter={formatInrCompact} tick={{ fontSize: 11, fill: CHART_COLORS.textSoft }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: CHART_COLORS.textSoft }}
            axisLine={false}
            tickLine={false}
            width={110}
            tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)}
          />
          <Tooltip content={<TooltipContent />} />
          <Bar dataKey="value" fill={CHART_COLORS.ink} radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
