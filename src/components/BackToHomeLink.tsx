"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * A "back to home" link for pages that require an incomplete signup step
 * (like onboarding). Going straight to "/" while signed in but not fully
 * set up would otherwise bounce right back here, since the dashboard
 * requires onboarding to be finished — so this signs the person out first,
 * landing them on the real public homepage instead of a redirect loop.
 */
export function BackToHomeLink({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handleClick() {
    setLeaving(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={leaving}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-text-soft transition hover:text-ink disabled:opacity-60 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {leaving ? "Leaving…" : "Back to home"}
    </button>
  );
}
