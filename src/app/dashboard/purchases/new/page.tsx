import { redirect } from "next/navigation";
import { CloseButton } from "@/components/CloseButton";
import { createClient } from "@/lib/supabase/server";
import { getNextDocumentNumber } from "@/lib/getNextDocumentNumber";
import { NewPurchaseForm } from "@/components/NewPurchaseForm";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness, mergeBusinessIntoProfile } from "@/lib/getActiveBusiness";
import type { Product, Supplier } from "@/types/database";

import { getAuthUser } from "@/lib/getAuthUser";
export default async function NewPurchasePage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const activeBusiness = await getActiveBusiness();
  const businessId = activeBusiness?.id ?? "";

  const [profile, suppliersResult, productsResult, { count }] =
    await Promise.all([
      getCurrentProfile(),
      supabase.from("suppliers" as never).select("*").eq("business_id", businessId).order("name"),
      supabase.from("products").select("*").eq("business_id", businessId).eq("is_active", true).order("name"),
      supabase.from("purchases" as never).select("id", { count: "exact", head: true }).eq("business_id", businessId),
    ]);

  if (!getPlanFeatures(profile?.plan ?? "starter").purchases) {
    redirect("/dashboard/purchases");
  }

  const suppliers = suppliersResult.data as Supplier[] | null;
  const products = productsResult.data as Product[] | null;

  const suggestedPurchaseNumber = await getNextDocumentNumber(supabase as never, "purchase", businessId, activeBusiness?.format_settings);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative pr-12">
        <CloseButton href="/dashboard/purchases" />
        <h1 className="font-display text-2xl font-semibold text-text">New purchase</h1>
        <p className="text-sm text-text-soft">Fill in the details and save.</p>
      </div>
      <NewPurchaseForm
        ownerId={user!.id}
        businessId={businessId}
        profile={mergeBusinessIntoProfile(profile!, activeBusiness)}
        suppliers={suppliers ?? []}
        products={products ?? []}
        suggestedPurchaseNumber={suggestedPurchaseNumber}
      />
    </div>
  );
}
