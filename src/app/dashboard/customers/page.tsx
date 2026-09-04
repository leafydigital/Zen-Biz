import { createClient } from "@/lib/supabase/server";
import { CustomersList } from "@/components/CustomersList";
import { getPlanFeatures } from "@/lib/planFeatures";
import type { Customer, Profile } from "@/types/database";

export default async function CustomersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: customers }, { data: profile }] = await Promise.all([
    supabase
      .from("customers" as never)
      .select("*")
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: Customer[] | null }>,
    supabase
      .from("profiles" as never)
      .select("plan")
      .eq("id", user!.id)
      .maybeSingle() as unknown as Promise<{ data: Pick<Profile, "plan"> | null }>,
  ]);

  const plan = profile?.plan ?? "starter";

  return (
    <CustomersList
      ownerId={user!.id}
      customers={customers ?? []}
      plan={plan}
      customerLimit={getPlanFeatures(plan).limits.customers}
    />
  );
}
