"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { CHART_COLORS, formatInr, formatInrCompact } from "@/lib/chartColors";
import type { ProfitLossPoint } from "@/lib/analyticsData";

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

export function ProfitLossChart({
  data,
  chartType,
}: {
  data: ProfitLossPoint[];
  chartType: "line" | "bar";
}) {
  const isEmpty = data.every((d) => d.revenue === 0 && d.expenses === 0);

  return (
    <ChartCard
      title="Profit & Loss"
      subtitle="Monthly revenue, expenses, and profit"
      isEmpty={isEmpty}
      emptyMessage="No paid invoices or purchases recorded yet for this period."
    >
      <ResponsiveContainer width="100%" height={240}>
        {chartType === "bar" ? (
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.paperFold} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.textSoft }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatInrCompact} tick={{ fontSize: 11, fill: CHART_COLORS.textSoft }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<TooltipContent />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.ink} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.brass} radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Profit" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.paperFold} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.textSoft }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatInrCompact} tick={{ fontSize: 11, fill: CHART_COLORS.textSoft }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<TooltipContent />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.ink} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke={CHART_COLORS.brass} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="profit" name="Profit" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartCard>
  );
}
