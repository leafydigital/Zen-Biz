import { createClient } from "@/lib/supabase/server";
import { CustomersList } from "@/components/CustomersList";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import type { Customer } from "@/types/database";

import { getAuthUser } from "@/lib/getAuthUser";
export default async function CustomersPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const activeBusiness = await getActiveBusiness();
  const businessId = activeBusiness?.id ?? "";

  const [{ data: customers }, profile] = await Promise.all([
    supabase
      .from("customers" as never)
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: Customer[] | null }>,
    getCurrentProfile(),
  ]);

  const plan = profile?.plan ?? "starter";

  return (
    <CustomersList
      ownerId={user!.id}
      businessId={businessId}
      customers={customers ?? []}
      plan={plan}
      customerLimit={getPlanFeatures(plan).limits.customers}
    />
  );
}
