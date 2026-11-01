import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

import { getAuthUser } from "@/lib/getAuthUser";
/**
 * Fetches the signed-in owner's full profile row, memoized per request via
 * React's cache(). The dashboard layout and most dashboard pages each need
 * the profile (for plan checks, business name, language, etc.) — without
 * this, every one of those was issuing its own separate `profiles` query
 * for the exact same row on every single navigation. cache() means calling
 * this multiple times during the same server render only hits the database
 * once; every other call in that request reuses the first result.
 *
 * Does not change what's fetched or how it's used anywhere — same table,
 * same columns (`select("*")`), same auth check. Purely removes duplicate
 * round-trips.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) return null;

  const { data } = (await supabase
    .from("profiles" as never)
    .select("*")
    .eq("id", user.id)
    .maybeSingle()) as { data: Profile | null };

  return data;
});
