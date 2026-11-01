import { createClient } from "@/lib/supabase/server";
import { getLabels } from "@/lib/businessLabels";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { ProductsList } from "@/components/ProductsList";
import type { Product } from "@/types/database";

import { getAuthUser } from "@/lib/getAuthUser";
export default async function ProductsPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const activeBusiness = await getActiveBusiness();
  const businessId = activeBusiness?.id ?? "";

  const [profile, { data: products }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: Product[] | null }>,
  ]);

  const labels = getLabels(activeBusiness?.business_type);
  const plan = profile?.plan ?? "starter";

  return (
    <ProductsList
      ownerId={user!.id}
      businessId={businessId}
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
