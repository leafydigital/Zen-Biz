import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Business, BusinessMember } from "@/types/database";

export const ACTIVE_BUSINESS_COOKIE = "zenbiz-active-business";

/**
 * Every business the signed-in user belongs to, with their role in each —
 * used by the business switcher dropdown and Settings' business list.
 * Memoized per request the same way getCurrentProfile() is.
 */
export const getUserBusinesses = cache(async (): Promise<(Business & { role: BusinessMember["role"] })[]> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error: membersError } = (await supabase
    .from("business_members" as never)
    .select("role, businesses(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })) as {
    data: { role: BusinessMember["role"]; businesses: Business }[] | null;
    error: { message: string } | null;
  };

  if (membersError) {
    console.error("Zen Biz: business_members lookup failed", membersError);
  }

  const memberships = (data ?? [])
    .filter((row) => row.businesses)
    .map((row) => ({ ...row.businesses, role: row.role }));

  // Self-heal: a business can exist (businesses.owner_id = this user)
  // with no matching business_members row — this happens for any
  // business created before the multi-business migration's backfill
  // ran, if that migration was written but never actually executed
  // against this database, or if a specific business's membership
  // insert failed silently at creation time while an earlier business's
  // succeeded. That last case is why this always runs — checking only
  // when memberships is completely empty would correctly repair a user
  // with zero working businesses, but silently miss a user who already
  // has one business working fine and a second one missing its link,
  // since the "any businesses at all?" check alone can't tell those
  // two situations apart.
  const { data: owned, error: ownedError } = (await supabase
    .from("businesses" as never)
    .select("*")
    .eq("owner_id", user.id)) as { data: Business[] | null; error: { message: string } | null };

  if (ownedError) {
    console.error("Zen Biz: owned-businesses self-heal lookup failed", ownedError);
  }

  const linkedIds = new Set(memberships.map((b) => b.id));
  const missingLinks = (owned ?? []).filter((b) => !linkedIds.has(b.id));

  if (missingLinks.length === 0) return memberships;

  // Repair the missing link for every owned business found, so this
  // only ever needs to self-heal once per business. Insert errors are
  // deliberately ignored here (e.g. a race with another request doing
  // the same repair) — the membership either already exists or will on
  // the next read either way, and failing this repair should never
  // block rendering the businesses the user already owns.
  await supabase
    .from("business_members" as never)
    .insert(missingLinks.map((b) => ({ business_id: b.id, user_id: user.id, role: "owner" })) as never);

  return [...memberships, ...missingLinks.map((b) => ({ ...b, role: "owner" as const }))];
});

/**
 * The business the current request should operate on. Reads the saved
 * choice from a cookie (so it survives navigation and a full page
 * refresh), but never trusts it blindly — if that business isn't one the
 * user actually belongs to anymore (removed, or a stale/tampered cookie),
 * this silently falls back to the user's first available business instead
 * of leaking access. Returns null only when the user belongs to no
 * business at all, which normal signup/onboarding should never leave
 * someone in.
 *
 * This is a read/display convenience, NOT the security boundary — RLS
 * (is_business_member() on every table) is what actually prevents access
 * to a business's data. Even if this function were somehow tricked into
 * returning the wrong id, every underlying query would still be rejected
 * by the database for a business_id the user isn't a member of.
 */
export const getActiveBusiness = cache(async (): Promise<Business | null> => {
  const businesses = await getUserBusinesses();
  if (businesses.length === 0) return null;

  const cookieStore = cookies();
  const savedId = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value;

  const saved = savedId ? businesses.find((b) => b.id === savedId) : undefined;
  return saved ?? businesses[0];
});

export interface BusinessMemberWithEmail {
  user_id: string;
  email: string;
  role: BusinessMember["role"];
  created_at: string;
}

/**
 * Members of a specific business with their email addresses, via the
 * list_business_members() database function — auth.users isn't
 * queryable directly from the client, so this is the narrow,
 * membership-checked way to show who's on a team. Not memoized with
 * cache() since it's keyed by businessId, which can vary per call within
 * the same request (e.g. viewing more than one business's team in one
 * page render is not a real scenario today, but this keeps the function
 * honest about what it actually does rather than silently caching the
 * wrong business's list).
 */
export async function getBusinessMembers(businessId: string): Promise<BusinessMemberWithEmail[]> {
  const supabase = createClient();
  const { data } = (await supabase.rpc("list_business_members" as never, {
    target_business_id: businessId,
  } as never)) as { data: BusinessMemberWithEmail[] | null };
  return data ?? [];
}
