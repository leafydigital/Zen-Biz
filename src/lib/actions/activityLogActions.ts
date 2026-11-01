"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/getAuthUser";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { getMyAccess } from "@/lib/getMyAccess";

export interface ActivityLogEntry {
  id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_name: string | null;
  details: string | null;
  created_at: string;
}

const PAGE = 50;

/** Owner always; anyone else only if the owner ticked the matching Activity log permission. */
async function whoAmI() {
  const [user, business, access] = await Promise.all([getAuthUser(), getActiveBusiness(), getMyAccess()]);
  if (!user || !business?.id) return null;
  const isOwner = business.owner_id === user.id;
  return {
    businessId: business.id,
    isOwner,
    canView: isOwner || (!access.isFull && access.permissions.includes("activity_log")),
    canDelete: isOwner || (!access.isFull && access.permissions.includes("activity_log_delete")),
    retention: (business as { log_retention_days?: number | null }).log_retention_days ?? null,
  };
}

export async function loadActivityLogs(offset: number, search: string) {
  const me = await whoAmI();
  if (!me || !me.canView) return { error: "You don't have access to the activity log.", logs: [] as ActivityLogEntry[], hasMore: false };
  const admin = createAdminClient();

  if (me.retention) {
    await admin
      .from("activity_logs" as never)
      .delete()
      .eq("business_id", me.businessId)
      .lt("created_at", new Date(Date.now() - me.retention * 86_400_000).toISOString());
  }

  let q = admin
    .from("activity_logs" as never)
    .select("id, user_name, action, entity, entity_name, details, created_at")
    .eq("business_id", me.businessId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE);
  const term = search.trim().replace(/[%,()]/g, " ");
  if (term) {
    q = q.or(`user_name.ilike.%${term}%,entity.ilike.%${term}%,entity_name.ilike.%${term}%,details.ilike.%${term}%`);
  }
  const { data, error } = (await q) as { data: ActivityLogEntry[] | null; error: { message: string } | null };
  if (error) return { error: error.message, logs: [] as ActivityLogEntry[], hasMore: false };
  const rows = data ?? [];
  return { error: null, logs: rows.slice(0, PAGE), hasMore: rows.length > PAGE };
}

export async function deleteActivityLogs(input: { ids?: string[]; before?: string; all?: boolean }) {
  const me = await whoAmI();
  if (!me || !me.canDelete) return { error: "You don't have permission to delete log entries." };
  const admin = createAdminClient();
  let q = admin.from("activity_logs" as never).delete().eq("business_id", me.businessId);
  if (input.ids?.length) q = q.in("id", input.ids);
  else if (input.before) q = q.lt("created_at", new Date(`${input.before}T00:00:00`).toISOString());
  else if (!input.all) return { error: "Nothing to delete." };
  const { error } = await q;
  return { error: error?.message ?? null };
}

export async function setLogRetention(days: number | null) {
  const me = await whoAmI();
  if (!me || !me.isOwner) return { error: "Only the owner can change this." };
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) return { error: "Enter a number of days between 1 and 3650." };
  const admin = createAdminClient();
  const { error } = await admin.from("businesses" as never).update({ log_retention_days: days } as never).eq("id", me.businessId);
  if (error) return { error: error.message };
  if (days) {
    await admin
      .from("activity_logs" as never)
      .delete()
      .eq("business_id", me.businessId)
      .lt("created_at", new Date(Date.now() - days * 86_400_000).toISOString());
  }
  return { error: null };
}
