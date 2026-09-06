/**
 * Next.js automatically renders this while a dashboard route segment's
 * server data is loading — no manual wiring needed on individual pages.
 * Kept intentionally simple (a small centered spinner) so it never
 * flashes for long on fast navigations; Next.js only shows this once
 * the navigation has actually started, not for instant client-side
 * transitions.
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
      <svg
        className="h-8 w-8 animate-spin text-ink"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
