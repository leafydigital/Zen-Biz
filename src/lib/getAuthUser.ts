import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user, checked with Supabase ONCE per page request.
 * Every helper and page used to call auth.getUser() itself — each one a
 * separate network round trip to Supabase — which made page changes slow.
 * cache() lets them all share the first answer.
 */
export const getAuthUser = cache(async () => {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user;
});
