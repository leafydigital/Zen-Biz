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

export default async function GstReportPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles" as never)
    .select("plan")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Pick<Profile, "plan"> | null };

  if (!getPlanFeatures(profile?.plan ?? "starter").gstReport) {
    return (
      <LockedFeature
        title="Monthly GST Report is a Business plan feature"
        description="See sales GST collected, purchase GST paid, and net GST payable, broken down by month — available on the Business plan."
        requiredPlan="business"
      />
    );
  }

  const [{ data: invoices }, { data: purchases }] = await Promise.all([
    supabase
      .from("invoices" as never)
      .select("invoice_date, gst_amount, subtotal")
      .neq("status", "cancelled"),
    supabase
      .from("purchases" as never)
      .select("purchase_date, gst_amount, subtotal")
      .neq("status", "cancelled"),
  ]);

  const months = new Map<
    string,
    { salesGst: number; salesTotal: number; purchaseGst: number; purchaseTotal: number }
  >();

  function ensureMonth(key: string) {
    if (!months.has(key)) {
      months.set(key, { salesGst: 0, salesTotal: 0, purchaseGst: 0, purchaseTotal: 0 });
    }
    return months.get(key)!;
  }

  for (const inv of (invoices ?? []) as any[]) {
    const bucket = ensureMonth(monthKey(inv.invoice_date));
    bucket.salesGst += Number(inv.gst_amount ?? 0);
    bucket.salesTotal += Number(inv.subtotal ?? 0);
  }
  for (const pur of (purchases ?? []) as any[]) {
    const bucket = ensureMonth(monthKey(pur.purchase_date));
    bucket.purchaseGst += Number(pur.gst_amount ?? 0);
    bucket.purchaseTotal += Number(pur.subtotal ?? 0);
  }

  const rows = Array.from(months.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, v]) => ({
      key,
      label: monthLabel(key),
      ...v,
      netGst: v.salesGst - v.purchaseGst,
    }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">
          Monthly GST report
        </h1>
        <p className="text-sm text-text-soft">
          Sales GST collected, purchase GST paid, and net GST payable — by month.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card p-6 shadow-card">
        <div className="overflow-x-auto rounded-xl border border-paper-fold">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-paper-fold bg-paper text-left text-xs font-semibold uppercase tracking-wide text-text-soft">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Sales (ex-GST)</th>
                <th className="px-4 py-3">Sales GST</th>
                <th className="px-4 py-3">Purchases (ex-GST)</th>
                <th className="px-4 py-3">Purchase GST</th>
                <th className="px-4 py-3">Net GST payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-fold">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-soft">
                    No invoices or purchases recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-4 py-3 font-medium text-text">{r.label}</td>
                    <td className="px-4 py-3 font-ledger tabular-nums text-text">
                      {formatCurrency(r.salesTotal)}
                    </td>
                    <td className="px-4 py-3 font-ledger tabular-nums text-text">
                      {formatCurrency(r.salesGst)}
                    </td>
                    <td className="px-4 py-3 font-ledger tabular-nums text-text">
                      {formatCurrency(r.purchaseTotal)}
                    </td>
                    <td className="px-4 py-3 font-ledger tabular-nums text-text">
                      {formatCurrency(r.purchaseGst)}
                    </td>
                    <td className="px-4 py-3 font-ledger font-semibold tabular-nums text-ink">
                      {formatCurrency(r.netGst)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-text-soft">
          Net GST payable = GST collected on sales − GST paid on purchases.
          A negative number means you have GST credit for that month.
        </p>
      </div>
    </div>
  );
}
