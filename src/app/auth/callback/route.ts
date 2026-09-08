import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Google (or email confirmation links) and
// exchanges the auth code for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // The code was invalid, expired, or the exchange otherwise failed —
      // silently redirecting to /dashboard anyway (the previous behavior)
      // would send someone with no real session there, where they'd get
      // bounced to /onboarding looking like a fresh account with no
      // business, even if they already have one. Send them back to login
      // with a clear reason instead of into a confusing dead end.
      console.error("Zen Biz: auth code exchange failed", error);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Sign-in failed. Please try again.")}`
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
