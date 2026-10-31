import { createClient } from "@/lib/supabase/server";
import { LockedFeature } from "@/components/LockedFeature";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { ReportClient, type ReportEntry } from "@/components/ReportClient";

export default async function ProfitLossPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  if (!getPlanFeatures(profile?.plan ?? "starter").profitAndLoss) {
    return (
      <LockedFeature
        title="Profit & Loss report is a Business plan feature"
        description="See sales, purchases, and gross profit side by side, broken down by month — available on the Business plan."
        requiredPlan="business"
      />
    );
  }

  const activeBusiness = await getActiveBusiness();
  const businessId = activeBusiness?.id ?? "";

  const [{ data: invoices }, { data: purchases }] = await Promise.all([
    supabase
      .from("invoices" as never)
      .select("invoice_date, total")
      .eq("business_id", businessId)
      .eq("record_type", "invoice")
      .eq("status", "paid"),
    supabase
      .from("purchases" as never)
      .select("purchase_date, total")
      .eq("business_id", businessId)
      .eq("status", "paid"),
  ]);

  const entries: ReportEntry[] = [
    ...((invoices ?? []) as any[]).map((r) => ({
      date: String(r.invoice_date), side: "sale" as const, gst: 0, subtotal: 0, total: Number(r.total ?? 0),
    })),
    ...((purchases ?? []) as any[]).map((r) => ({
      date: String(r.purchase_date), side: "purchase" as const, gst: 0, subtotal: 0, total: Number(r.total ?? 0),
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Profit & Loss</h1>
        <p className="text-sm text-text-soft">
          Paid sales minus paid purchases — filter by date, then download or share.
        </p>
      </div>
      <ReportClient kind="pl" entries={entries} businessName={activeBusiness?.business_name ?? ""} businessId={businessId} />
    </div>
  );
}
