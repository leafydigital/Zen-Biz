import { createClient } from "@/lib/supabase/server";
import { SuppliersList } from "@/components/SuppliersList";
import { LockedFeature } from "@/components/LockedFeature";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import type { Supplier } from "@/types/database";

import { getAuthUser } from "@/lib/getAuthUser";
export default async function SuppliersPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const profile = await getCurrentProfile();

  if (!getPlanFeatures(profile?.plan ?? "starter").purchases) {
    return (
      <LockedFeature
        title="Suppliers is a Professional plan feature"
        description="Keep a list of everyone you buy stock or goods from — available on the Professional plan and above."
        requiredPlan="professional"
      />
    );
  }

  const activeBusiness = await getActiveBusiness();
  const businessId = activeBusiness?.id ?? "";

  const { data: suppliers } = (await supabase
    .from("suppliers" as never)
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })) as { data: Supplier[] | null };

  return <SuppliersList ownerId={user!.id} businessId={businessId} suppliers={suppliers ?? []} />;
}
