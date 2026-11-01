"use client";

import { usePathname, useRouter } from "next/navigation";

/** Small "‹ Back" link at the top of the page content (phones only, not on the dashboard home). */
export function PageBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/dashboard") return null;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Back"
      className="mb-3 flex items-center gap-0.5 rounded-lg bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium text-text shadow-card active:bg-paper-fold md:hidden"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      Back
    </button>
  );
}
