import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewPurchaseForm } from "@/components/NewPurchaseForm";
import { getPlanFeatures } from "@/lib/planFeatures";
import type { Product, Profile, Supplier } from "@/types/database";

export default async function NewPurchasePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, suppliersResult, productsResult, { count }] =
    await Promise.all([
      supabase.from("profiles" as never).select("*").eq("id", user!.id).single(),
      supabase.from("suppliers" as never).select("*").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("purchases" as never).select("id", { count: "exact", head: true }),
    ]);

  const profile = profileResult.data as Profile | null;

  if (!getPlanFeatures(profile?.plan ?? "starter").purchases) {
    redirect("/dashboard/purchases");
  }

  const suppliers = suppliersResult.data as Supplier[] | null;
  const products = productsResult.data as Product[] | null;

  const suggestedPurchaseNumber = `PUR-${String((count ?? 0) + 1).padStart(4, "0")}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">New purchase</h1>
        <p className="text-sm text-text-soft">Fill in the details and save.</p>
      </div>
      <NewPurchaseForm
        ownerId={user!.id}
        profile={profile!}
        suppliers={suppliers ?? []}
        products={products ?? []}
        suggestedPurchaseNumber={suggestedPurchaseNumber}
      />
    </div>
  );
}
