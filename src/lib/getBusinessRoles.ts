import { createClient } from "@/lib/supabase/server";

export interface BusinessRoleRow {
  id: string;
  owner_id: string;
  name: string;
  permissions: string[];
}

/** Roles are shared by all of one owner's businesses. */
export async function getBusinessRoles(ownerId: string): Promise<BusinessRoleRow[]> {
  if (!ownerId) return [];
  const supabase = createClient();
  const { data } = (await supabase
    .from("business_roles" as never)
    .select("id, owner_id, name, permissions")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })) as { data: BusinessRoleRow[] | null };
  return data ?? [];
}
