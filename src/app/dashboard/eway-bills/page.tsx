import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getPlanFeatures } from "@/lib/planFeatures";
import { EwayBillCenter } from "@/components/EwayBillCenter";
import type { Invoice } from "@/types/database";

export default async function EwayBillsPage() {
  const supabase = createClient();
  const [business, profile] = await Promise.all([getActiveBusiness(), getCurrentProfile()]);

  const { data } = (await supabase
    .from("invoices" as never)
    .select("*, customers(*)")
    .eq("business_id", business?.id ?? "")
    .eq("record_type", "invoice")
    .order("invoice_date", { ascending: false })
    .limit(300)) as { data: (Invoice & { customers: any })[] | null };

  return (
    <EwayBillCenter
      invoices={(data ?? []).map(({ customers, ...inv }) => ({ invoice: inv as Invoice, customer: customers ?? null }))}
      business={business}
      allowed={getPlanFeatures(profile?.plan ?? "starter").ewayBill}
    />
  );
}
