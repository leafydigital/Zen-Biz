"use client";

import { useRouter } from "next/navigation";

/** X at the top-right of a full page form: goes back, or to `href` when there is nothing to go back to. */
export function CloseButton({ href }: { href: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(href))}
      aria-label="Close"
      title="Close"
      className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-paper-fold bg-white text-text-soft transition hover:bg-paper hover:text-text"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
