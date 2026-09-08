/**
 * Shown while the /onboarding route segment's server data (profile and
 * business lookups) is loading — this page does real database work
 * before rendering, so this matters more here than on most pages.
 */
export default function OnboardingLoading() {
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
