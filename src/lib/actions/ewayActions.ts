"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/getAuthUser";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getPlanFeatures } from "@/lib/planFeatures";
import { encryptSecret } from "@/lib/emailCrypto";

const MIGRATION_HELP = "Run supabase/migration_51.sql in the Supabase SQL editor.";

/** Only the business owner or an admin may see or change the e-way bill login, and only on a plan that includes e-way bills. */
async function allowed(businessId: string): Promise<string | null> {
  const user = await getAuthUser();
  if (!user) return "Not signed in.";
  const profile = await getCurrentProfile();
  if (!getPlanFeatures(profile?.plan ?? "starter").ewayBill) return "E-way bill tools are on the Professional and Business plans.";
  const { data } = (await createAdminClient()
    .from("business_members" as never)
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle()) as { data: { role: string } | null };
  if (!data || !["owner", "admin"].includes(data.role)) return "Only the business owner or an admin can change this.";
  return null;
}

/** Whether a login is saved, and its username. The password is never sent back. */
export async function getEwayCredentialStatus(businessId: string): Promise<{ error: string | null; username: string | null }> {
  const denied = await allowed(businessId);
  if (denied) return { error: denied, username: null };
  const { data, error } = (await createAdminClient()
    .from("eway_credentials" as never)
    .select("api_username")
    .eq("business_id", businessId)
    .maybeSingle()) as { data: { api_username: string } | null; error: { message: string } | null };
  if (error) return { error: /eway_credentials/.test(error.message) ? MIGRATION_HELP : error.message, username: null };
  return { error: null, username: data?.api_username ?? null };
}

export async function saveEwayCredentials(businessId: string, username: string, password: string) {
  const denied = await allowed(businessId);
  if (denied) return { error: denied };
  const u = username.trim();
  if (u.length < 3 || u.length > 100) return { error: "Enter the e-way bill API username." };
  if (!password || password.length > 200) return { error: "Enter the e-way bill API password." };
  let enc: string;
  try {
    enc = encryptSecret(password);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const user = await getAuthUser();
  const { error } = await createAdminClient()
    .from("eway_credentials" as never)
    .upsert({ business_id: businessId, api_username: u, api_password_enc: enc, updated_by: user?.id ?? null, updated_at: new Date().toISOString() } as never);
  if (error) return { error: /eway_credentials/.test(error.message) ? MIGRATION_HELP : error.message };
  return { error: null };
}

export async function deleteEwayCredentials(businessId: string) {
  const denied = await allowed(businessId);
  if (denied) return { error: denied };
  const { error } = await createAdminClient().from("eway_credentials" as never).delete().eq("business_id", businessId);
  return { error: error?.message ?? null };
}
