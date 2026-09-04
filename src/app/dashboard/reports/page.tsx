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
      .eq("record_type", "invoice")
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

      <div className="rounded-xl2 border border-paper-fold bg-paper-card shadow-card sm:p-2">
        <div className="hidden overflow-hidden rounded-xl sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-fold bg-paper text-left text-xs font-semibold uppercase tracking-wide text-text-soft">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Sales (ex-GST)</th>
                <th className="px-4 py-3 text-right">Sales GST</th>
                <th className="px-4 py-3 text-right">Purchases (ex-GST)</th>
                <th className="px-4 py-3 text-right">Purchase GST</th>
                <th className="px-4 py-3 text-right">Net GST payable</th>
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
                    <td className="px-4 py-3 text-right font-ledger tabular-nums text-text">
                      {formatCurrency(r.salesTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-ledger tabular-nums text-text">
                      {formatCurrency(r.salesGst)}
                    </td>
                    <td className="px-4 py-3 text-right font-ledger tabular-nums text-text">
                      {formatCurrency(r.purchaseTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-ledger tabular-nums text-text">
                      {formatCurrency(r.purchaseGst)}
                    </td>
                    <td className="px-4 py-3 text-right font-ledger font-semibold tabular-nums text-ink">
                      {formatCurrency(r.netGst)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: one card per month with labeled figures, instead of a
            6-column table squeezed into a phone-width scrollbar. */}
        <div className="sm:hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-soft">
              No invoices or purchases recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-paper-fold">
              {rows.map((r) => (
                <li key={r.key} className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text">{r.label}</p>
                    <p className="font-ledger text-sm font-semibold tabular-nums text-ink">
                      {formatCurrency(r.netGst)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <p className="text-text-soft">Sales (ex-GST)</p>
                      <p className="font-ledger font-semibold tabular-nums text-text">
                        {formatCurrency(r.salesTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-soft">Sales GST</p>
                      <p className="font-ledger font-semibold tabular-nums text-text">
                        {formatCurrency(r.salesGst)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-soft">Purchases (ex-GST)</p>
                      <p className="font-ledger font-semibold tabular-nums text-text">
                        {formatCurrency(r.purchaseTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-soft">Purchase GST</p>
                      <p className="font-ledger font-semibold tabular-nums text-text">
                        {formatCurrency(r.purchaseGst)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="p-4 pt-3 text-xs text-text-soft sm:px-2">
          Net GST payable = GST collected on sales − GST paid on purchases.
          A negative number means you have GST credit for that month.
        </p>
      </div>
    </div>
  );
}
