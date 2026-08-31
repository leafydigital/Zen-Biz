import { createClient } from "@/lib/supabase/server";
import { getLabels } from "@/lib/businessLabels";
import { ProductsList } from "@/components/ProductsList";
import type { Product, Profile } from "@/types/database";

export default async function ProductsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("business_type")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Pick<Profile, "business_type"> | null };

  const labels = getLabels(profile?.business_type);

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
    />
  );
}
