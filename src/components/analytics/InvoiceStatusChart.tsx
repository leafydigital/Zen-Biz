"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ChartCard } from "./ChartCard";
import { CHART_COLORS, formatInr } from "@/lib/chartColors";
import type { InvoiceStatusSlice } from "@/lib/analyticsData";

const STATUS_COLORS: Record<string, string> = {
  Paid: CHART_COLORS.success,
  Partial: CHART_COLORS.brassLight,
  Unpaid: CHART_COLORS.inkLight,
  Overdue: CHART_COLORS.alert,
};

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-paper-fold bg-white px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-text">{p.name}</p>
      <p style={{ color: p.payload.fill }}>
        {formatInr(p.value)} · {p.payload.count} invoice{p.payload.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function InvoiceStatusChart({ data }: { data: InvoiceStatusSlice[] }) {
  const isEmpty = data.length === 0;

  return (
    <ChartCard
      title="Invoice Status"
      subtitle="Paid, unpaid, partial, and overdue"
      isEmpty={isEmpty}
      emptyMessage="No invoices recorded yet for this period."
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
            {data.map((entry) => (
              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? CHART_COLORS.textSoft} />
            ))}
          </Pie>
          <Tooltip content={<TooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
