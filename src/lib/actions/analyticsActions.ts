"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AnalyticsPreferences } from "@/types/database";

/**
 * Saves the signed-in user's Analytics section preferences (which charts
 * are visible, chart type per chart, selected date range). Scoped to the
 * user via RLS (profiles.id = auth.uid()) the same way every other
 * profile update in the app already works — no extra plan check needed
 * here since a Starter user can never reach this UI in the first place
 * (the whole Analytics section is gated before this action is ever
 * callable), but the underlying data read for the charts themselves is
 * still independently plan-gated server-side, not just hidden in the UI.
 */
export async function saveAnalyticsPreferences(preferences: AnalyticsPreferences) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles" as never)
    .update({ analytics_preferences: preferences } as never)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}
