"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { ChartCard } from "./ChartCard";
import { CHART_COLORS, formatInr, formatInrCompact } from "@/lib/chartColors";
import type { OutstandingCollectedData } from "@/lib/analyticsData";

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-paper-fold bg-white px-3 py-2 text-xs shadow-card">
      <p style={{ color: p.payload.fill }}>{p.payload.name}: {formatInr(p.value)}</p>
    </div>
  );
}

export function OutstandingCollectedChart({ data }: { data: OutstandingCollectedData }) {
  const chartData = [
    { name: "Collected", value: data.collected, fill: CHART_COLORS.success },
    { name: "Outstanding", value: data.outstanding, fill: CHART_COLORS.alert },
  ];
  const isEmpty = data.collected === 0 && data.outstanding === 0;

  return (
    <ChartCard
      title="Outstanding / Collected"
      subtitle="Across invoices in this period"
      isEmpty={isEmpty}
      emptyMessage="No invoices recorded yet for this period."
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.paperFold} horizontal={false} />
          <XAxis type="number" tickFormatter={formatInrCompact} tick={{ fontSize: 11, fill: CHART_COLORS.textSoft }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: CHART_COLORS.textSoft }} axisLine={false} tickLine={false} width={90} />
          <Tooltip content={<TooltipContent />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={36}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
