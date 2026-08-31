import { createClient } from "@/lib/supabase/server";
import { CustomersList } from "@/components/CustomersList";
import type { Customer } from "@/types/database";

export default async function CustomersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customers } = (await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })) as { data: Customer[] | null };

  return <CustomersList ownerId={user!.id} customers={customers ?? []} />;
}
