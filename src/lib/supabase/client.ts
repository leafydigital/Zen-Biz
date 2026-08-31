import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client.
 * Uses the public anon key — safe to expose. Real data protection comes from
 * Row Level Security (RLS) policies defined in supabase/schema.sql, not from
 * hiding this key.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
