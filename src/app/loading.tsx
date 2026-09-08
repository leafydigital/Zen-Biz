/**
 * Shown while the home page's auth check (and possible redirect to
 * /dashboard for a signed-in user) is in progress.
 */
export default function HomeLoading() {
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
