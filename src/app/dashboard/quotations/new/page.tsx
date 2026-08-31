import { createClient } from "@/lib/supabase/server";
import { NewQuotationForm } from "@/components/NewQuotationForm";
import type { Customer, Product, Profile } from "@/types/database";

export default async function NewQuotationPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, customersResult, productsResult, { count }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).single(),
      supabase.from("customers").select("*").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("quotations").select("id", { count: "exact", head: true }),
    ]);

  const profile = profileResult.data as Profile | null;
  const customers = customersResult.data as Customer[] | null;
  const products = productsResult.data as Product[] | null;

  const suggestedQuotationNumber = `QUO-${String((count ?? 0) + 1).padStart(4, "0")}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">New quotation</h1>
        <p className="text-sm text-text-soft">Fill in the details and save.</p>
      </div>
      <NewQuotationForm
        ownerId={user!.id}
        profile={profile!}
        customers={customers ?? []}
        products={products ?? []}
        suggestedQuotationNumber={suggestedQuotationNumber}
      />
    </div>
  );
}
