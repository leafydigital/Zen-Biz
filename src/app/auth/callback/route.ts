import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markLoginVerified } from "@/lib/otp";

// Handles the redirect back from Google (or email confirmation links) and
// exchanges the auth code for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  // Only ever accept a same-app relative path (starting with a single "/",
  // not "//" which browsers treat as protocol-relative to another host).
  // `origin` above is already correctly derived from the incoming
  // request's own host — this guards it from ever being overridden by an
  // absolute URL slipped into `next`, so the final redirect can never
  // point anywhere other than the exact host this request actually
  // arrived at (localhost stays on localhost, the live domain stays on
  // the live domain, with no way for a query-string value to redirect
  // to a third, different site).
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

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

  if (code) {
    // Opening the emailed link already proves the inbox is theirs — no extra login code needed.
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (user) markLoginVerified(user.id);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
