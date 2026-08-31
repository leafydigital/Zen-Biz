import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Admin client using the service role key — bypasses Row Level Security
 * entirely. Only ever used server-side, and only in places where there's no
 * signed-in user session to act as (like the Razorpay webhook, which is
 * called directly by Razorpay's servers, not by a logged-in browser).
 *
 * NEVER import this into a client component or expose SUPABASE_SERVICE_ROLE_KEY
 * with a NEXT_PUBLIC_ prefix — doing so would let anyone bypass every
 * privacy rule in the database.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
