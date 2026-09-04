import { createClient } from "@/lib/supabase/server";
import { getLabels } from "@/lib/businessLabels";
import { getPlanFeatures } from "@/lib/planFeatures";
import { ProductsList } from "@/components/ProductsList";
import type { Product, Profile } from "@/types/database";

export default async function ProductsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles" as never)
    .select("business_type, plan")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Pick<Profile, "business_type" | "plan"> | null };

  const labels = getLabels(profile?.business_type);
  const plan = profile?.plan ?? "starter";

  const { data: products } = (await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })) as { data: Product[] | null };

  return (
    <ProductsList
      ownerId={user!.id}
      products={products ?? []}
      itemLabel={labels.itemSingular}
      itemLabelPlural={labels.itemPlural}
      defaultUnit={labels.unitDefault}
      unitOptions={labels.unitOptions}
      stockTrackingDefault={labels.stockTrackingDefault}
      stockHint={labels.stockHint}
      itemHint={labels.itemHint}
      plan={plan}
      productLimit={getPlanFeatures(plan).limits.products}
    />
  );
}
