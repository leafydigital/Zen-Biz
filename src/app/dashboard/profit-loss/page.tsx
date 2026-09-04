import { createClient } from "@/lib/supabase/server";
import { LockedFeature } from "@/components/LockedFeature";
import { getPlanFeatures } from "@/lib/planFeatures";
import type { Profile } from "@/types/database";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default async function ProfitLossPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles" as never)
    .select("plan")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Pick<Profile, "plan"> | null };

  if (!getPlanFeatures(profile?.plan ?? "starter").profitAndLoss) {
    return (
      <LockedFeature
        title="Profit & Loss report is a Business plan feature"
        description="See sales, purchases, and gross profit side by side, broken down by month — available on the Business plan."
        requiredPlan="business"
      />
    );
  }

  const [{ data: invoices }, { data: purchases }] = await Promise.all([
    supabase
      .from("invoices" as never)
      .select("invoice_date, total")
      .eq("record_type", "invoice")
      .eq("status", "paid"),
    supabase.from("purchases" as never).select("purchase_date, total").eq("status", "paid"),
  ]);

  const months = new Map<string, { sales: number; purchases: number }>();

  function ensureMonth(key: string) {
    if (!months.has(key)) months.set(key, { sales: 0, purchases: 0 });
    return months.get(key)!;
  }

  for (const inv of (invoices ?? []) as any[]) {
    ensureMonth(monthKey(inv.invoice_date)).sales += Number(inv.total ?? 0);
  }
  for (const pur of (purchases ?? []) as any[]) {
    ensureMonth(monthKey(pur.purchase_date)).purchases += Number(pur.total ?? 0);
  }

  const rows = Array.from(months.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, v]) => ({
      key,
      label: monthLabel(key),
      sales: v.sales,
      purchases: v.purchases,
      grossProfit: v.sales - v.purchases,
    }));

  const totals = rows.reduce(
    (acc, r) => ({
      sales: acc.sales + r.sales,
      purchases: acc.purchases + r.purchases,
      grossProfit: acc.grossProfit + r.grossProfit,
    }),
    { sales: 0, purchases: 0, grossProfit: 0 }
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">
          Profit & Loss
        </h1>
        <p className="text-sm text-text-soft">
          Paid sales minus paid purchases, by month — a simple cash-basis view of your gross profit.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl2 border border-paper-fold bg-paper-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
            Total sales
          </p>
          <p className="mt-1.5 font-ledger text-xl font-semibold tabular-nums text-ink">
            {formatCurrency(totals.sales)}
          </p>
        </div>
        <div className="rounded-xl2 border border-paper-fold bg-paper-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
            Total purchases
          </p>
          <p className="mt-1.5 font-ledger text-xl font-semibold tabular-nums text-ink">
            {formatCurrency(totals.purchases)}
          </p>
        </div>
        <div className="rounded-xl2 border border-paper-fold bg-paper-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
            Gross profit
          </p>
          <p
            className={`mt-1.5 font-ledger text-xl font-semibold tabular-nums ${
              totals.grossProfit >= 0 ? "text-success" : "text-alert"
            }`}
          >
            {formatCurrency(totals.grossProfit)}
          </p>
        </div>
      </div>

      <div className="rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
        <div className="hidden overflow-hidden rounded-xl2 sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-fold bg-paper text-left text-xs font-semibold uppercase tracking-wide text-text-soft">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-right">Purchases</th>
                <th className="px-4 py-3 text-right">Gross profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-fold">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-text-soft">
                    No paid sales or purchases recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-4 py-3 font-medium text-text">{r.label}</td>
                    <td className="px-4 py-3 text-right font-ledger tabular-nums text-text">
                      {formatCurrency(r.sales)}
                    </td>
                    <td className="px-4 py-3 text-right font-ledger tabular-nums text-text">
                      {formatCurrency(r.purchases)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-ledger font-semibold tabular-nums ${
                        r.grossProfit >= 0 ? "text-success" : "text-alert"
                      }`}
                    >
                      {formatCurrency(r.grossProfit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: one card per month instead of a squeezed, horizontally
            scrolling table. */}
        <div className="sm:hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-soft">
              No paid sales or purchases recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-paper-fold">
              {rows.map((r) => (
                <li key={r.key} className="flex flex-col gap-2 p-4">
                  <p className="text-sm font-medium text-text">{r.label}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-text-soft">Sales</p>
                      <p className="font-ledger font-semibold tabular-nums text-text">
                        {formatCurrency(r.sales)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-soft">Purchases</p>
                      <p className="font-ledger font-semibold tabular-nums text-text">
                        {formatCurrency(r.purchases)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-soft">Gross profit</p>
                      <p
                        className={`font-ledger font-semibold tabular-nums ${
                          r.grossProfit >= 0 ? "text-success" : "text-alert"
                        }`}
                      >
                        {formatCurrency(r.grossProfit)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-text-soft">
        Gross profit = paid sales − paid purchases. This doesn't subtract
        other business expenses (rent, salaries, etc.), since Zen Biz
        doesn't track those yet.
      </p>
    </div>
  );
}
