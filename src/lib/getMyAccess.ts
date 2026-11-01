import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, type PermissionKey } from "@/lib/permissions";

import { getAuthUser } from "@/lib/getAuthUser";
export interface MyAccess {
  role: string;
  /** Always the full list for owner/admin. */
  permissions: PermissionKey[];
  isFull: boolean;
}

/** The signed-in user's role and ticked permissions in the active business. */
export const getMyAccess = cache(async (): Promise<MyAccess> => {
  const full: MyAccess = { role: "owner", permissions: ALL_PERMISSION_KEYS, isFull: true };
  const supabase = createClient();
  const user = await getAuthUser();
  const business = await getActiveBusiness();
  if (!user || !business || !business.id) return full;
  if (business.owner_id === user.id) return full;

  const { data: m } = (await supabase
    .from("business_members" as never)
    .select("role, role_id")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle()) as { data: { role: string; role_id: string | null } | null };

  if (!m) return full; // unknown state: never lock the account out of its own data
  if (m.role === "owner" || m.role === "admin") return { role: m.role, permissions: ALL_PERMISSION_KEYS, isFull: true };

  if (m.role_id) {
    const { data: r } = (await supabase
      .from("business_roles" as never)
      .select("permissions")
      .eq("id", m.role_id)
      .maybeSingle()) as { data: { permissions: string[] } | null };
    if (r) return { role: m.role, permissions: r.permissions as PermissionKey[], isFull: false };
  }
  return { role: m.role, permissions: DEFAULT_ROLE_PERMISSIONS[m.role] ?? [], isFull: false };
});
