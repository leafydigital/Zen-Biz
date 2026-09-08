/**
 * Next.js automatically renders this while the /login route segment's
 * server data is loading — no manual wiring needed. Full-screen since
 * this page (unlike dashboard pages) isn't nested inside any layout
 * that already provides surrounding chrome.
 */
export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper" role="status" aria-label="Loading">
      <svg className="h-9 w-9 animate-spin text-ink" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
