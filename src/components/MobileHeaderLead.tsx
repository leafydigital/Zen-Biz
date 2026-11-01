"use client";

import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

/**
 * Phone header, left side: a Back arrow on every page except the dashboard
 * home (the 3-line menu button sits to its left), then the logo.
 */
export function MobileHeaderLead() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/dashboard";

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  return (
    <div className="ml-11 flex shrink-0 items-center gap-2 md:hidden">
      {!isHome && (
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-8 items-center gap-0.5 rounded-lg bg-paper py-1 pl-1.5 pr-2.5 text-sm font-medium text-text active:bg-paper-fold"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          Back
        </button>
      )}
      <Logo className="shrink-0" />
    </div>
  );
}
