import { createClient } from "@/lib/supabase/server";
import { SuppliersList } from "@/components/SuppliersList";
import { LockedFeature } from "@/components/LockedFeature";
import { getPlanFeatures } from "@/lib/planFeatures";
import type { Profile, Supplier } from "@/types/database";

export default async function SuppliersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Pick<Profile, "plan"> | null };

  if (!getPlanFeatures(profile?.plan ?? "starter").purchases) {
    return (
      <LockedFeature
        title="Suppliers is a Professional plan feature"
        description="Keep a list of everyone you buy stock or goods from — available on the Professional plan and above."
        requiredPlan="professional"
      />
    );
  }

  const { data: suppliers } = (await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false })) as { data: Supplier[] | null };

  return <SuppliersList ownerId={user!.id} suppliers={suppliers ?? []} />;
}
