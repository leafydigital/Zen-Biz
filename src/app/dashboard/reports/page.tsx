import { createClient } from "@/lib/supabase/server";
import { LockedFeature } from "@/components/LockedFeature";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { ReportClient, type ReportEntry } from "@/components/ReportClient";

export default async function GstReportPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  if (!getPlanFeatures(profile?.plan ?? "starter").gstReport) {
    return (
      <LockedFeature
        title="Monthly GST Report is a Pro plan feature"
        description="See sales GST collected, purchase GST paid, and net GST payable, broken down by month — available on the Pro plan."
        requiredPlan="professional"
      />
    );
  }

  const activeBusiness = await getActiveBusiness();
  const businessId = activeBusiness?.id ?? "";

  const [{ data: invoices }, { data: purchases }] = await Promise.all([
    supabase
      .from("invoices" as never)
      .select("invoice_date, gst_amount, subtotal")
      .eq("business_id", businessId)
      .eq("record_type", "invoice")
      .neq("status", "cancelled"),
    supabase
      .from("purchases" as never)
      .select("purchase_date, gst_amount, subtotal")
      .eq("business_id", businessId)
      .neq("status", "cancelled"),
  ]);

  const entries: ReportEntry[] = [
    ...((invoices ?? []) as any[]).map((r) => ({
      date: String(r.invoice_date), side: "sale" as const,
      gst: Number(r.gst_amount ?? 0), subtotal: Number(r.subtotal ?? 0), total: 0,
    })),
    ...((purchases ?? []) as any[]).map((r) => ({
      date: String(r.purchase_date), side: "purchase" as const,
      gst: Number(r.gst_amount ?? 0), subtotal: Number(r.subtotal ?? 0), total: 0,
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Monthly GST report</h1>
        <p className="text-sm text-text-soft">
          Sales GST collected, purchase GST paid, and net GST payable — filter by date, then download or share.
        </p>
      </div>
      <ReportClient kind="gst" entries={entries} businessName={activeBusiness?.business_name ?? ""} businessId={businessId} />
    </div>
  );
}
