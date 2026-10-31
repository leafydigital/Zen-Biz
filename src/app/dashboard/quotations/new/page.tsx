import { createClient } from "@/lib/supabase/server";
import { getNextDocumentNumber } from "@/lib/getNextDocumentNumber";
import { NewQuotationForm } from "@/components/NewQuotationForm";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness, mergeBusinessIntoProfile } from "@/lib/getActiveBusiness";
import type { Customer, Product } from "@/types/database";

export default async function NewQuotationPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const suggestedQuotationNumber = await getNextDocumentNumber(supabase as never, "quotation", businessId, activeBusiness?.format_settings);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">New quotation</h1>
        <p className="text-sm text-text-soft">Fill in the details and save.</p>
      </div>
      <NewQuotationForm
        ownerId={user!.id}
        businessId={businessId}
        profile={mergeBusinessIntoProfile(profile!, activeBusiness)}
        customers={customers ?? []}
        products={products ?? []}
        suggestedQuotationNumber={suggestedQuotationNumber}
      />
    </div>
  );
}
