"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ChartCard } from "./ChartCard";
import { CHART_PALETTE, formatInr } from "@/lib/chartColors";
import type { ExpenseBreakdownSlice } from "@/lib/analyticsData";

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-paper-fold bg-white px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-text">{p.name}</p>
      <p style={{ color: p.payload.fill }}>
        {formatInr(p.value)} ({p.payload.percent}%)
      </p>
    </div>
  );
}

export function ExpenseBreakdownChart({ data }: { data: ExpenseBreakdownSlice[] }) {
  const isEmpty = data.length === 0;

  return (
    <ChartCard
      title="Expense Breakdown"
      subtitle="Purchases recorded in this period"
      isEmpty={isEmpty}
      emptyMessage="No purchases recorded yet for this period."
    >
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
