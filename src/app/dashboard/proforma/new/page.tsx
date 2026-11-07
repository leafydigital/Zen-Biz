import { createClient } from "@/lib/supabase/server";
import { CloseButton } from "@/components/CloseButton";
import { getNextDocumentNumber } from "@/lib/getNextDocumentNumber";
import { NewQuotationForm } from "@/components/NewQuotationForm";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness, mergeBusinessIntoProfile } from "@/lib/getActiveBusiness";
import type { Customer, Product } from "@/types/database";

import { getAuthUser } from "@/lib/getAuthUser";
export default async function NewProformaPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const activeBusiness = await getActiveBusiness();
  const businessId = activeBusiness?.id ?? "";

  const [profile, customersResult, productsResult, { count }] =
    await Promise.all([
      getCurrentProfile(),
      supabase.from("customers" as never).select("*").eq("business_id", businessId).order("name"),
      supabase.from("products").select("*").eq("business_id", businessId).eq("is_active", true).order("name"),
      supabase.from("quotations" as never).select("id", { count: "exact", head: true }).eq("business_id", businessId),
    ]);

  const customers = customersResult.data as Customer[] | null;
  const products = productsResult.data as Product[] | null;

  const suggestedQuotationNumber = await getNextDocumentNumber(supabase as never, "proforma", businessId, activeBusiness?.format_settings);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative pr-12">
        <CloseButton href="/dashboard/proforma" />
        <h1 className="font-display text-2xl font-semibold text-text">New proforma invoice</h1>
        <p className="text-sm text-text-soft">A proforma invoice is an advance bill sent before delivery or payment. Fill in the details and save.</p>
      </div>
      <NewQuotationForm
        ownerId={user!.id}
        businessId={businessId}
        profile={mergeBusinessIntoProfile(profile!, activeBusiness)}
        customers={customers ?? []}
        products={products ?? []}
        suggestedQuotationNumber={suggestedQuotationNumber}
        kind="proforma"
      />
    </div>
  );
}
