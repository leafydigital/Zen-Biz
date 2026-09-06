"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartCard } from "./ChartCard";
import { CHART_COLORS, formatInr, formatInrCompact } from "@/lib/chartColors";
import type { SalesVsPurchasesPoint } from "@/lib/analyticsData";

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-paper-fold bg-white px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-semibold text-text">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatInr(p.value)}
        </p>
      ))}
    </div>
  );
}

export function SalesVsPurchasesChart({ data }: { data: SalesVsPurchasesPoint[] }) {
  const isEmpty = data.every((d) => d.sales === 0 && d.purchases === 0);

  return (
    <ChartCard
      title="Sales vs Purchases"
      subtitle="Monthly totals"
      isEmpty={isEmpty}
      emptyMessage="No invoices or purchases recorded yet for this period."
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.paperFold} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.textSoft }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatInrCompact} tick={{ fontSize: 11, fill: CHART_COLORS.textSoft }} axisLine={false} tickLine={false} width={56} />
          <Tooltip content={<TooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="sales" name="Sales" fill={CHART_COLORS.ink} radius={[4, 4, 0, 0]} />
          <Bar dataKey="purchases" name="Purchases" fill={CHART_COLORS.brass} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
