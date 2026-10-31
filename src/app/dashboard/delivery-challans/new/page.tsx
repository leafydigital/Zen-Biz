import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNextDocumentNumber } from "@/lib/getNextDocumentNumber";
import { NewChallanForm } from "@/components/NewChallanForm";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness, mergeBusinessIntoProfile } from "@/lib/getActiveBusiness";
import type { Customer, Product } from "@/types/database";

export default async function NewChallanPage() {
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
      supabase.from("delivery_challans" as never).select("id", { count: "exact", head: true }).eq("business_id", businessId),
    ]);

  if (!getPlanFeatures(profile?.plan ?? "starter").deliveryChallans) {
    redirect("/dashboard/delivery-challans");
  }

  const customers = customersResult.data as Customer[] | null;
  const products = productsResult.data as Product[] | null;

  const suggestedChallanNumber = await getNextDocumentNumber(supabase as never, "challan", businessId, activeBusiness?.format_settings);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">
          New delivery challan
        </h1>
        <p className="text-sm text-text-soft">Fill in the details and save.</p>
      </div>
      <NewChallanForm
        ownerId={user!.id}
        businessId={businessId}
        profile={mergeBusinessIntoProfile(profile!, activeBusiness)}
        customers={customers ?? []}
        products={products ?? []}
        suggestedChallanNumber={suggestedChallanNumber}
      />
    </div>
  );
}
